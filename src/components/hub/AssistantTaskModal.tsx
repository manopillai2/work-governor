"use client";

// Result pop-up for one-click assistant actions in the New UI (prep
// email, open questions, evidence-gap analysis, checklist regeneration,
// evidence / testing data uploads). Instead of opening the assistant
// drawer, the action runs from here: "Working on it…" while the
// assistant runs, then the reply (email preview, questions table, ...)
// in this window, with the sensible next actions underneath and a box
// for a follow-up question.
//
// The turns still go through the shared assistant conversation, so
// they're in the drawer's history too; this window only shows the
// turns since it opened. It can't be closed while the assistant is
// still working, so a reply is never orphaned.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAppState } from "@/components/AppStateProvider";
import { ChatMessageList } from "@/components/ChatPanel";
import ReadinessView from "./ReadinessView";
import { isTopmostDialog } from "./controlViews";
import { I, Icon, T } from "./hubUi";

export type AssistantTaskKind =
  | "prepEmail"
  | "openQuestions"
  | "gapAnalysis"
  | "regenerateChecklist"
  | "regenerateAll"
  | "uploadEvidence"
  | "uploadData"
  | "readiness";

export type AssistantTask = {
  kind: AssistantTaskKind;
  applicationId: string;
  // Scopes the action to one control; omitted = the whole application.
  controlName?: string;
};

const LABEL: Record<AssistantTaskKind, string> = {
  prepEmail: "Prep email",
  openQuestions: "Open questions",
  gapAnalysis: "Evidence vs testing data gap",
  regenerateChecklist: "Regenerate checklist",
  regenerateAll: "Regenerate all checklists",
  uploadEvidence: "Upload evidence",
  uploadData: "Upload testing data",
  readiness: "Update readiness profile",
};

// Same prompts the classic UI's buttons send.
function promptFor(task: AssistantTask): string {
  const scope = task.controlName ? `, for control "${task.controlName}" only` : "";
  switch (task.kind) {
    case "prepEmail":
      return `Give me an email-ready version for ${task.applicationId}${scope}.`;
    case "openQuestions":
      return `Give me just the open questions from an email-ready version for ${task.applicationId}${scope}.`;
    case "gapAnalysis":
      return `Analyze the evidence vs testing data gap for ${task.applicationId}${task.controlName ? scope : ", across all controls"}.`;
    case "regenerateChecklist":
      return `Regenerate the contextual checklist for control "${task.controlName}" on application "${task.applicationId}".`;
    default:
      return "";
  }
}

// What's worth doing after each action.
const NEXT: Record<AssistantTaskKind, AssistantTaskKind[]> = {
  prepEmail: ["openQuestions", "gapAnalysis", "uploadEvidence", "uploadData"],
  openQuestions: ["prepEmail", "uploadEvidence", "uploadData", "gapAnalysis"],
  gapAnalysis: ["uploadEvidence", "uploadData", "openQuestions", "prepEmail"],
  regenerateChecklist: ["openQuestions", "prepEmail", "uploadEvidence"],
  regenerateAll: ["openQuestions", "prepEmail", "uploadEvidence"],
  uploadEvidence: ["readiness", "gapAnalysis", "openQuestions", "uploadData", "uploadEvidence"],
  uploadData: ["readiness", "gapAnalysis", "openQuestions", "uploadEvidence", "uploadData"],
  readiness: ["uploadData", "uploadEvidence", "openQuestions", "prepEmail"],
};

// The readiness profile is per control, so it's only offered when the
// window is scoped to one.
const nextFor = (task: AssistantTask) =>
  NEXT[task.kind].filter((k) => k !== "readiness" || Boolean(task.controlName));

export default function AssistantTaskModal({ initialTask, onClose }: { initialTask: AssistantTask; onClose: () => void }) {
  const {
    applications,
    messages,
    isProcessing,
    processingSummary,
    handleSend,
    canCancelAssistant,
    cancelAssistant,
    regenerateAllChecklistsHandler,
    openEvidenceModal,
    buildReadinessProfile,
  } = useAppState();

  const [task, setTask] = useState(initialTask);
  // Our own action is still running (covers the gaps between turns of a
  // multi-turn action like "regenerate all").
  const [running, setRunning] = useState(false);
  const [awaitingUpload, setAwaitingUpload] = useState(false);
  // Started while the assistant was busy with something else: run it
  // as soon as that finishes.
  const [queued, setQueued] = useState(false);
  const [input, setInput] = useState("");
  // Readiness builds don't go through the chat: show the profile here.
  const [readinessShown, setReadinessShown] = useState(false);
  const [readinessError, setReadinessError] = useState("");
  const [startIndex] = useState(messages.length);
  const sessionMessages = messages.length >= startIndex ? messages.slice(startIndex) : messages;

  const ref = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const app = applications.find((a) => a.id === task.applicationId);
  const taskControl = app?.controls.find((c) => c.name === task.controlName);
  const busy = running || isProcessing || awaitingUpload || queued;

  async function execute(next: AssistantTask) {
    setTask(next);
    if (next.kind === "uploadEvidence" || next.kind === "uploadData") {
      setAwaitingUpload(true);
      openEvidenceModal(next.kind === "uploadEvidence" ? "evidence" : "data", {
        applicationId: next.applicationId,
        controlName: next.controlName,
        onDone: () => setAwaitingUpload(false),
      });
      return;
    }
    setRunning(true);
    try {
      if (next.kind === "readiness") {
        setReadinessError("");
        const target = applications.find((a) => a.id === next.applicationId);
        const ctrl = target?.controls.find((c) => c.name === next.controlName);
        if (!target || !ctrl) {
          setReadinessError("Control not found.");
        } else {
          const result = await buildReadinessProfile(target.id, ctrl.id);
          if (result.ok) setReadinessShown(true);
          else setReadinessError(result.error);
        }
      } else if (next.kind === "regenerateAll") {
        const target = applications.find((a) => a.id === next.applicationId);
        if (target) await regenerateAllChecklistsHandler(target);
      } else {
        await handleSend(promptFor(next));
      }
    } finally {
      setRunning(false);
    }
  }

  function start(next: AssistantTask) {
    if (isProcessing) {
      setTask(next);
      setQueued(true);
    } else {
      void execute(next);
    }
  }

  // Kick off the action this window was opened for.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start(initialTask);
    // Runs once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run a queued action once the assistant is free.
  useEffect(() => {
    if (!queued || isProcessing) return;
    const t = setTimeout(() => {
      setQueued(false);
      void execute(task);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, isProcessing]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sessionMessages.length, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || busy) return;
      if (!isTopmostDialog(ref.current)) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function sendFollowUp() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setRunning(true);
    try {
      await handleSend(text);
    } finally {
      setRunning(false);
    }
  }

  const scopeLabel = task.controlName ? `${app?.name ?? task.applicationId} · ${task.controlName}` : app?.name ?? task.applicationId;
  const status = queued
    ? "Waiting for the assistant to finish another request…"
    : awaitingUpload
      ? "Choose the files in the upload window…"
      : null;

  return createPortal(
    <div className="fixed inset-0 z-[48] flex items-center justify-center bg-[rgba(15,30,45,0.45)] p-4" onClick={() => !busy && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-task-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(820px,90vh)] w-full max-w-[860px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ background: T.card, borderColor: T.border }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b px-5 py-3.5" style={{ borderColor: T.border }}>
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: T.tealSoft, color: T.teal }}>
            <Icon d={I.chat} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="assistant-task-title" className="text-[16px] font-semibold" style={{ color: T.text }}>
              {LABEL[task.kind]}
            </h2>
            <p className="truncate text-[12.5px]" style={{ color: T.muted }}>{scopeLabel}</p>
          </div>
          {busy ? (
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ background: T.orangeSoft, color: T.orange }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: T.orange }} /> Working on it
            </span>
          ) : null}
          {canCancelAssistant ? (
            <button
              type="button"
              onClick={cancelAssistant}
              title="Stop the assistant's request. Nothing is changed."
              className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12.5px] font-semibold"
              style={{ borderColor: "#f3b4bf", color: "#be123c", background: "#fff1f2" }}
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            title={busy ? "Please wait until the assistant finishes" : "Close (Esc)"}
            className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: T.border, color: T.body }}
          >
            Close <Icon d={I.close} size={13} />
          </button>
        </div>

        {/* Conversation */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {sessionMessages.length || isProcessing ? (
            <ChatMessageList messages={sessionMessages} pendingRequest={isProcessing ? processingSummary : undefined} messagesEndRef={endRef} />
          ) : null}
          {readinessShown && app && taskControl ? (
            <div className="px-4 pb-4">
              <ReadinessView application={app} control={taskControl} />
            </div>
          ) : null}
          {readinessError ? (
            <p className="px-5 py-2 text-[13px]" style={{ color: T.red }}>{readinessError}</p>
          ) : null}
          {running && task.kind === "readiness" ? (
            <p className="px-5 py-4 text-[13px]" style={{ color: T.muted }}>
              Working on it — reading the evidence and profiling the full testing data files…
            </p>
          ) : null}
          {status ? (
            <div className="px-5 py-4 text-[13px]" style={{ color: T.muted }}>
              {status}
            </div>
          ) : !busy && sessionMessages.length === 0 && !readinessShown && !readinessError ? (
            <div className="px-5 py-4 text-[13px]" style={{ color: T.muted }}>
              Nothing was run. Pick an action below.
            </div>
          ) : null}
        </div>

        {/* Next options + follow-up */}
        <div className="shrink-0 border-t px-5 py-3" style={{ borderColor: T.border, background: "#fafbfc" }}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: T.faint }}>
            Next
          </p>
          <div className="flex flex-wrap gap-2">
            {nextFor(task).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={busy || !app}
                onClick={() => start({ kind, applicationId: task.applicationId, controlName: task.controlName })}
                className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  kind.startsWith("upload")
                    ? { borderColor: T.border, color: T.body, background: "#fff" }
                    : { borderColor: T.teal, color: T.teal, background: T.tealSoft }
                }
              >
                {kind === task.kind && kind.startsWith("upload") ? `${LABEL[kind]} (more)` : LABEL[kind]}
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendFollowUp();
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendFollowUp();
                }
              }}
              disabled={busy}
              rows={2}
              placeholder="Ask a follow-up or ask for changes…"
              className="min-w-0 flex-1 resize-none rounded-lg border px-3 py-2 text-[13px] leading-5 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: T.border, color: T.text, background: "#fff" }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: T.teal }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
