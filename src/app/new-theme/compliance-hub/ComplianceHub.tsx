"use client";

// Read-only "Compliance Hub" restyle of Work Governor, fed by the real
// app state (useAppState -> /api/state). Nothing here writes back.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { useAppState } from "@/components/AppStateProvider";
import type {
  Application,
  ChecklistTask,
  ComplianceControl,
  Note,
} from "@/services/commandEngine";
import {
  T,
  I,
  Icon,
  Chip,
  SegBar,
  taskStats,
  taskParts,
  activeTasks,
  needsAttention,
  evidenceNotes,
  sourceFiles,
  clientCode,
  QA_TONE,
  CONTEXT_TONE,
  HubAppCard,
} from "@/components/hub/hubUi";

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[10px] border ${className}`} style={{ background: T.card, borderColor: T.border }}>
      {children}
    </section>
  );
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: T.divider }}>
      <h3 className="text-[15px] font-semibold" style={{ color: T.text }}>{children}</h3>
      {right}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === "" || value == null || (Array.isArray(value) && value.length === 0);
  return (
    <div>
      <div className="text-[11.5px] font-medium uppercase tracking-[0.06em]" style={{ color: T.faint }}>{label}</div>
      <div className="mt-1 text-[14px] leading-relaxed" style={{ color: empty ? T.faint : T.body }}>
        {empty ? "Not captured" : value}
      </div>
    </div>
  );
}

function Md({ children }: { children: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed" style={{ color: T.body }}>
      <ReactMarkdown
        components={{
          h1: (p) => <h4 className="mb-1.5 mt-4 text-[14px] font-semibold first:mt-0" style={{ color: T.text }} {...p} />,
          h2: (p) => <h4 className="mb-1.5 mt-4 text-[14px] font-semibold first:mt-0" style={{ color: T.text }} {...p} />,
          h3: (p) => <h5 className="mb-1 mt-3 text-[13.5px] font-semibold" style={{ color: T.text }} {...p} />,
          p: (p) => <p className="my-1.5" {...p} />,
          ul: (p) => <ul className="my-1.5 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="my-1.5 list-decimal space-y-1 pl-5" {...p} />,
          strong: (p) => <strong className="font-semibold" style={{ color: T.text }} {...p} />,
          code: (p) => <code className="rounded px-1 text-[12px]" style={{ background: "#eef1f4" }} {...p} />,
          a: (p) => <a style={{ color: T.teal }} className="underline" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

// ---------- dashboard ----------
function Kpis({ applications }: { applications: Application[] }) {
  const controls = applications.flatMap((a) => a.controls);
  const s = taskStats(controls);
  const notes = controls.flatMap(evidenceNotes);
  const files = sourceFiles(notes);
  const attention = controls.filter(needsAttention).length;
  const argosReady = controls.filter((c) => c.qaScore === "Argos Ready").length;
  const ctxComplete = applications.filter((a) => a.contextStatus === "Complete").length;

  const cell = "flex flex-col justify-center px-5 py-3";
  const big = "text-[28px] font-semibold leading-tight";
  const sub = "text-[12.5px]";
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border lg:grid-cols-[1fr_1fr_2fr_1fr_1fr]" style={{ background: T.card, borderColor: T.border }}>
      <div className={cell}>
        <span className="text-[13px]">Applications</span>
        <span className={big}>{applications.length}</span>
        <span className={sub} style={{ color: T.teal }}>{ctxComplete} with complete context ›</span>
      </div>
      <div className={`${cell} border-l`} style={{ borderColor: T.divider }}>
        <span className="text-[13px]">Controls</span>
        <span className={big} style={{ color: attention ? T.red : T.text }}>{controls.length}</span>
        <span className={sub} style={{ color: T.muted }}>{attention} attention · {argosReady} Argos ready</span>
      </div>
      <div className={`${cell} border-l`} style={{ borderColor: T.divider }}>
        <span className="text-[13px]">Checklist tasks</span>
        <div className="my-2 flex"><SegBar parts={taskParts(s)} height={7} /></div>
        <span className={sub} style={{ color: T.muted }}>
          <b style={{ color: T.green }}>{s.done} done</b> · <b style={{ color: T.blue }}>{s.evidenced} evidenced</b> · {s.open} open · {s.total} total
        </span>
      </div>
      <div className={`${cell} border-l`} style={{ borderColor: T.divider }}>
        <span className="text-[13px]">Evidence notes</span>
        <span className={big}>{notes.length}</span>
        <span className={sub} style={{ color: T.muted }}>from {files.length} source files</span>
      </div>
      <div className={`${cell} border-l`} style={{ borderColor: T.divider }}>
        <span className="text-[13px]">Open tasks</span>
        <span className={big}>{s.total - s.done}</span>
        <span className={sub} style={{ color: T.muted }}>{controls.flatMap(activeTasks).filter((t) => t.required && !t.completed).length} required</span>
      </div>
    </div>
  );
}

// ---------- detail view ----------
function NoteItem({ n, mono }: { n: Note; mono: string }) {
  return (
    <div className="mt-2 rounded-md border-l-[3px] py-1.5 pl-3 pr-2" style={{ borderColor: n.sourceKind === "data" ? T.teal : n.sourceKind === "evidence" ? T.blue : T.gray, background: "#f8fafb" }}>
      <div className="text-[13px] leading-relaxed" style={{ color: T.body, textDecoration: n.documentDeleted ? "line-through" : undefined }}>{n.text}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px]" style={{ color: T.faint }}>
        <span className="font-medium uppercase" style={{ color: n.sourceKind === "data" ? T.teal : T.muted }}>{n.sourceKind}</span>
        {n.sourceDocumentFilename && (
          <span className={`${mono} flex items-center gap-1`}><Icon d={I.file} size={12} />{n.sourceDocumentFilename}</span>
        )}
        {n.documentDeleted && <span style={{ color: T.red }}>document deleted</span>}
        <span>{new Date(n.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

function TaskRow({ t, mono }: { t: ChecklistTask; mono: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: T.divider, opacity: t.irrelevant ? 0.55 : 1 }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[#f7f9fb]">
        <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border" style={{ borderColor: t.completed ? T.green : T.gray, background: t.completed ? T.green : "#fff", color: "#fff" }}>
          {t.completed ? "✓" : ""}
        </span>
        <span className="min-w-0 flex-1 text-[14px] leading-snug" style={{ color: T.text, textDecoration: t.irrelevant ? "line-through" : undefined }}>
          {t.text}
          {t.irrelevant && t.irrelevantReason && <span className="mt-1 block text-[12px]" style={{ color: T.muted }}>Marked irrelevant: {t.irrelevantReason}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Chip>{t.category}</Chip>
          {t.required && <Chip fg={T.red} border={T.red}>Required</Chip>}
          <Chip fg={t.notes.length ? T.teal : T.faint} bg={t.notes.length ? T.tealSoft : "#f1f3f5"}>{t.notes.length} {t.notes.length === 1 ? "note" : "notes"}</Chip>
          <Icon d={I.chevron} size={14} color={T.faint} />
        </span>
      </button>
      {open && (
        <div className="px-5 pb-3 pl-[52px]">
          {t.notes.length ? t.notes.map((n) => <NoteItem key={n.id} n={n} mono={mono} />) : <div className="text-[13px]" style={{ color: T.faint }}>No notes on this task yet.</div>}
        </div>
      )}
    </div>
  );
}

function ControlDetail({ c, mono }: { c: ComplianceControl; mono: string }) {
  const s = taskStats([c]);
  const qa = QA_TONE[c.qaScore] ?? QA_TONE["Not Started"];
  const files = sourceFiles(evidenceNotes(c));
  const categories = [...new Set(c.nextTasks.map((t) => t.category))];

  return (
    <div className="space-y-5">
      <Card>
        <div className="p-5">
          <div>
            <div className="flex items-center gap-2">
              <Chip fg={T.teal} border={T.teal} mono={mono}>{clientCode(c)}</Chip>
              <Chip fg={T.teal} border={T.teal} mono={mono}>{c.framework}</Chip>
            </div>
            <h2 className="mt-2 text-[20px] font-semibold" style={{ color: T.text }}>{c.name}</h2>
            <p className="mt-1 text-[13px]" style={{ color: T.muted }}>{c.globalControlReference || "No global reference"}{c.clientContext ? ` · ${c.clientContext}` : ""}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip fg={qa.fg} bg={qa.bg}>QA: {c.qaScore}</Chip>
            <Chip>Stage: {c.stage}</Chip>
            <Chip fg={needsAttention(c) ? T.red : T.body}>Control: {c.controlStatus}</Chip>
            <Chip>Checklist: {c.checklistStatus}</Chip>
            <Chip fg={c.homeworkStatus === "Completed" ? T.green : T.orange}>Homework: {c.homeworkStatus}</Chip>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t px-5 py-3" style={{ borderColor: T.divider }}>
          <SegBar parts={taskParts(s)} height={6} />
          <span className="shrink-0 text-[12.5px]" style={{ color: T.muted }}>
            <b style={{ color: T.green }}>{s.done} done</b> · <b style={{ color: T.blue }}>{s.evidenced} evidenced</b> · {s.open} open
          </span>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle>Progress summary</SectionTitle>
          <div className="p-5"><Md>{c.progressSummary || "_No summary yet._"}</Md></div>
        </Card>
        <Card>
          <SectionTitle right={<Chip fg={qa.fg} bg={qa.bg}>{c.qaScore}</Chip>}>QA score rationale</SectionTitle>
          <div className="p-5"><Md>{c.qaScoreRationale || "_No rationale yet._"}</Md></div>
        </Card>
      </div>

      <Card>
        <SectionTitle right={<span className="text-[12.5px]" style={{ color: T.muted }}>{c.nextTasks.length} tasks · {categories.join(" · ")}</span>}>Checklist</SectionTitle>
        {c.nextTasks.length ? c.nextTasks.map((t) => <TaskRow key={t.id} t={t} mono={mono} />) : <div className="p-5 text-[13px]" style={{ color: T.faint }}>No checklist yet.</div>}
      </Card>

      <Card>
        <SectionTitle>Control definition</SectionTitle>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Control objective" value={c.controlObjective} />
          <Field label="Control risk" value={c.controlRisk} />
          <Field label="Applicability rationale" value={c.applicabilityRationale} />
          <Field label="Evidence strategy" value={c.evidenceStrategy} />
          <Field label="Argos objective" value={c.argosObjective} />
          <Field label="Global control reference" value={c.globalControlReference} />
        </div>
      </Card>

      <Card>
        <SectionTitle right={c.evidenceDataGapAnalysisStale ? <Chip fg={T.orange} bg={T.orangeSoft}>Stale</Chip> : <span className="text-[12.5px]" style={{ color: T.muted }}>{files.length} source files</span>}>
          Evidence vs data gap analysis
        </SectionTitle>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b px-5 py-3" style={{ borderColor: T.divider }}>
            {files.map((f) => <Chip key={f} mono={mono} fg={T.teal} bg={T.tealSoft}><Icon d={I.file} size={11} />{f}</Chip>)}
          </div>
        )}
        <div className="p-5"><Md>{c.evidenceDataGapAnalysis || "_No analysis yet._"}</Md></div>
      </Card>

      {c.notes.length > 0 && (
        <Card>
          <SectionTitle>Control notes</SectionTitle>
          <div className="px-5 pb-4">{c.notes.map((n) => <NoteItem key={n.id} n={n} mono={mono} />)}</div>
        </Card>
      )}

      <Card>
        <SectionTitle>Checklist change log</SectionTitle>
        {c.checklistChangeLog.length ? (
          c.checklistChangeLog.map((e) => (
            <div key={e.id} className="flex gap-3 border-b px-5 py-2.5 text-[13px] last:border-b-0" style={{ borderColor: T.divider }}>
              <Chip>{e.changeType}</Chip>
              <span className="flex-1" style={{ color: T.body }}>{e.taskText}<span className="block text-[12px]" style={{ color: T.muted }}>{e.reason}</span></span>
              <span className="text-[12px]" style={{ color: T.faint }}>{e.changedBy} · {new Date(e.timestamp).toLocaleDateString()}</span>
            </div>
          ))
        ) : (
          <div className="px-5 py-4 text-[13px]" style={{ color: T.faint }}>No checklist changes recorded.</div>
        )}
      </Card>
    </div>
  );
}

function AppDetail({ app, mono, controlId, setControlId }: { app: Application; mono: string; controlId: string | null; setControlId: (id: string) => void }) {
  const control = app.controls.find((c) => c.id === controlId) ?? app.controls[0];
  const ctx = CONTEXT_TONE[app.contextStatus] ?? CONTEXT_TONE.Missing;
  const list = (xs: string[]) => (xs.length ? <div className="flex flex-wrap gap-1.5">{xs.map((x) => <Chip key={x} fg={T.body}>{x}</Chip>)}</div> : "");

  return (
    <div className="grid gap-5 2xl:grid-cols-[380px_1fr] xl:grid-cols-[340px_1fr]">
      <div className="space-y-5">
        <Card>
          <SectionTitle right={<Chip fg={ctx.fg} bg={ctx.bg}>Context {app.contextStatus.toLowerCase()}</Chip>}>Application profile</SectionTitle>
          <div className="space-y-4 p-5">
            <Field label="Purpose" value={app.applicationPurpose} />
            <Field label="Business process" value={app.businessProcess} />
            <Field label="Application owner" value={app.applicationOwner} />
            <Field label="Technical owner" value={app.technicalOwner} />
            <Field label="Contacts" value={list(app.applicationContacts)} />
            <Field label="Identity types" value={list(app.identityTypes)} />
            <Field label="Integrations" value={list(app.integrations)} />
            <Field label="Hosting" value={app.hostingDetails.toLowerCase().includes(app.hosting.toLowerCase()) ? app.hostingDetails : [app.hosting, app.hostingDetails].filter(Boolean).join(" — ")} />
            <Field label="Data classification" value={app.dataClassification} />
            <Field label="Financial relevance" value={app.financialRelevance} />
          </div>
        </Card>

        <Card>
          <SectionTitle right={app.evidenceDataGapSummaryStale ? <Chip fg={T.orange} bg={T.orangeSoft}>Stale</Chip> : null}>Evidence gap summary</SectionTitle>
          <div className="p-5"><Md>{app.evidenceDataGapSummary || "_No summary yet._"}</Md></div>
        </Card>

        <Card>
          <SectionTitle right={<span className="text-[12.5px]" style={{ color: T.muted }}>{app.notes.length}</span>}>Application notes</SectionTitle>
          <div className="px-5 pb-4">
            {app.notes.length ? app.notes.map((n) => <NoteItem key={n.id} n={n} mono={mono} />) : <div className="pt-4 text-[13px]" style={{ color: T.faint }}>No application notes.</div>}
          </div>
        </Card>
      </div>

      <div className="min-w-0">
        {app.controls.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-6 border-b text-[14px]" style={{ borderColor: T.border }}>
            {app.controls.map((c) => (
              <button key={c.id} onClick={() => setControlId(c.id)} className="-mb-px border-b-2 pb-2" style={{ borderColor: c.id === control?.id ? T.teal : "transparent", fontWeight: c.id === control?.id ? 600 : 400, color: c.id === control?.id ? T.text : T.body }}>
                {c.name}
              </button>
            ))}
          </div>
        )}
        {control ? <ControlDetail c={control} mono={mono} /> : <Card><div className="p-8 text-center text-[14px]" style={{ color: T.faint }}>No controls on this application yet.</div></Card>}
      </div>
    </div>
  );
}

// ---------- assistant drawer ----------
function ChatDrawer({ onClose }: { onClose: () => void }) {
  const { messages } = useAppState();
  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ background: "rgba(20,30,40,0.25)" }} onClick={onClose}>
      <aside className="flex h-full w-full max-w-[520px] flex-col border-l" style={{ background: T.canvas, borderColor: T.border }} onClick={(e) => e.stopPropagation()}>
        <div className="flex h-[52px] items-center justify-between border-b bg-white px-5" style={{ borderColor: T.border }}>
          <span className="text-[15px] font-semibold">Assistant history <span style={{ color: T.faint }}>· {messages.length}</span></span>
          <button onClick={onClose} aria-label="Close"><Icon d={I.close} size={18} color={T.muted} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[92%] rounded-[10px] border px-4 py-2.5 ${m.role === "user" ? "ml-auto" : ""}`} style={m.role === "user" ? { background: T.tealSoft, borderColor: "#c7e4ea" } : { background: "#fff", borderColor: T.border }}>
              <Md>{m.content}</Md>
              {m.attachment && <div className="mt-1.5"><Chip fg={T.teal} bg={T.tealSoft}>{m.attachment.type} · {m.attachment.applicationName}</Chip></div>}
            </div>
          ))}
        </div>
        <div className="border-t bg-white px-5 py-3 text-[12.5px]" style={{ borderColor: T.border, color: T.muted }}>
          Read-only preview — use the main app to talk to the assistant.
        </div>
      </aside>
    </div>
  );
}

// ---------- shell ----------
const NAV = [
  { group: "Overview", items: [{ label: "Applications", icon: I.grid, href: null }] },
  { group: "Workspace", items: [{ label: "Open real app", icon: I.pulse, href: "/" }, { label: "Guide", icon: I.book, href: "/guide" }, { label: "Health", icon: I.bulb, href: "/health" }] },
  { group: "Design", items: [{ label: "All themes", icon: I.palette, href: "/new-theme" }] },
];

export default function ComplianceHub({ sansClass, monoClass }: { sansClass: string; monoClass: string }) {
  const { applications, messages, isLoaded, loadError, retryLoad } = useAppState();
  const [appId, setAppId] = useState<string | null>(null);
  const [controlId, setControlId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState("all");
  const [stage, setStage] = useState("all");
  const [tab, setTab] = useState<"all" | "attention">("all");
  const [chatOpen, setChatOpen] = useState(false);

  // Deep link: ?app=<id> opens that application's detail view.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("app");
    if (id) setAppId(id);
  }, []);

  const allControls = applications.flatMap((a) => a.controls);
  const frameworks = [...new Set(allControls.map((c) => c.framework))];
  const stages = [...new Set(allControls.map((c) => c.stage))];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (tab === "attention" && !a.controls.some(needsAttention)) return false;
      if (framework !== "all" && !a.controls.some((c) => c.framework === framework)) return false;
      if (stage !== "all" && !a.controls.some((c) => c.stage === stage)) return false;
      if (!q) return true;
      const hay = [a.name, a.applicationOwner, a.technicalOwner, a.businessProcess, ...a.applicationContacts, ...a.controls.flatMap((c) => [c.name, c.clientContext, c.globalControlReference])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [applications, query, framework, stage, tab]);

  const app = applications.find((a) => a.id === appId) ?? null;
  const open = (id: string, cid?: string) => {
    setAppId(id);
    setControlId(cid ?? null);
  };

  const select = (value: string, set: (v: string) => void, all: string, opts: string[]) => (
    <label className="relative flex h-9 items-center rounded-md border bg-white text-[13.5px]" style={{ borderColor: T.border }}>
      <select value={value} onChange={(e) => set(e.target.value)} className="h-full appearance-none bg-transparent pl-3 pr-9 outline-none" style={{ color: T.text }}>
        <option value="all">{all}</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="pointer-events-none absolute right-3"><Icon d={I.chevron} size={14} /></span>
    </label>
  );

  return (
    <div className={`${sansClass} flex h-screen w-screen overflow-hidden antialiased`} style={{ background: T.canvas, color: T.text }}>
      <aside className="hidden w-[230px] shrink-0 flex-col border-r md:flex" style={{ background: T.sidebar, borderColor: T.border }}>
        <div className="px-4 pb-5 pt-6">
          <div className="text-[22px] font-bold tracking-tight" style={{ color: "#16324a" }}>Work Governor</div>
          <div className="mt-0.5 text-[11.5px] font-medium uppercase tracking-[0.08em]" style={{ color: T.muted }}>Control Governor · CORE</div>
        </div>
        <nav className="flex-1 overflow-y-auto border-t px-2 pt-3" style={{ borderColor: T.border }}>
          {NAV.map((g) => (
            <div key={g.group} className="mb-4">
              <div className="px-2 pb-1.5 text-[12.5px]" style={{ color: T.muted }}>{g.group}</div>
              {g.items.map((item) => {
                const active = item.href === null;
                const inner = (
                  <>
                    <Icon d={item.icon} size={17} color={active ? T.text : T.muted} />
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="rounded-full px-1.5 text-[11px]" style={{ background: "#fff", color: T.muted }}>{applications.length}</span>}
                  </>
                );
                const cls = "mb-0.5 flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[14.5px] hover:bg-[#e4eaef]";
                return item.href ? (
                  <Link key={item.label} href={item.href} className={cls} style={{ color: T.body }}>{inner}</Link>
                ) : (
                  <button key={item.label} onClick={() => setAppId(null)} className={cls} style={{ background: T.tealActive, color: T.text, fontWeight: 500 }}>{inner}</button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t p-2" style={{ borderColor: T.border }}>
          <button onClick={() => setChatOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[13.5px] font-medium" style={{ background: T.tealSoft, color: T.teal }}>
            <Icon d={I.chat} size={15} /> Assistant history
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center gap-2 border-b bg-white px-5" style={{ borderColor: T.border }}>
          <span className="text-[13.5px]" style={{ color: T.faint }}>/</span>
          {app ? (
            <>
              <button onClick={() => setAppId(null)} className="text-[15px]" style={{ color: T.muted }}>Applications</button>
              <span className="text-[13.5px]" style={{ color: T.faint }}>/</span>
              <span className="truncate text-[16px] font-medium">{app.name}</span>
            </>
          ) : (
            <span className="text-[16px] font-medium">Applications</span>
          )}
          <div className="ml-auto flex items-center gap-4">
            <Link href="/guide" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium" style={{ background: T.tealSoft, color: T.teal }}>
              <Icon d={I.book} size={14} /> Guide
            </Link>
            <Icon d={I.bell} size={18} color={T.muted} />
            <span className="h-5 w-px" style={{ background: T.border }} />
            <span className="flex items-center gap-1.5 text-[13px]" style={{ color: T.muted }}>
              <span className="h-2 w-2 rounded-full" style={{ background: loadError ? T.red : isLoaded ? "#3fb37f" : T.gray }} />
              {loadError ? "Data error" : isLoaded ? "Live data" : "Loading"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
          {loadError ? (
            <Card><div className="flex items-center justify-between p-5 text-[14px]" style={{ color: T.red }}>Couldn’t load app data: {loadError}<button onClick={retryLoad} className="rounded-md border px-3 py-1.5" style={{ borderColor: T.teal, color: T.teal }}>Retry</button></div></Card>
          ) : !isLoaded ? (
            <div className="p-10 text-center text-[14px]" style={{ color: T.faint }}>Loading Work Governor data…</div>
          ) : app ? (
            <>
              <button onClick={() => setAppId(null)} className="mb-4 flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: T.teal }}>
                <Icon d={I.back} size={14} /> All applications
              </button>
              <AppDetail app={app} mono={monoClass} controlId={controlId} setControlId={setControlId} />
            </>
          ) : (
            <>
              <Kpis applications={applications} />

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <label className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-md border bg-white px-3 text-[13.5px]" style={{ borderColor: T.border }}>
                  <Icon d={I.search} size={15} color={T.faint} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applications, owners, contacts, controls…" className="h-full flex-1 bg-transparent outline-none" style={{ color: T.text, boxShadow: "none" }} />
                </label>
                {select(framework, setFramework, "All frameworks", frameworks)}
                {select(stage, setStage, "All stages", stages)}
              </div>

              <div className="mt-4 flex items-center gap-6 border-b text-[14px]" style={{ borderColor: T.border }}>
                {(["all", "attention"] as const).map((k) => (
                  <button key={k} onClick={() => setTab(k)} className="-mb-px border-b-2 pb-2" style={{ borderColor: tab === k ? T.teal : "transparent", fontWeight: tab === k ? 600 : 400, color: tab === k ? T.text : T.body }}>
                    {k === "all" ? "All Apps" : "Needs attention"}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-4 pb-2 text-[13px]" style={{ color: T.faint }}>
                  Showing {filtered.length} of {applications.length} applications
                  <span className="flex items-center gap-3" style={{ color: T.muted }}>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: T.green }} />done</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: T.blue }} />evidenced</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: T.gray }} />open</span>
                  </span>
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((a) => (
                  <HubAppCard key={a.id} app={a} mono={monoClass} onOpen={() => open(a.id)} onOpenControl={(cid) => open(a.id, cid)} />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="mt-10 text-center text-[14px]" style={{ color: T.faint }}>No applications match these filters.</div>
              )}
            </>
          )}
        </main>
      </div>

      <button onClick={() => setChatOpen(true)} className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-white shadow-lg" style={{ background: T.teal }}>
        <Icon d={I.chat} size={16} /> Assistant · {messages.length}
      </button>
      {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
    </div>
  );
}
