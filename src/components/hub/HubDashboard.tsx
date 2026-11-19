"use client";

// New UI home ("/"): the executive overview, modelled on the CCM
// Executive Dashboard + SOX reconciliation references -- narrative,
// portfolio snapshot, overall progress, distributions, a control
// coverage heat map, attention list and recent activity. Every figure
// is derived from the loaded applications; nothing here is sample
// data. The per-application card grid lives on /applications.

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAppState } from "@/components/AppStateProvider";
import { useExecutiveSummaryPreview } from "@/components/ExecutiveSummaryPreview";
import type { ProgressTileKey } from "@/components/ProgressSummary";
import { buildControlDrillDownFilters } from "@/services/applicationFilters";
import { splitApplicationName } from "@/services/applicationName";
import { CLIENT_REFERENCE_TABLE } from "@/services/clientReference";
import { controlUploadState } from "@/services/uploads";
import { bucketOf, computeExecutiveMetrics, executiveNarrative, pct, plural, type NarrativeLine, type StatusBucket } from "@/services/executiveMetrics";
import type { Application, ComplianceControl } from "@/services/commandEngine";
import { I, Icon, T, clientCode, controlTypeKey, evidenceNotes, needsAttention, sourceFiles, taskStats } from "./hubUi";
import { useHubChat } from "./HubShell";

// ---------- control status buckets ----------
type Bucket = StatusBucket;

const BUCKETS: { key: Bucket; label: string; color: string }[] = [
  { key: "done", label: "Completed", color: T.green },
  { key: "progress", label: "In progress", color: T.blue },
  { key: "notStarted", label: "Not started", color: "#4b5563" },
  { key: "hold", label: "On hold", color: T.red },
];

const STAGES = ["Homework", "Discovery", "Evidence Collection", "Testing", "Review", "Completed"] as const;

type Cell = "done" | "progress" | "attention" | "notStarted";

function cellOf(controls: ComplianceControl[]): Cell {
  if (controls.some(needsAttention)) return "attention";
  if (controls.every((c) => c.controlStatus === "Completed")) return "done";
  if (controls.some((c) => bucketOf(c) !== "notStarted")) return "progress";
  return "notStarted";
}

const CELL_STYLE: Record<Cell, { bg: string; border: string; fg: string; label: string }> = {
  done: { bg: T.greenSoft, border: "#9fd6bd", fg: T.green, label: "Completed" },
  progress: { bg: "#e8f1fa", border: "#a9c9e8", fg: T.blue, label: "In progress" },
  attention: { bg: T.redSoft, border: "#f1b3bb", fg: T.red, label: "Needs attention" },
  notStarted: { bg: "#f1f3f6", border: T.border, fg: T.muted, label: "Not started" },
};


// ---------- layout primitives ----------
function Section({ title, hint, children, right }: { title: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-center gap-2 border-l-[3px] pl-2" style={{ borderColor: T.teal }}>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: T.text }}>{title}</h2>
        {hint ? <span className="text-[11px]" style={{ color: T.faint }}>— {hint}</span> : null}
        {right ? <span className="ml-auto">{right}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border p-4 ${className}`} style={{ background: T.card, borderColor: T.border }}>
      {children}
    </div>
  );
}

function StatTile({ value, label, sub, accent, onClick, title }: { value: ReactNode; label: string; sub: string; accent: string; onClick?: () => void; title?: string }) {
  const body = (
    <>
      <span className="block text-[28px] font-semibold leading-none" style={{ color: T.text }}>{value}</span>
      <span className="mt-2.5 block text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: T.body }}>{label}</span>
      <span className="mt-0.5 block text-[11px]" style={{ color: T.muted }}>{sub}</span>
    </>
  );
  const cls = "block h-full w-full rounded-[10px] border border-l-[3px] px-4 py-3.5 text-left";
  const style = { background: T.card, borderColor: T.border, borderLeftColor: accent };
  return onClick ? (
    <button type="button" onClick={onClick} title={title} className={`${cls} transition hover:shadow-[0_4px_16px_rgba(15,40,60,0.08)]`} style={style}>{body}</button>
  ) : (
    <div className={cls} style={style} title={title}>{body}</div>
  );
}

function Donut({ parts, total, label }: { parts: { n: number; color: string; label: string }[]; total: number; label: string }) {
  const r = 46;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="132" height="132" viewBox="0 0 120 120" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(", ")}>
      <circle cx="60" cy="60" r={r} fill="none" stroke={T.divider} strokeWidth="14" />
      {total > 0 &&
        parts.map((p) => {
          if (!p.n) return null;
          const len = (p.n / total) * C;
          // 2px surface gap between segments when there are several.
          const gap = parts.filter((x) => x.n).length > 1 ? 2 : 0;
          const el = (
            <circle
              key={p.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="14"
              strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            >
              <title>{`${p.label}: ${p.n} (${pct(p.n, total)}%)`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      <text x="60" y="60" textAnchor="middle" fontSize="22" fontWeight="600" fill={T.text}>{total}</text>
      <text x="60" y="76" textAnchor="middle" fontSize="8.5" letterSpacing="1" fill={T.muted}>{label}</text>
    </svg>
  );
}

function HBars({ rows, color }: { rows: { label: string; n: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[140px_1fr_28px] items-center gap-2 text-[12px]" title={`${r.label}: ${r.n}`}>
          <span className="truncate" style={{ color: T.body }}>{r.label}</span>
          <span className="h-[14px] rounded-[4px]" style={{ background: T.divider }}>
            {r.n > 0 ? <span className="block h-full rounded-[4px]" style={{ width: `${(r.n / max) * 100}%`, background: color }} /> : null}
          </span>
          <span className="text-right font-semibold" style={{ color: T.text }}>{r.n}</span>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ text, tone }: { text: string; tone: { fg: string; bg: string } }) {
  return <span className="whitespace-nowrap rounded-full px-2 py-[1px] text-[10.5px] font-medium" style={{ color: tone.fg, background: tone.bg }}>{text}</span>;
}

// ---------- dashboard ----------
export default function HubDashboard() {
  const { applications, setFilters, applyQuickFilter } = useAppState();
  const { openPreview, previewModal } = useExecutiveSummaryPreview();
  const { openOnboarding } = useHubChat();
  const router = useRouter();

  const m = useMemo(() => {
    const pairs = applications.flatMap((a) => a.controls.map((c) => ({ app: a, c })));
    const controls = pairs.map((p) => p.c);
    const tasks = taskStats(controls);
    const bucketCounts = Object.fromEntries(BUCKETS.map((b) => [b.key, controls.filter((c) => bucketOf(c) === b.key).length])) as Record<Bucket, number>;
    const attention = pairs.filter((p) => needsAttention(p.c));
    const uploads = controls.map(controlUploadState);
    const withEvidence = uploads.filter((u) => u.evidence.uploaded).length;
    const withTesting = uploads.filter((u) => u.testing.uploaded).length;
    const fullyUploaded = uploads.filter((u) => u.evidence.uploaded && u.testing.uploaded).length;
    const nothingUploaded = uploads.filter((u) => !u.evidence.uploaded && !u.testing.uploaded).length;
    const notes = controls.flatMap(evidenceNotes);
    const files = sourceFiles(notes);
    const noEvidence = controls.filter((c) => evidenceNotes(c).length === 0).length;
    const contextComplete = applications.filter((a) => a.contextStatus === "Complete").length;
    const frameworks = [...new Set(controls.map((c) => c.framework))];

    // Heat-map columns: fixed client reference order first, then any
    // other keys alphabetically.
    const keys = [...new Set(controls.map(controlTypeKey))];
    const refOrder = CLIENT_REFERENCE_TABLE.map((e) => e.code);
    const columns = [
      ...refOrder.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !refOrder.includes(k)).sort((a, b) => a.localeCompare(b)),
    ];
    const columnTitle = (k: string) => {
      const ref = CLIENT_REFERENCE_TABLE.find((e) => e.code === k);
      return ref ? `${k} · ${ref.title}` : k;
    };

    // Task completion per control code -- where progress is concentrated.
    const byCode = columns
      .map((k) => {
        const s = taskStats(controls.filter((c) => controlTypeKey(c) === k));
        return { k, pct: pct(s.done, s.total), total: s.total };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.pct - a.pct);

    // Activity feed: every timestamped note and checklist change.
    type Activity = { when: string; app: Application; c: ComplianceControl; kind: string; text: string };
    const activity: Activity[] = [];
    for (const { app, c } of pairs) {
      for (const n of [...c.notes, ...c.nextTasks.flatMap((t) => t.notes)]) {
        activity.push({ when: n.createdAt, app, c, kind: n.sourceKind === "manual" ? "Note" : n.sourceKind === "evidence" ? "Evidence" : "Testing data", text: n.text });
      }
      for (const e of c.checklistChangeLog) {
        const verb = e.changeType === "ADDED" ? "Task added" : e.changeType === "MARKED_IRRELEVANT" ? "Task marked N/A" : "Task restored";
        activity.push({ when: e.timestamp, app, c, kind: verb, text: e.taskText });
      }
    }
    const validTime = (s: string) => !Number.isNaN(new Date(s).getTime());
    const timed = activity.filter((a) => validTime(a.when));
    timed.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    // Activity by month -- the last six calendar months, current last.
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), notes: 0, changes: 0 };
    });
    for (const a of timed) {
      const d = new Date(a.when);
      const slot = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
      if (!slot) continue;
      if (a.kind.startsWith("Task")) slot.changes++;
      else slot.notes++;
    }

    return {
      pairs,
      controls,
      tasks,
      bucketCounts,
      attention,
      withEvidence,
      withTesting,
      fullyUploaded,
      nothingUploaded,
      notes,
      files,
      noEvidence,
      contextComplete,
      frameworks,
      columns,
      columnTitle,
      byCode,
      recent: timed.slice(0, 10),
      months,
    };
  }, [applications]);

  function openControl(app: Application, c: ComplianceControl) {
    setFilters(buildControlDrillDownFilters(app, c));
    router.push(`/controls?control=${encodeURIComponent(c.id)}`);
  }

  function openTile(key: ProgressTileKey) {
    if (key === "applications") {
      router.push("/applications");
      return;
    }
    applyQuickFilter(key);
    router.push("/controls");
  }

  const asOf = new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const total = m.controls.length;
  const taskPct = pct(m.tasks.done, m.tasks.total);

  if (applications.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
        <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: T.text }}>Executive dashboard</h1>
        <div className="mt-8 rounded-[10px] border border-dashed p-10 text-center text-[14px]" style={{ borderColor: T.border, color: T.muted }}>
          No applications yet.{" "}
          <button type="button" onClick={() => openOnboarding()} className="font-medium underline" style={{ color: T.teal }}>Start onboarding</button> to create one.
        </div>
      </div>
    );
  }

  // ----- executive narrative (shared with the executive PDF) -----
  const TONE_COLOR: Record<NarrativeLine["tone"], string> = { progress: T.orange, risk: T.red, flow: T.teal, coverage: T.orange };
  const narrative = executiveNarrative(computeExecutiveMetrics(applications)).map((line) => ({
    color: TONE_COLOR[line.tone],
    text: (
      <>
        {line.parts.map((part, i) => (part.bold ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))}
      </>
    ),
  }));

  const parts = BUCKETS.map((b) => ({ n: m.bucketCounts[b.key], color: b.color, label: b.label }));
  const monthMax = Math.max(1, ...m.months.map((x) => x.notes + x.changes));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: T.text }}>Executive dashboard</h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: T.muted }}>
            As of {asOf} · {plural(total, "control")} across {plural(applications.length, "application")}
            {m.frameworks.length ? ` · ${m.frameworks.join(", ")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/applications" className="flex h-[30px] items-center gap-1.5 rounded-md border bg-white px-3 text-[13px]" style={{ borderColor: T.border, color: T.text }}>
            All applications <Icon d={I.arrow} size={13} />
          </Link>
          <button type="button" onClick={() => openPreview(applications)} title="Preview and download the executive progress PDF" className="flex h-[30px] items-center gap-2 rounded-md border px-3 text-[13px] font-medium" style={{ borderColor: T.teal, color: T.teal, background: T.tealSoft }}>
            <Icon d={I.download} size={14} /> Executive summary
          </button>
        </div>
      </div>

      <Section title="Executive narrative">
        <Card className="py-1">
          <ul className="divide-y" style={{ borderColor: T.divider }}>
            {narrative.map((n, i) => (
              <li key={i} className="flex gap-2.5 py-2.5 text-[13px] leading-relaxed" style={{ color: T.body, borderColor: T.divider }}>
                <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: n.color }} />
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="Portfolio snapshot">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile value={applications.length} label="Applications" sub={`${applications.length - m.contextComplete} missing full context`} accent={T.teal} onClick={() => openTile("applications")} />
          <StatTile value={total} label="Controls" sub={m.frameworks.map((f) => `${m.controls.filter((c) => c.framework === f).length} ${f}`).join(" · ") || "—"} accent={T.blue} onClick={() => openTile("controls")} />
          <StatTile value={`${taskPct}%`} label="Tasks complete" sub={`${m.tasks.done} of ${m.tasks.total} checklist tasks`} accent={T.green} />
          <StatTile value={`${pct(m.bucketCounts.done, total)}%`} label="Controls complete" sub={`${m.bucketCounts.done} of ${total} controls`} accent={T.green} onClick={() => openTile("completed")} />
          <StatTile value={m.fullyUploaded} label="Evidence + testing data" sub={`${m.withTesting} with testing data · ${m.nothingUploaded} with nothing`} accent={T.orange} onClick={() => openTile("fullyUploaded")} title="Controls with both evidence and testing data uploaded" />
          <StatTile value={m.attention.length} label="Needs attention" sub="on hold or needs revision — click to list" accent={T.red} onClick={() => openTile("needsAttention")} />
        </div>
      </Section>

      <Section title="Overall progress" hint="controls by status">
        <Card>
          <div className="flex h-[20px] gap-[2px] overflow-hidden rounded-[4px]">
            {total ? (
              parts.map((p) =>
                p.n ? (
                  <div key={p.label} className="flex items-center justify-center text-[10.5px] font-semibold text-white" style={{ flex: p.n, background: p.color }} title={`${p.label}: ${p.n} (${pct(p.n, total)}%)`}>
                    {pct(p.n, total) >= 8 ? `${pct(p.n, total)}%` : ""}
                  </div>
                ) : null
              )
            ) : (
              <div className="flex-1" style={{ background: T.divider }} />
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: T.body }}>
            {parts.map((p) => (
              <span key={p.label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.label} — {p.n}
              </span>
            ))}
          </div>
        </Card>
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 text-[14px] font-semibold" style={{ color: T.text }}>Status distribution</h3>
          <div className="flex items-center gap-5">
            <Donut parts={parts} total={total} label="CONTROLS" />
            <div className="space-y-1.5 text-[12.5px]">
              {parts.map((p) => (
                <div key={p.label} className="grid grid-cols-[12px_1fr_auto] items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: T.body }}>{p.label}</span>
                  <b className="pl-3" style={{ color: T.text }}>{p.n}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-[14px] font-semibold" style={{ color: T.text }}>By workflow stage</h3>
          <HBars color={T.teal} rows={STAGES.map((s) => ({ label: s, n: m.controls.filter((c) => c.stage === s).length }))} />
        </Card>
        <Card>
          <h3 className="mb-3 text-[14px] font-semibold" style={{ color: T.text }}>Uploads</h3>
          <HBars
            color={T.blue}
            rows={[
              { label: "Evidence uploaded", n: m.withEvidence },
              { label: "Testing data uploaded", n: m.withTesting },
              { label: "Both uploaded", n: m.fullyUploaded },
              { label: "Nothing uploaded", n: m.nothingUploaded },
            ]}
          />
        </Card>
      </div>

      <Section
        title="Control coverage"
        hint="applications × control codes"
        right={
          <span className="flex flex-wrap gap-3 text-[11px]" style={{ color: T.muted }}>
            {(Object.keys(CELL_STYLE) as Cell[]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="h-[10px] w-[14px] rounded-[3px] border" style={{ background: CELL_STYLE[k].bg, borderColor: CELL_STYLE[k].border }} />
                {CELL_STYLE[k].label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="h-[10px] w-[14px] rounded-[3px] border border-dashed" style={{ borderColor: T.gray }} /> Not in scope
            </span>
          </span>
        }
      >
        <div className="overflow-x-auto rounded-[10px] border" style={{ background: T.card, borderColor: T.border }}>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr style={{ background: "#f7f9fb" }}>
                <th className="sticky left-0 z-10 min-w-[200px] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ background: "#f7f9fb", color: T.muted }}>Application</th>
                {m.columns.map((k) => (
                  <th key={k} className="px-1 py-2 text-center font-mono text-[10.5px] font-semibold" style={{ color: T.body }} title={m.columnTitle(k)}>
                    <span className="block max-w-[72px] truncate">{k}</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: T.muted }}>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => {
                const { appName, context } = splitApplicationName(a.name);
                const s = taskStats(a.controls);
                const done = a.controls.filter((c) => c.controlStatus === "Completed").length;
                return (
                  <tr key={a.id} className="border-t" style={{ borderColor: T.divider }}>
                    <td className="sticky left-0 z-10 px-3 py-1.5" style={{ background: T.card }}>
                      <Link href={`/applications?app=${encodeURIComponent(a.id)}`} className="font-semibold hover:underline" style={{ color: T.text }}>{appName}</Link>
                      {context ? <span className="ml-1.5 text-[11px]" style={{ color: T.faint }}>{context}</span> : null}
                    </td>
                    {m.columns.map((k) => {
                      const cs = a.controls.filter((c) => controlTypeKey(c) === k);
                      if (!cs.length) {
                        return (
                          <td key={k} className="px-1 py-1.5 text-center">
                            <span className="mx-auto block h-[22px] w-[44px] rounded-[5px] border border-dashed" style={{ borderColor: T.divider }} title={`${appName} · ${m.columnTitle(k)}: not in scope`} />
                          </td>
                        );
                      }
                      const cell = CELL_STYLE[cellOf(cs)];
                      const ts = taskStats(cs);
                      return (
                        <td key={k} className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => openControl(a, cs[0])}
                            className="mx-auto flex h-[22px] w-[44px] items-center justify-center rounded-[5px] border text-[10.5px] font-semibold transition hover:brightness-95"
                            style={{ background: cell.bg, borderColor: cell.border, color: cell.fg }}
                            title={`${appName} · ${m.columnTitle(k)}\n${cs.map((c) => `${c.name} — ${c.controlStatus}`).join("\n")}\n${ts.done}/${ts.total} tasks done`}
                          >
                            {cellOf(cs) === "done" ? "✓" : cellOf(cs) === "attention" ? "!" : `${ts.done}/${ts.total}`}
                          </button>
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-3 py-1.5" style={{ color: T.body }}>
                      <span className="font-semibold" style={{ color: T.text }}>{done}/{a.controls.length}</span> controls · {pct(s.done, s.total)}% tasks
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Activity by month" hint="notes logged and checklist changes">
        <Card>
          <div className="flex h-[150px] items-end justify-around gap-4">
            {m.months.map((x) => {
              const n = x.notes + x.changes;
              return (
                <div key={x.label} className="flex h-full flex-1 flex-col items-center justify-end" title={`${x.label}: ${x.notes} notes, ${x.changes} checklist changes`}>
                  <span className="mb-1 text-[11px] font-semibold" style={{ color: T.text }}>{n}</span>
                  <div className="flex w-[26px] flex-col gap-[2px]" style={{ height: `${(n / monthMax) * 100}px` }}>
                    {x.changes ? <div className="rounded-t-[4px]" style={{ flex: x.changes, background: T.blue }} /> : null}
                    {x.notes ? <div className={x.changes ? "" : "rounded-t-[4px]"} style={{ flex: x.notes, background: T.green }} /> : null}
                  </div>
                  <span className="mt-1.5 text-[11px]" style={{ color: T.muted }}>{x.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-5 text-[12px]" style={{ color: T.body }}>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: T.green }} /> Notes</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: T.blue }} /> Checklist changes</span>
          </div>
        </Card>
      </Section>

      <Section title="Attention required" hint="on hold or checklist needs revision">
        <div className="rounded-[10px] border border-l-[3px] px-4 py-3" style={{ background: T.card, borderColor: T.border, borderLeftColor: m.attention.length ? T.red : T.green }}>
          {m.attention.length ? (
            <ul className="space-y-1.5 text-[13px]">
              {m.attention.map(({ app, c }) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => openControl(app, c)} className="font-medium hover:underline" style={{ color: T.teal }}>
                    {splitApplicationName(app.name).appName} — {c.name}
                  </button>
                  <span className="font-mono text-[11px]" style={{ color: T.muted }}>{clientCode(c)}</span>
                  {c.controlStatus === "On Hold" ? <StatusPill text="On hold" tone={{ fg: T.red, bg: T.redSoft }} /> : null}
                  {c.checklistStatus === "Needs Revision" ? <StatusPill text="Checklist needs revision" tone={{ fg: T.orange, bg: T.orangeSoft }} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: T.muted }}>Nothing needs attention right now.</p>
          )}
        </div>
      </Section>

      <Section title="Recent activity">
        <div className="overflow-x-auto rounded-[10px] border" style={{ background: T.card, borderColor: T.border }}>
          {m.recent.length ? (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ background: "#eef2f6", color: T.muted }}>
                  <th className="px-4 py-2">Application</th>
                  <th className="px-4 py-2">Control</th>
                  <th className="px-4 py-2">Activity</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {m.recent.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: T.divider }}>
                    <td className="whitespace-nowrap px-4 py-2" style={{ color: T.text }}>{splitApplicationName(r.app.name).appName}</td>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => openControl(r.app, r.c)} className="text-left hover:underline" style={{ color: T.teal }}>{r.c.name}</button>
                    </td>
                    <td className="max-w-[420px] truncate px-4 py-2" style={{ color: T.body }} title={r.text}>{r.text}</td>
                    <td className="px-4 py-2"><StatusPill text={r.kind} tone={{ fg: T.body, bg: "#eef1f4" }} /></td>
                    <td className="whitespace-nowrap px-4 py-2" style={{ color: T.muted }}>{new Date(r.when).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-center text-[13px]" style={{ color: T.faint }}>No notes or checklist changes recorded yet.</p>
          )}
        </div>
      </Section>

      <footer className="mt-10 border-t pt-4 text-center text-[11.5px]" style={{ borderColor: T.border, color: T.faint }}>
        Control Governor · Developed by Manoj | Version {process.env.NEXT_PUBLIC_APP_VERSION}
      </footer>
      {previewModal}
    </div>
  );
}
