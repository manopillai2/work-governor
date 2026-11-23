"use client";

// Rule logic window for one application (opened from the "Rule logic"
// tile). Left: the application's controls with each rule's status.
// Middle: the selected control's rule -- status, readiness, what is
// still needed, the rule itself, version history, and the lifecycle
// actions (Build / Approve / Lock / Keep developing / Unlock). Right:
// the rule's own assistant, to ask about it or change it in place.
//
// Lifecycle and storage: services/ruleLogic.ts. Actions and automatic
// rebuilds: AppStateProvider (buildRuleLogic / askRuleLogic /
// setRuleStatus).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAppState } from "@/components/AppStateProvider";
import { isTopmostDialog } from "@/components/hub/controlViews";
import { I, Icon, T, clientCode } from "@/components/hub/hubUi";
import type { Application, ComplianceControl } from "@/services/commandEngine";
import {
  RULE_READINESS_LABEL,
  RULE_STATUS_LABEL,
  readRuleLogic,
  type RuleLogicState,
} from "@/services/ruleLogic";

const MD: Components = {
  h2: ({ children }) => <h3 className="mb-1 mt-4 text-[13.5px] font-semibold first:mt-0" style={{ color: T.text }}>{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-3 text-[13px] font-semibold" style={{ color: T.text }}>{children}</h4>,
  p: ({ children }) => <p className="my-1.5 leading-6">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  code: ({ children }) => <code className="rounded px-1 text-[12px]" style={{ background: T.canvas }}>{children}</code>,
  table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-[12.5px]">{children}</table></div>,
  th: ({ children }) => <th className="border px-2 py-1 text-left font-semibold" style={{ borderColor: T.border, background: T.canvas }}>{children}</th>,
  td: ({ children }) => <td className="border px-2 py-1 align-top" style={{ borderColor: T.border }}>{children}</td>,
};

const STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  none: { fg: T.muted, bg: "#eef1f4" },
  draft: { fg: T.blue, bg: "#e8f1fa" },
  approved: { fg: T.green, bg: T.greenSoft },
  locked: { fg: "#5b4b8a", bg: "#efeaf8" },
};

const READINESS_TONE: Record<string, string> = {
  not_ready: T.faint,
  partial: T.orange,
  ready: T.green,
};

const SUGGESTIONS = [
  "What is still needed to finish this rule?",
  "Explain this rule in plain language",
  "Which records would this rule flag today?",
];

function StatusPill({ state }: { state: RuleLogicState | null }) {
  const key = state && state.version > 0 ? state.status : "none";
  const tone = STATUS_TONE[key];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: tone.fg, background: tone.bg }}>
      {key === "locked" ? <Icon d={I.lock} size={11} /> : null}
      {key === "none" ? "Not built" : RULE_STATUS_LABEL[key as RuleLogicState["status"]]}
    </span>
  );
}

function Button({
  children,
  onClick,
  disabled,
  tone = "plain",
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "plain" | "primary" | "green" | "violet";
  title?: string;
}) {
  const style =
    tone === "primary"
      ? { background: T.teal, color: "#fff", borderColor: T.teal }
      : tone === "green"
        ? { background: T.green, color: "#fff", borderColor: T.green }
        : tone === "violet"
          ? { background: "#5b4b8a", color: "#fff", borderColor: "#5b4b8a" }
          : { background: "#fff", color: T.body, borderColor: T.border };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      style={style}
    >
      {children}
    </button>
  );
}

function when(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const BY_LABEL = { auto: "built from new data", assistant: "changed by the assistant", user: "built on request" } as const;

function RuleAssistant({
  application,
  control,
  state,
  busy,
}: {
  application: Application;
  control: ComplianceControl;
  state: RuleLogicState | null;
  busy: "build" | "chat" | undefined;
}) {
  const { askRuleLogic } = useAppState();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const chat = state?.chat ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setError("");
    setPending(message);
    const result = await askRuleLogic(application.id, control.id, message);
    setPending("");
    if (!result.ok) {
      setError(result.error);
      setInput(message);
    }
  }

  const settled = state?.status === "approved" || state?.status === "locked";

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-lg border" style={{ borderColor: T.border, background: T.canvas }}>
      <div className="border-b px-3 py-2" style={{ borderColor: T.divider }}>
        <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>Rule assistant</p>
        <p className="text-[11.5px]" style={{ color: T.muted }}>
          {settled
            ? `Ask about this ${state?.status} rule. To change it, click Keep developing${state?.status === "locked" ? " after unlocking" : ""}.`
            : "Ask about this rule, or tell it what to change. Changes save as a new version."}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[12.5px] leading-5">
        {chat.length === 0 && !pending ? (
          <div className="space-y-1.5">
            <p style={{ color: T.muted }}>Try:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" disabled={!!busy} onClick={() => void send(s)} className="block w-full rounded-md border bg-white px-2.5 py-1.5 text-left hover:bg-[#f7f9fb] disabled:opacity-40" style={{ borderColor: T.border, color: T.body }}>
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {chat.map((turn, i) => (
          <div
            key={`${turn.at}-${i}`}
            className={turn.role === "user" ? "ml-6 rounded-lg px-2.5 py-1.5 text-white" : "mr-4 rounded-lg border bg-white px-2.5 py-1.5"}
            style={turn.role === "user" ? { background: T.teal } : { borderColor: T.border, color: T.body }}
          >
            {turn.role === "user" ? (
              <p className="whitespace-pre-wrap">{turn.content}</p>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{turn.content}</ReactMarkdown>
            )}
          </div>
        ))}
        {pending ? (
          <>
            <div className="ml-6 rounded-lg px-2.5 py-1.5 text-white" style={{ background: T.teal }}>
              <p className="whitespace-pre-wrap">{pending}</p>
            </div>
            <p className="mr-4 flex items-center gap-1.5 text-[12px]" style={{ color: T.muted }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: T.orange }} /> Working on it…
            </p>
          </>
        ) : null}
        {error ? <p className="text-[12px]" style={{ color: T.red }}>{error}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        className="border-t p-2"
        style={{ borderColor: T.divider }}
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={3}
          disabled={!!busy}
          placeholder={busy === "build" ? "Wait for the rule to finish building…" : "e.g. Add a finding for accounts disabled more than 1 day late"}
          className="w-full resize-none rounded-md border bg-white px-2.5 py-2 text-[12.5px] outline-none disabled:opacity-50"
          style={{ borderColor: T.border, color: T.text }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: T.faint }}>Enter to send · Shift+Enter for a new line</span>
          <Button tone="primary" onClick={() => void send(input)} disabled={!!busy || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

function RuleDetail({ application, control }: { application: Application; control: ComplianceControl }) {
  const { ruleBusy, buildRuleLogic, setRuleStatus } = useAppState();
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const state = readRuleLogic(control.ruleLogic);
  const busy = ruleBusy[`${application.id}:${control.id}`];
  const built = !!state && state.version > 0;
  const spec = control.argosObjective.trim();

  async function build() {
    setError("");
    const result = await buildRuleLogic(application.id, control.id, "manual");
    if (!result.ok) setError(result.error);
  }

  const act = (action: Parameters<typeof setRuleStatus>[2]) => setRuleStatus(application.id, control.id, action);

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill state={state} />
          {built ? (
            <span className="text-[12px] font-medium" style={{ color: READINESS_TONE[state.readiness] }}>
              ● {RULE_READINESS_LABEL[state.readiness]}
            </span>
          ) : null}
          {built ? (
            <span className="text-[11.5px]" style={{ color: T.muted }}>
              v{state.version} · {BY_LABEL[state.updatedBy]} · {when(state.updatedAt)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {state?.status === "locked" ? (
            <Button onClick={() => act("unlock")} title="Return the rule to Developing so it can change again">Unlock</Button>
          ) : state?.status === "approved" ? (
            <>
              <Button tone="violet" onClick={() => act("lock")} title="Freeze the rule: no rebuilds, no edits"><Icon d={I.lock} size={13} /> Lock</Button>
              <Button onClick={() => act("develop")} title="Allow the rule to change again">Keep developing</Button>
            </>
          ) : (
            <>
              <Button tone="primary" onClick={() => void build()} disabled={!!busy}>
                {busy === "build" ? "Building…" : built ? "Rebuild from latest data" : "Build rule"}
              </Button>
              {built ? (
                <Button tone="green" onClick={() => act("approve")} disabled={!!busy || !spec} title="Accept this version. New data will be offered as an update instead of changing it.">
                  Approve
                </Button>
              ) : null}
              {built ? (
                <Button tone="violet" onClick={() => act("lock")} disabled={!!busy || !spec} title="Freeze the rule: no rebuilds, no edits"><Icon d={I.lock} size={13} /> Lock</Button>
              ) : null}
            </>
          )}
        </div>
        {error ? <p className="mt-2 text-[12px]" style={{ color: T.red }}>{error}</p> : null}

        {state?.pendingUpdate ? (
          <div className="mt-3 rounded-lg border px-3 py-2.5 text-[12.5px]" style={{ borderColor: "#f3c58f", background: T.orangeSoft }}>
            <p className="font-semibold" style={{ color: T.text }}>New data produced an updated rule</p>
            <p className="mt-0.5" style={{ color: T.body }}>{state.pendingUpdate.summary || "The rule was rebuilt from newer material."} ({RULE_READINESS_LABEL[state.pendingUpdate.readiness]})</p>
            <div className="mt-2 flex gap-2">
              <Button tone="primary" onClick={() => act("applyPending")}>Apply and keep developing</Button>
              <Button onClick={() => act("dismissPending")}>Dismiss</Button>
            </div>
          </div>
        ) : null}

        {state?.newDataSinceLock ? (
          <p className="mt-3 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "#efeaf8", color: "#5b4b8a" }}>
            New evidence or data arrived after this rule was locked. Unlock it to rebuild.
          </p>
        ) : null}

        {busy === "build" ? (
          <p className="mt-3 flex items-center gap-2 text-[12.5px]" style={{ color: T.muted }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: T.orange }} />
            Reading the evidence, testing data and readiness profile… this can take a minute.
          </p>
        ) : null}

        {built && state.stillNeeded.length > 0 && state.status === "draft" ? (
          <div className="mt-3 rounded-lg border px-3 py-2.5" style={{ borderColor: T.border }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.faint }}>Still needed to finish the rule</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px]" style={{ color: T.body }}>
              {state.stillNeeded.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: T.border, color: T.body }}>
          {spec ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{spec}</ReactMarkdown>
          ) : (
            <p style={{ color: T.faint }}>No rule yet. Click Build rule, or upload testing data and it will build automatically.</p>
          )}
          {!built && spec ? (
            <p className="mt-2 border-t pt-2 text-[11.5px]" style={{ borderColor: T.divider, color: T.muted }}>
              This is the starting outline written when the control was added. Build the rule to turn it into monitoring logic from the real data.
            </p>
          ) : null}
        </div>

        {built && state.history.length > 0 ? (
          <div className="mt-3">
            <button type="button" onClick={() => setShowHistory((v) => !v)} className="text-[12px] font-medium hover:underline" style={{ color: T.teal }}>
              {showHistory ? "Hide" : "Show"} version history ({state.history.length})
            </button>
            {showHistory ? (
              <ul className="mt-2 space-y-2">
                {[...state.history].reverse().map((v) => (
                  <li key={v.version} className="rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: T.border }}>
                    <p style={{ color: T.muted }}>
                      v{v.version} · {BY_LABEL[v.by]} · {when(v.at)}{v.summary ? ` · ${v.summary}` : ""}
                    </p>
                    <details className="mt-1">
                      <summary className="cursor-pointer" style={{ color: T.teal }}>View this version</summary>
                      <div className="mt-1 text-[12.5px]" style={{ color: T.body }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{v.spec}</ReactMarkdown>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <RuleAssistant application={application} control={control} state={state} busy={busy} />
    </div>
  );
}

export function ruleSummary(controls: ComplianceControl[]) {
  const counts = { built: 0, approved: 0, locked: 0, ready: 0 };
  for (const c of controls) {
    const s = readRuleLogic(c.ruleLogic);
    if (!s || s.version === 0) continue;
    counts.built += 1;
    if (s.status === "approved") counts.approved += 1;
    if (s.status === "locked") counts.locked += 1;
    if (s.readiness === "ready") counts.ready += 1;
  }
  return counts;
}

export default function RuleLogicPanel({ application, onClose }: { application: Application; onClose: () => void }) {
  const { ruleBusy } = useAppState();
  const ref = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState(application.controls[0]?.id ?? "");
  const selected = application.controls.find((c) => c.id === selectedId) ?? application.controls[0];
  const counts = ruleSummary(application.controls);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!isTopmostDialog(ref.current)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[44] flex items-start justify-center overflow-y-auto bg-[rgba(15,30,45,0.45)] p-4 sm:p-6" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Rule logic" onClick={(e) => e.stopPropagation()} className="w-full max-w-7xl rounded-xl border bg-white shadow-2xl" style={{ borderColor: T.border }}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: T.divider }}>
          <div className="min-w-0">
            <h4 className="text-[17px] font-semibold" style={{ color: T.text }}>Rule logic · {application.name}</h4>
            <p className="mt-0.5 text-[12.5px]" style={{ color: T.muted }}>
              How each control will be monitored automatically · {counts.built} of {application.controls.length} built · {counts.approved} approved · {counts.locked} locked
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close (Esc)" className="rounded-md p-1.5 hover:bg-[#eef1f4]" style={{ color: T.muted }}>
            <Icon d={I.close} size={16} />
          </button>
        </div>

        {application.controls.length === 0 ? (
          <p className="px-5 py-6 text-[13px]" style={{ color: T.faint }}>No controls have been added yet.</p>
        ) : (
          <div className="grid gap-4 px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <nav className="space-y-1">
              {application.controls.map((c) => {
                const s = readRuleLogic(c.ruleLogic);
                const isBusy = !!ruleBusy[`${application.id}:${c.id}`];
                const active = c.id === selected?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="block w-full rounded-lg border px-2.5 py-2 text-left"
                    style={{ borderColor: active ? T.teal : T.border, background: active ? T.tealSoft : "#fff" }}
                  >
                    <span className="flex items-center gap-1.5">
                      {clientCode(c) ? <span className="font-mono text-[11px] font-semibold" style={{ color: T.teal }}>{clientCode(c)}</span> : null}
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium" style={{ color: T.text }}>{c.name}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <StatusPill state={s} />
                      {isBusy ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: T.orange }} title="Working" />
                      ) : s && s.version > 0 ? (
                        <span className="text-[10.5px]" style={{ color: READINESS_TONE[s.readiness] }}>{RULE_READINESS_LABEL[s.readiness]}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </nav>
            {selected ? <RuleDetail key={selected.id} application={application} control={selected} /> : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
