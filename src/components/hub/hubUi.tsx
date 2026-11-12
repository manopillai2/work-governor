"use client";

// Shared building blocks for the "New UI" (Compliance Hub) look --
// used by the real app's hub shell, dashboard, application cards and
// controls matrix. Visual language follows the
// Untitled.png reference: cool gray canvas, teal accent, segmented
// status bars, dense rows, outlined pill actions.

import { useEffect, useState, type ReactNode } from "react";

import { splitApplicationName } from "@/services/applicationName";
import type {
  Application,
  ComplianceControl,
} from "@/services/commandEngine";

export const T = {
  canvas: "#f4f6f8",
  sidebar: "#eef2f5",
  card: "#ffffff",
  border: "#dfe4ea",
  divider: "#eceff3",
  text: "#1b2430",
  body: "#3c4652",
  muted: "#6b7684",
  faint: "#9aa3ae",
  teal: "#0f7d8c",
  tealSoft: "#e2f2f5",
  tealActive: "#d5e9f1",
  red: "#d42a3c",
  redSoft: "#fdeef0",
  green: "#0f8a5f",
  greenSoft: "#e6f5ee",
  gray: "#c5cbd3",
  orange: "#e5730f",
  orangeSoft: "#fdf1e6",
  blue: "#3b82c4",
  star: "#e8a33d",
};

export const I = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  apps: "M4 5h16v4H4zM4 11h16v4H4zM4 17h16v3H4z",
  play: "M7 4l13 8-13 8z",
  export: "M12 15V4M7 9l5-5 5 5M5 20h14",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  plus: "M12 5v14M5 12h14",
  collapse: "M11 17l-5-5 5-5M18 17l-5-5 5-5",
  expand: "M13 17l5-5-5-5M6 17l5-5-5-5",
  chat: "M4 5h16v11H8l-4 4z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.3-.8-2.2 0-.8.7-1.3 1.5-1.3H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11h.01M10 7h.01M15 7h.01",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  check: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM8 12l3 3 5-6",
  warn: "M12 3l10 18H2zM12 10v4M12 17h.01",
  file: "M7 3h7l5 5v13H7zM14 3v5h5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  chevron: "M6 9l6 6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  info: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 11v5M12 8h.01",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  swap: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  report: "M6 3h9l4 4v14H6zM9 13h6M9 17h6M9 9h2",
};

export function Icon({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d={d} />
    </svg>
  );
}

// ---------- derived metrics ----------
export {
  activeTasks,
  clientCode,
  controlTypeKey,
  evidenceNotes,
  needsAttention,
  sourceFiles,
  taskStats,
} from "@/services/controlMetrics";
import { activeTasks, clientCode, evidenceNotes, needsAttention, taskStats } from "@/services/controlMetrics";

export function taskParts(s: ReturnType<typeof taskStats>) {
  return [
    { n: s.open, color: T.gray },
    { n: s.evidenced, color: T.blue },
    { n: s.done, color: T.green },
  ];
}

export const CONTEXT_TONE: Record<string, { fg: string; bg: string }> = {
  Missing: { fg: T.red, bg: T.redSoft },
  Partial: { fg: T.orange, bg: T.orangeSoft },
  Complete: { fg: T.green, bg: T.greenSoft },
};

// ---------- primitives ----------
export function Chip({ children, fg = T.muted, bg = "#eef1f4", border, mono }: { children: ReactNode; fg?: string; bg?: string; border?: string; mono?: string }) {
  return (
    <span
      className={`${mono ?? ""} inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[1px] text-[10.5px] font-medium`}
      style={{ color: fg, background: border ? "#fff" : bg, border: border ? `1px solid ${border}` : undefined }}
    >
      {children}
    </span>
  );
}

export function SegBar({ parts, height = 5 }: { parts: { n: number; color: string }[]; height?: number }) {
  const any = parts.some((p) => p.n > 0);
  return (
    <div className="flex flex-1 gap-[2px]" style={{ height }}>
      {any ? (
        parts.map((p, i) => (p.n > 0 ? <div key={i} style={{ flex: p.n, background: p.color, borderRadius: 2 }} /> : null))
      ) : (
        <div style={{ flex: 1, background: T.divider, borderRadius: 2 }} />
      )}
    </div>
  );
}

// ---------- application tile ----------
// A control with nothing recorded yet -- no task done and no notes --
// is the equivalent of Argos's "not collecting" row: dashed pill, grey
// icons, no evidence icon.
const isNotStarted = (c: ComplianceControl) =>
  !activeTasks(c).some((t) => t.completed || t.notes.length > 0) && c.notes.length === 0;

function DashedCircle({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.gray} strokeWidth={1.8} strokeDasharray="3 3" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ControlRow({ c, mono, onClick }: { c: ComplianceControl; mono: string; onClick: () => void }) {
  const open = activeTasks(c).filter((t) => !t.completed).length;
  const hot = needsAttention(c);
  const idle = !hot && isNotStarted(c);
  const ev = evidenceNotes(c).length;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[29px] w-full items-center gap-2 border-b px-1.5 text-left text-[12px] last:border-b-0 hover:bg-[#f7f9fb]"
      style={{ borderColor: T.divider, background: hot ? T.redSoft : undefined }}
      title={`${c.controlStatus} · ${c.stage} · ${open} open task${open === 1 ? "" : "s"}`}
    >
      {idle ? (
        <span className="flex h-[16px] min-w-[26px] items-center justify-center rounded-full border border-dashed text-[10px]" style={{ borderColor: T.gray, color: T.muted }}>
          –
        </span>
      ) : (
        <span
          className="flex h-[16px] min-w-[26px] items-center justify-center rounded-full border px-1 text-[10px] font-semibold"
          style={hot ? { borderColor: T.red, color: T.red, background: "#fff" } : { borderColor: "transparent", color: T.text, background: "#eef1f4" }}
        >
          {open}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate" style={{ color: T.text }}>{c.name}</span>
      <span className={`${mono} shrink-0 text-[9.5px]`} style={{ color: T.muted }}>{clientCode(c)}</span>
      <span className="flex w-[52px] shrink-0 items-center justify-end gap-1.5">
        {idle ? (
          <>
            <span title={`Homework: ${c.homeworkStatus}`}><Icon d={I.lock} size={13} color={T.gray} /></span>
            <span title="Nothing recorded yet"><DashedCircle /></span>
            <span className="w-[13px]" />
          </>
        ) : (
          <>
            <span title={`Homework: ${c.homeworkStatus}`}><Icon d={I.lock} size={13} color={c.homeworkStatus === "Completed" ? T.green : T.orange} /></span>
            {hot ? (
              <span title="Needs attention"><Icon d={I.warn} size={13} color={T.orange} /></span>
            ) : (
              <span title={`Control: ${c.controlStatus}`}><Icon d={I.check} size={13} color={c.controlStatus === "Completed" ? T.green : T.gray} /></span>
            )}
            <span title={`${ev} evidence notes`}><Icon d={I.db} size={13} color={ev ? T.teal : T.gray} /></span>
          </>
        )}
      </span>
    </button>
  );
}

function InfoRow({ label, value, clamp }: { label: string; value: string; clamp?: boolean }) {
  return (
    <div className="grid grid-cols-[86px_1fr] gap-2 py-[3px]">
      <dt style={{ color: T.faint }}>{label}</dt>
      <dd className={`min-w-0 ${clamp ? "line-clamp-2" : "truncate"}`} style={{ color: value ? T.text : T.faint }} title={value || undefined}>
        {value || "Not captured"}
      </dd>
    </div>
  );
}

// Small at-a-glance popover behind the card's (i) button: who owns the
// application, what it is, where it runs, and a one-line work status.
// Empty fields are shown as "Not captured" rather than hidden, so gaps
// in the application context are visible at a glance.
function AppInfoPopover({ app, onOpenDetails }: { app: Application; onOpenDetails: () => void }) {
  // Position relative to the card (its <article> is position:relative),
  // spanning the card's width so it never spills past the card's left
  // edge; flips above the button when there isn't room below.
  const [pos, setPos] = useState<{ top?: number; bottom?: number } | null>(null);
  const open = pos !== null;
  const setOpen = (next: boolean) => {
    if (!next) setPos(null);
  };

  function toggle(button: HTMLButtonElement) {
    if (open) {
      setPos(null);
      return;
    }
    const card = button.closest("article");
    if (!card) return;
    const b = button.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const estimatedHeight = 330;
    const roomBelow = window.innerHeight - b.bottom;
    if (roomBelow < estimatedHeight && b.top > estimatedHeight) {
      setPos({ bottom: c.bottom - b.top + 6 });
    } else {
      setPos({ top: b.bottom - c.top + 6 });
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const s = taskStats(app.controls);
  const attention = app.controls.filter(needsAttention).length;
  const notes = app.controls.flatMap(evidenceNotes).length;
  const ctx = CONTEXT_TONE[app.contextStatus] ?? CONTEXT_TONE.Missing;
  const hosting = app.hostingDetails
    ? app.hostingDetails.toLowerCase().includes(app.hosting.toLowerCase())
      ? app.hostingDetails
      : `${app.hosting} — ${app.hostingDetails}`
    : app.hosting;

  const countLabel = (items: string[], singular: string) =>
    items.length ? `${items.length} ${singular}${items.length === 1 ? "" : "s"}` : "";

  return (
    <span>
      <button
        type="button"
        onClick={(e) => toggle(e.currentTarget)}
        aria-expanded={open}
        aria-label={`About ${app.name}`}
        title="Owner & context"
        className="flex h-[22px] w-[22px] items-center justify-center rounded-md hover:bg-[#eceff3]"
        style={{ color: open ? T.teal : T.muted }}
      >
        <Icon d={I.info} size={14} />
      </button>

      {open ? (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={`${app.name} owner and context`}
            className="absolute left-2 right-2 z-50 rounded-lg border bg-white p-3 text-left text-[11.5px] leading-snug shadow-[0_8px_24px_rgba(15,40,60,0.14)]"
            style={{ borderColor: T.border, top: pos?.top, bottom: pos?.bottom }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-[12.5px] font-semibold" style={{ color: T.text }}>{app.name}</span>
              <span className="shrink-0 rounded-full px-2 py-[1px] text-[10px] font-medium" style={{ color: ctx.fg, background: ctx.bg }}>
                Context {app.contextStatus.toLowerCase()}
              </span>
            </div>

            <dl>
              <InfoRow label="Owner" value={app.applicationOwner} />
              <InfoRow label="Tech owner" value={app.technicalOwner} />
              <InfoRow label="Purpose" value={app.applicationPurpose} clamp />
              <InfoRow label="Process" value={app.businessProcess} clamp />
              <InfoRow label="Hosting" value={hosting} />
              <InfoRow label="Data class." value={app.dataClassification} />
              <InfoRow label="Financial" value={app.financialRelevance} clamp />
              <div className="grid grid-cols-[86px_1fr] gap-2 py-[3px]">
                <dt style={{ color: T.faint }}>People & systems</dt>
                <dd className="min-w-0" style={{ color: T.text }}>
                  {[
                    countLabel(app.applicationContacts, "contact"),
                    countLabel(app.integrations, "integration"),
                    countLabel(app.identityTypes, "identity type"),
                  ]
                    .filter(Boolean)
                    .join(" · ") || <span style={{ color: T.faint }}>Not captured</span>}
                  {app.applicationContacts.length ? (
                    <span className="mt-0.5 block truncate" style={{ color: T.muted }} title={app.applicationContacts.join(", ")}>
                      {app.applicationContacts.join(", ")}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t pt-2" style={{ borderColor: T.divider, color: T.muted }}>
              <span><b style={{ color: T.text }}>{app.controls.length}</b> controls</span>
              <span><b style={{ color: T.text }}>{s.total - s.done}</b> open tasks</span>
              <span><b style={{ color: attention ? T.red : T.text }}>{attention}</b> attention</span>
              <span><b style={{ color: T.text }}>{notes}</b> evidence notes</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenDetails();
              }}
              className="mt-2 flex items-center gap-1 text-[11.5px] font-medium"
              style={{ color: T.teal }}
            >
              Full application view <Icon d={I.arrow} size={11} />
            </button>
          </div>
        </>
      ) : null}
    </span>
  );
}

export function HubAppCard({
  app,
  mono,
  onOpen,
  onOpenControl,
  favorite,
  onToggleFavorite,
}: {
  app: Application;
  mono: string;
  onOpen: () => void;
  onOpenControl?: (controlId: string) => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const { appName, context } = splitApplicationName(app.name);
  const s = taskStats(app.controls);
  const frameworks = [...new Set(app.controls.map((c) => c.framework))];
  const attention = app.controls.filter(needsAttention).length;
  const ctx = CONTEXT_TONE[app.contextStatus] ?? CONTEXT_TONE.Missing;
  const initials = appName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <article className="relative flex flex-col rounded-[9px] border px-3.5 pb-3 pt-3.5 transition hover:shadow-[0_4px_16px_rgba(15,40,60,0.08)]" style={{ background: T.card, borderColor: T.border }}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold leading-tight" style={{ color: T.text }}>{appName}</h3>
          <p className="mt-1 truncate text-[11px]" style={{ color: T.muted }}>
            {[context, app.hosting, app.dataClassification].filter(Boolean).join(" · ")}
            {" · "}
            <span style={{ color: ctx.fg }}>Context {app.contextStatus.toLowerCase()}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            <AppInfoPopover app={app} onOpenDetails={onOpen} />
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[9.5px] font-bold" style={{ background: "#eceff3", color: "#4a5563" }}>{initials}</span>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={!!favorite}
              title={favorite ? "Remove from favorites" : "Add to favorites"}
              className="rounded p-0.5 hover:bg-[#fdf6e9]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={favorite ? T.star : "none"} stroke={T.star} strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
                <path d={I.star} />
              </svg>
            </button>
          </div>
          {attention > 0 && <Chip fg={T.orange} border={T.orange}>↻ {attention} attention</Chip>}
        </div>
      </header>

      <div className="mt-2.5 flex items-center gap-2.5">
        <SegBar parts={taskParts(s)} height={4} />
        <span className="shrink-0 text-[11px]" style={{ color: T.muted }}>
          <b className="font-semibold" style={{ color: s.done ? T.green : T.text }}>{s.done} done</b> of {s.total} tasks
        </span>
      </div>

      <div className="mt-2 h-[146px] overflow-y-auto overscroll-contain pr-0.5">
        {app.controls.length ? (
          app.controls.map((c) => <ControlRow key={c.id} c={c} mono={mono} onClick={() => (onOpenControl ? onOpenControl(c.id) : onOpen())} />)
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-[13px]" style={{ borderColor: T.border, color: T.faint }}>
            No controls yet
          </div>
        )}
      </div>

      <footer className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: T.divider }}>
        <div className="flex flex-wrap gap-1.5">
          {frameworks.map((f) => (
            <Chip key={f} fg={T.teal} border={T.teal} mono={mono}>{f}</Chip>
          ))}
        </div>
        <button type="button" onClick={onOpen} className="flex items-center gap-1.5 rounded-md border px-3 py-[5px] text-[12px] font-medium transition hover:bg-[#e2f2f5]" style={{ borderColor: T.teal, color: T.teal }}>
          View details <Icon d={I.arrow} size={12} />
        </button>
      </footer>
    </article>
  );
}

export function TaskLegend() {
  return (
    <span className="flex items-center gap-3 text-[12px]" style={{ color: T.muted }}>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: T.green }} />done</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: T.blue }} />evidenced</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: T.gray }} />open</span>
    </span>
  );
}
