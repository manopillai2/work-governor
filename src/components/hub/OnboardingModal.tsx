"use client";

// Application onboarding pop-out, opened from the Applications "+ New"
// button. The user pastes whatever they have (application name,
// context, controls -- plain text straight out of a compliance tool is
// fine) and sends it to the assistant, which verifies it, asks any
// clarifying questions right here, and onboards it. Two modes: a new
// application, or new control(s) for an existing one.
//
// Plain text can't be trusted, so nothing is written straight from the
// assistant's reply: any data-changing command it returns is held and
// shown here as a final confirmation (application name, controls to be
// added, context), built from the exact command that would run. Only
// "Proceed" applies it; "Make changes" (or typing a correction) leaves
// everything untouched.
//
// It rides on the same shared assistant conversation as the drawer
// (handleSend / messages), but only shows the turns from this
// onboarding session. It can't be closed while the assistant is still
// answering, so a reply (or an admin/conflict confirmation) is never
// orphaned.

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAppState } from "@/components/AppStateProvider";
import type { ApplicationContextInput, Command } from "@/services/commandEngine";
import { ChatMessageList } from "@/components/ChatPanel";
import { I, Icon, T } from "./hubUi";

export type OnboardingMode = "new" | "existing";

function buildRequest(mode: OnboardingMode, applicationName: string, details: string): string {
  const intro =
    mode === "new"
      ? [
          "Onboard a NEW application from the details below (pasted as plain text, possibly from a compliance tool).",
          "Verify the data first: if the application name, its context or any control is missing, ambiguous or conflicting, ask me before creating anything.",
          "Once it's clear, create the application with its context and controls, and tell me anything you couldn't use.",
        ]
      : [
          `Add new control(s) to the EXISTING application "${applicationName}" from the details below (pasted as plain text, possibly from a compliance tool). Do not create a new application.`,
          "Verify the data first: if a control is missing key details, is ambiguous, or looks like a duplicate of one already on the application, ask me before adding it.",
          "If there are several controls, add them one at a time and tell me which ones are still to be added.",
        ];
  return `${intro.join(" ")}\n\n---\n${details.trim()}`;
}

const CONTEXT_LABELS: Record<keyof ApplicationContextInput, string> = {
  applicationPurpose: "Purpose",
  businessProcess: "Business process",
  applicationOwner: "Application owner",
  technicalOwner: "Technical owner",
  applicationContacts: "Contacts",
  integrations: "Integrations",
  identityTypes: "Identity types",
  hostingDetails: "Hosting details",
  dataClassification: "Data classification",
  financialRelevance: "Financial relevance",
};

function contextRows(context: ApplicationContextInput | undefined, hosting?: string): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (hosting?.trim()) rows.push(["Hosting", hosting.trim()]);
  for (const key of Object.keys(CONTEXT_LABELS) as Array<keyof ApplicationContextInput>) {
    const value = context?.[key];
    const text = Array.isArray(value) ? value.filter(Boolean).join(", ") : (value ?? "").trim();
    if (text) rows.push([CONTEXT_LABELS[key], text]);
  }
  return rows;
}

type ProposedControl = { name: string; framework: string; reference: string; clientCode: string; tasks: number };

// What a held command would do, in plain terms -- used for the card and
// (as text) for the chat note when the user asks for changes.
function describeCommand(command: Command): {
  heading: string;
  application: string;
  controls: ProposedControl[];
  context: Array<[string, string]>;
} {
  switch (command.action) {
    case "CREATE_APPLICATION":
      return {
        heading: "Create a new application",
        application: command.payload.application,
        controls: command.payload.controls.map((c) => ({
          name: c.name,
          framework: c.framework,
          reference: c.globalControlReference,
          clientCode: c.clientContext,
          tasks: c.tasks?.length ?? 0,
        })),
        context: contextRows(command.payload.context, command.payload.hosting),
      };
    case "ADD_CONTROL":
      return {
        heading: "Add a control to an existing application",
        application: command.payload.application,
        controls: [
          {
            name: command.payload.control,
            framework: command.payload.framework,
            reference: command.payload.globalControlReference ?? "",
            clientCode: command.payload.clientContext ?? "",
            tasks: command.payload.tasks?.length ?? 0,
          },
        ],
        context: command.payload.controlObjective?.trim() ? [["Control objective", command.payload.controlObjective.trim()]] : [],
      };
    case "UPDATE_APPLICATION_CONTEXT":
      return {
        heading: "Update the application context",
        application: command.payload.application,
        controls: [],
        context: contextRows(command.payload.context, command.payload.hosting),
      };
    default: {
      const payload = (command as { payload?: { application?: unknown } }).payload;
      return {
        heading: `Run "${command.action.toLowerCase().replace(/_/g, " ")}"`,
        application: typeof payload?.application === "string" ? payload.application : "",
        controls: [],
        context: [],
      };
    }
  }
}

function describeCommandText(command: Command): string {
  const d = describeCommand(command);
  const lines = [`**${d.heading}**${d.application ? ` — application: **${d.application}**` : ""}`];
  if (d.controls.length) {
    lines.push(`Controls to be added (${d.controls.length}):`);
    for (const c of d.controls) {
      lines.push(`- ${c.name} (${c.framework}${c.reference ? `, ${c.reference}` : ""}${c.clientCode ? `, ${c.clientCode}` : ""})`);
    }
  }
  for (const [label, value] of d.context) lines.push(`- ${label}: ${value}`);
  return lines.join("\n");
}

const PROCEED_WORDS = /^\s*(proceed|yes|confirm|go ahead|approve)\b[\s.!]*$/i;

type PendingConfirmation = {
  command: Command;
  resolve: (decision: { proceed: boolean; note: string }) => void;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-[12.5px]">
      <span className="w-[130px] shrink-0" style={{ color: T.muted }}>{label}</span>
      <span className="min-w-0 flex-1 break-words" style={{ color: T.text }}>{children}</span>
    </div>
  );
}

function ConfirmationCard({
  pending,
  expectedApplication,
  existingNames,
  onProceed,
  onChange,
}: {
  pending: PendingConfirmation;
  expectedApplication?: string;
  existingNames: string[];
  onProceed: () => void;
  onChange: () => void;
}) {
  const d = describeCommand(pending.command);
  const known = existingNames.some((n) => n.toLowerCase() === d.application.trim().toLowerCase());
  const warnings: string[] = [];
  if (pending.command.action === "CREATE_APPLICATION" && known) {
    warnings.push(`An application named "${d.application}" already exists.`);
  }
  if (pending.command.action !== "CREATE_APPLICATION" && d.application && !known) {
    warnings.push(`No existing application is named "${d.application}".`);
  }
  if (expectedApplication && d.application && d.application.trim().toLowerCase() !== expectedApplication.trim().toLowerCase()) {
    warnings.push(`You chose "${expectedApplication}", but this would change "${d.application}".`);
  }
  if (d.controls.some((c) => !c.reference)) warnings.push("Some controls have no global control reference.");

  return (
    <div role="alertdialog" aria-labelledby="onboarding-confirm-title" className="mr-8 rounded-xl border-2 p-4" style={{ borderColor: T.teal, background: "#fff" }}>
      <p id="onboarding-confirm-title" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.teal }}>
        Final confirmation · nothing has been changed yet
      </p>
      <p className="mt-1 text-[14px] font-semibold" style={{ color: T.text }}>{d.heading}</p>

      <div className="mt-3 space-y-1.5">
        <Field label="Application name">
          <b>{d.application || "—"}</b>
        </Field>
        {d.context.map(([label, value]) => (
          <Field key={label} label={label}>{value}</Field>
        ))}
      </div>

      {d.controls.length ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[12.5px] font-semibold" style={{ color: T.text }}>
            Controls to be added ({d.controls.length})
          </p>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: T.border }}>
            <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
              <thead style={{ background: "#f4f6f8", color: T.body }}>
                <tr>
                  <th className="px-2.5 py-1.5 font-semibold">#</th>
                  <th className="px-2.5 py-1.5 font-semibold">Control</th>
                  <th className="px-2.5 py-1.5 font-semibold">Framework</th>
                  <th className="px-2.5 py-1.5 font-semibold">Global reference</th>
                  <th className="px-2.5 py-1.5 font-semibold">Client code</th>
                  <th className="px-2.5 py-1.5 font-semibold">Tasks</th>
                </tr>
              </thead>
              <tbody style={{ color: T.text }}>
                {d.controls.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className="border-t" style={{ borderColor: T.divider }}>
                    <td className="px-2.5 py-1.5" style={{ color: T.faint }}>{i + 1}</td>
                    <td className="px-2.5 py-1.5 font-medium">{c.name}</td>
                    <td className="px-2.5 py-1.5">{c.framework}</td>
                    <td className="px-2.5 py-1.5">{c.reference || <span style={{ color: T.orange }}>none</span>}</td>
                    <td className="px-2.5 py-1.5">{c.clientCode || <span style={{ color: T.faint }}>—</span>}</td>
                    <td className="px-2.5 py-1.5">{c.tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {warnings.length ? (
        <ul className="mt-3 space-y-1 rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: "#f3d9bf", background: T.orangeSoft, color: "#7a4a1a" }}>
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5"><Icon d={I.warn} size={13} color={T.orange} /> {w}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[12px]" style={{ color: T.muted }}>
        Please check this against your source. Proceed only if it&apos;s correct — or tell me what to change and I&apos;ll show you an updated summary.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button type="button" onClick={onProceed} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white" style={{ background: T.teal }}>
          Proceed
        </button>
        <button type="button" onClick={onChange} className="rounded-lg border px-4 py-2 text-[13px] font-medium" style={{ borderColor: T.border, color: T.body, background: "#fff" }}>
          Make changes
        </button>
      </div>
    </div>
  );
}

export default function OnboardingModal({
  initialApplicationId,
  onClose,
}: {
  initialApplicationId?: string;
  onClose: () => void;
}) {
  const { applications, messages, isProcessing, processingSummary, handleSend, canCancelAssistant, cancelAssistant } = useAppState();

  const [mode, setMode] = useState<OnboardingMode>(initialApplicationId ? "existing" : "new");
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  // A correction typed while the confirmation is showing: the held
  // command is declined first, then this is sent once that turn ends.
  const queuedRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Only this session's turns are shown. If the history is cleared
  // while the pop-out is open, fall back to showing everything.
  const [startIndex] = useState(messages.length);
  const sessionMessages = messages.length >= startIndex ? messages.slice(startIndex) : messages;
  const started = sessionMessages.length > 0;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sessionMessages.length, isProcessing, pending]);

  useEffect(() => {
    const queued = queuedRef.current;
    if (queued !== null && !isProcessing) {
      queuedRef.current = null;
      void handleSend(queued, undefined, undefined, { confirmCommand });
    }
    // confirmCommand/handleSend are recreated every render; only the
    // turn ending should trigger the queued send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  const canClose = !isProcessing;
  const closeTitle = canClose
    ? "Close"
    : pending
      ? "Proceed or make changes first"
      : "Please wait until the assistant finishes its response";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && canClose) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canClose, onClose]);

  const targetApp = applications.find((a) => a.id === applicationId);
  const needsApp = mode === "existing" && !targetApp;
  // While the confirmation is showing, the box takes "proceed" or a
  // correction; otherwise it's locked until the assistant answers.
  const inputLocked = isProcessing && !pending;
  const canSend = !!input.trim() && !inputLocked && (started || !needsApp);

  function confirmCommand(command: Command) {
    return new Promise<{ proceed: boolean; note: string }>((resolve) => setPending({ command, resolve }));
  }

  function decide(proceed: boolean) {
    if (!pending) return;
    pending.resolve({
      proceed,
      note: proceed
        ? ""
        : `Not applied — you asked for changes, so nothing was modified. This is what was proposed:\n\n${describeCommandText(pending.command)}\n\nTell me what to correct and I'll show you an updated summary to confirm.`,
    });
    setPending(null);
    if (!proceed) inputRef.current?.focus();
  }

  async function send() {
    if (!canSend) return;
    const text = input;
    setInput("");
    if (pending) {
      if (PROCEED_WORDS.test(text)) {
        decide(true);
      } else {
        queuedRef.current = text;
        decide(false);
      }
      return;
    }
    // The first message carries the onboarding instructions; follow-ups
    // (answers to the assistant's questions) go as typed.
    await handleSend(started ? text : buildRequest(mode, targetApp?.name ?? "", text), undefined, undefined, { confirmCommand });
  }

  const modeButton = (value: OnboardingMode, label: string, hint: string) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        disabled={started}
        aria-pressed={active}
        className="flex-1 rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed"
        style={{
          borderColor: active ? T.teal : T.border,
          background: active ? T.tealSoft : T.card,
          opacity: started && !active ? 0.5 : 1,
        }}
      >
        <span className="block text-[13px] font-semibold" style={{ color: active ? T.teal : T.text }}>{label}</span>
        <span className="block text-[11.5px]" style={{ color: T.muted }}>{hint}</span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(15,30,45,0.45)" }}
      onClick={() => canClose && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="flex h-[min(860px,92vh)] w-full max-w-[780px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ background: T.card, borderColor: T.border }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b px-5 py-4" style={{ borderColor: T.border }}>
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: T.tealSoft, color: T.teal }}>
            <Icon d={I.apps} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="onboarding-title" className="text-[17px] font-semibold" style={{ color: T.text }}>
              Welcome to application onboarding
            </h2>
            <p className="mt-0.5 text-[12.5px]" style={{ color: T.muted }}>
              Onboard a new application, or add new controls to an existing one.
            </p>
          </div>
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
            disabled={!canClose}
            title={closeTitle}
            className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: T.border, color: T.body }}
          >
            {canClose ? "Close" : pending ? "Awaiting confirmation" : "Working…"} <Icon d={I.close} size={13} />
          </button>
        </div>

        {/* Mode + target */}
        <div className="shrink-0 space-y-2.5 border-b px-5 py-3" style={{ borderColor: T.divider, background: "#fafbfc" }}>
          <div className="flex flex-col gap-2 sm:flex-row">
            {modeButton("new", "New application", "Name, context and its controls")}
            {modeButton("existing", "Add controls to an existing application", "New control(s) for an app already here")}
          </div>
          {mode === "existing" ? (
            <label className="flex items-center gap-2 text-[12.5px]" style={{ color: T.body }}>
              <span className="shrink-0 font-medium">Application</span>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                disabled={started}
                className="h-[30px] min-w-0 flex-1 rounded-md border bg-white px-2 outline-none disabled:opacity-60"
                style={{ borderColor: T.border, color: T.text }}
              >
                <option value="">Select an application…</option>
                {[...applications]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.controls.length} control{a.controls.length === 1 ? "" : "s"})
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
        </div>

        {/* Conversation, or the how-to before the first send */}
        {started ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <ChatMessageList
              messages={sessionMessages}
              pendingRequest={isProcessing && !pending ? processingSummary : undefined}
              messagesEndRef={messagesEndRef}
            />
            {pending ? (
              <div className="px-4 pb-4">
                <ConfirmationCard
                  pending={pending}
                  expectedApplication={mode === "existing" ? targetApp?.name : undefined}
                  existingNames={applications.map((a) => a.name)}
                  onProceed={() => decide(true)}
                  onChange={() => decide(false)}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px] leading-6" style={{ color: T.body }}>
            <p className="font-semibold" style={{ color: T.text }}>How it works</p>
            <ol className="mt-1.5 list-decimal space-y-1.5 pl-5">
              {mode === "new" ? (
                <li>
                  Type in the details below: <b>application name</b>, <b>application context</b> (business process, owners, contacts,
                  hosting, ...) and its <b>controls</b> — or whatever details you have for the application.
                </li>
              ) : (
                <li>
                  Pick the application above, then type in the <b>new control(s)</b>: name, framework, objective, client control code
                  — whatever details you have.
                </li>
              )}
              <li>
                Or simply <b>copy and paste the details from your compliance tool</b>. Plain text is fine — no formatting needed.
              </li>
              <li>
                The assistant <b>verifies the data</b>. If it has any doubts or needs clarification, it will work with you right
                here in this window.
              </li>
              <li>
                Before anything is changed, you get a <b>final confirmation</b> showing the application name and the controls to be
                added. Nothing is saved until you click <b>Proceed</b>.
              </li>
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px]" style={{ borderColor: "#f3d9bf", background: T.orangeSoft, color: "#7a4a1a" }}>
              <Icon d={I.warn} size={15} color={T.orange} />
              <span>Please don&apos;t close this window until the assistant completes its response.</span>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          className="shrink-0 border-t px-5 py-3"
          style={{ borderColor: T.border }}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Pasted exports are multi-line, so Enter is a newline;
              // Ctrl/Cmd+Enter sends.
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void send();
              }
            }}
            ref={inputRef}
            disabled={inputLocked}
            autoFocus
            rows={started ? 3 : 9}
            placeholder={
              pending
                ? "Type \"proceed\" to confirm, or describe what to change…"
                : started
                ? "Answer the assistant's questions, or add more details…"
                : mode === "new"
                  ? "e.g. Application: …\nContext: business process, owners, hosting…\nControls: …\n\n…or paste the export from your compliance tool here."
                  : "e.g. Control: …, framework, objective, client control code…\n\n…or paste the control details from your compliance tool here."
            }
            className="w-full resize-y rounded-lg border px-3 py-2.5 font-mono text-[12.5px] leading-5 outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: T.border, color: T.text, background: "#fff" }}
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px]" style={{ color: T.faint }}>
            <span>
              {pending
                ? "Waiting for your confirmation"
                : needsApp && !started
                  ? "Select the application to add controls to."
                  : "Ctrl + Enter to send"}
              {input.length > 0 ? ` · ${input.length.toLocaleString()} characters` : ""}
            </span>
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: T.teal }}
            >
              {pending ? "Send" : isProcessing ? "Working…" : started ? "Send" : "Send to assistant for onboarding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
