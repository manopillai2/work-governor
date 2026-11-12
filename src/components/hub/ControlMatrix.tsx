"use client";

// The /controls page (New UI): applications x control types heat map,
// built to grow. Rows are applications (unbounded -- searched,
// filtered, sorted and paged); columns are the fixed set of control
// types (IS02 ... OP23). Header, first column and totals stay pinned
// while scrolling. Each cell is that application's control, coloured
// by status with E / T upload badges; click a cell for the control
// pop-out.
//
// Filtering eliminates what doesn't apply: picking control types keeps
// only those columns and only the applications that have at least one
// of them; search / quick filters keep only applications with a
// matching control and drop columns with no match. "Pop out" shows the
// matrix alone, full screen, without the page header, KPI strip and
// filter bar above it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

import ControlDetailsButton from "@/components/ControlDetailsButton";
import UploadIndicators from "@/components/UploadIndicators";
import type { FlatControlEntry } from "@/services/applicationFilters";
import type { Application, ComplianceControl } from "@/services/commandEngine";
import { controlUploadState } from "@/services/uploads";
import {
  CodeChip,
  ControlPopout,
  EmptyResult,
  ListToolbar,
  Pager,
  STATUS_SHORT,
  STATUS_TONE,
  appLabel,
  groupByControlType,
  groupDetails,
  matchesQuick,
  matchesSearch,
  paginate,
  quickCounts,
  useListState,
} from "./controlViews";
import { Icon, T, controlTypeKey, needsAttention, taskStats } from "./hubUi";

type Sort = "gaps" | "attention" | "progress" | "name";

const SORTS: { key: Sort; label: string }[] = [
  { key: "gaps", label: "Most gaps first" },
  { key: "attention", label: "Needs attention first" },
  { key: "progress", label: "Least progress first" },
  { key: "name", label: "Name (A–Z)" },
];

type Row = { app: Application; byKey: Map<string, ComplianceControl>; controls: ComplianceControl[] };

// A "gap" is any in-scope control that is not completed or is missing
// testing data -- what still stands between the app and full coverage.
const isGap = (c: ComplianceControl) => c.controlStatus !== "Completed" || !controlUploadState(c).testing.uploaded;

function popoutIcon(full: boolean) {
  // expand: arrows out of a box; collapse: arrows in
  return full ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5";
}

export default function ControlMatrix({
  entries,
  openId,
  onOpen,
  onClose,
}: {
  entries: FlatControlEntry[];
  openId: string | null;
  onOpen: (controlId: string) => void;
  onClose: () => void;
}) {
  const state = useListState<Sort>("gaps", 25);
  const [codes, setCodes] = useState<string[]>([]);
  const [full, setFull] = useState(false);

  // Esc leaves full screen -- unless a dialog (control pop-out, control
  // details) is open on top; that one closes first.
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const allGroups = groupByControlType(entries);
  const toggleCode = (key: string) => {
    setCodes((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
    state.setPage(0);
  };

  // What passes every filter. Code picks restrict the universe first, so
  // the quick-filter counts and the rows only ever reflect applicable
  // controls.
  const inCodes = entries.filter((e) => codes.length === 0 || codes.includes(controlTypeKey(e.control)));
  const searched = inCodes.filter((e) => matchesSearch(e, state.query));
  const counts = quickCounts(searched.map((e) => e.control));
  const matching = searched.filter((e) => matchesQuick(e.control, state.quick));
  const matchIds = new Set(matching.map((e) => e.control.id));
  const filtering = state.quick !== "all" || state.query.trim() !== "";

  // Columns: picked codes; otherwise, while filtering, only types with
  // at least one match; otherwise all.
  const matchKeys = new Set(matching.map((e) => controlTypeKey(e.control)));
  const groups = allGroups.filter((g) => (codes.length ? codes.includes(g.key) : !filtering || matchKeys.has(g.key)));
  const visibleKeys = new Set(groups.map((g) => g.key));

  // Rows: applications with at least one matching control in a visible
  // column. Their other visible cells still show (dimmed) so the row
  // reads in full.
  const rowsById = new Map<string, Row>();
  for (const e of entries) {
    const key = controlTypeKey(e.control);
    if (!visibleKeys.has(key)) continue;
    let row = rowsById.get(e.application.id);
    if (!row) {
      row = { app: e.application, byKey: new Map(), controls: [] };
      rowsById.set(e.application.id, row);
    }
    row.byKey.set(key, e.control);
    row.controls.push(e.control);
  }
  const totalApps = new Set(entries.map((e) => e.application.id)).size;
  const allRows = [...rowsById.values()].filter((r) => r.controls.some((c) => matchIds.has(c.id)));
  const gaps = (r: Row) => r.controls.filter(isGap).length;
  allRows.sort((a, b) => {
    const byName = a.app.name.localeCompare(b.app.name, undefined, { numeric: true });
    switch (state.sort) {
      case "gaps":
        return gaps(b) - gaps(a) || byName;
      case "attention":
        return b.controls.filter(needsAttention).length - a.controls.filter(needsAttention).length || gaps(b) - gaps(a) || byName;
      case "progress": {
        const pa = taskStats(a.controls);
        const pb = taskStats(b.controls);
        return (pa.total ? pa.done / pa.total : 0) - (pb.total ? pb.done / pb.total : 0) || byName;
      }
      default:
        return byName;
    }
  });
  const info = paginate(allRows, state.page, full ? 50 : state.pageSize);
  const reset = () => {
    state.setQuery("");
    state.setQuick("all");
    setCodes([]);
  };
  const open = entries.find((e) => e.control.id === openId);

  const toolbar = (
    <>
      <ListToolbar
        state={state}
        sorts={SORTS}
        placeholder="Search applications, owners, controls, codes…"
        counts={counts}
        right={
          <>
            <span className="text-[12px]" style={{ color: T.muted }}>
              {allRows.length} of {totalApps} applications
            </span>
            <button
              type="button"
              onClick={() => setFull((f) => !f)}
              title={full ? "Back to the page (Esc)" : "Show the matrix alone, full screen"}
              className="flex h-[30px] items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium"
              style={{ borderColor: T.teal, color: T.teal, background: full ? "#fff" : T.tealSoft }}
            >
              <Icon d={popoutIcon(full)} size={14} /> {full ? "Close" : "Pop out"}
            </button>
          </>
        }
      />
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11.5px] font-medium" style={{ color: T.muted }}>Control types</span>
        {allGroups.map((g) => {
          const on = codes.includes(g.key);
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => toggleCode(g.key)}
              aria-pressed={on}
              title={`${g.title} — ${g.items.length} application${g.items.length === 1 ? "" : "s"}`}
              className="rounded-md border px-1.5 py-[2px] font-mono text-[11px] font-semibold transition"
              style={on ? { background: T.teal, borderColor: T.teal, color: "#fff" } : { background: "#fff", borderColor: T.border, color: T.body }}
            >
              {g.isCode ? g.key : g.title}
            </button>
          );
        })}
        {codes.length ? (
          <button type="button" onClick={() => setCodes([])} className="ml-1 text-[11.5px] font-medium" style={{ color: T.teal }}>
            Clear
          </button>
        ) : null}
        <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px]" style={{ color: T.muted }}>
          {(["Completed", "Ready for Review", "In Progress", "Checklist Review Pending", "New", "On Hold"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="h-[10px] w-[14px] rounded-[3px]" style={{ background: STATUS_TONE[s].bg, border: `1px solid ${STATUS_TONE[s].fg}55` }} />
              {STATUS_SHORT[s]}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="h-[10px] w-[14px] rounded-[3px] border border-dashed" style={{ borderColor: T.gray }} /> N/A
          </span>
        </span>
      </div>
    </>
  );

  const table =
    allRows.length === 0 ? (
      <EmptyResult onReset={reset} />
    ) : (
      <div
        className={`${full ? "min-h-0 flex-1" : "max-h-[calc(100vh-330px)] min-h-[300px]"} overflow-auto rounded-[10px] border`}
        style={{ background: T.card, borderColor: T.border }}
      >
        <table className="w-full border-separate border-spacing-0 text-[12px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[210px] border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ background: "#f7f9fb", color: T.muted, borderColor: T.border }}>
                Application
              </th>
              {groups.map((g) => (
                <th key={g.key} className="sticky top-0 z-20 min-w-[92px] border-b px-1.5 py-2 text-center" style={{ background: "#f7f9fb", borderColor: T.border }} title={g.title}>
                  <span className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      <CodeChip group={g} />
                      <ControlDetailsButton size={18} details={groupDetails(g)} />
                    </span>
                    <span className="block max-w-[88px] truncate text-[10px] font-medium" style={{ color: T.muted }}>{g.title}</span>
                  </span>
                </th>
              ))}
              <th className="sticky top-0 z-20 min-w-[120px] border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ background: "#f7f9fb", color: T.muted, borderColor: T.border }}>
                Coverage
              </th>
            </tr>
          </thead>
          <tbody>
            {info.slice.map((r) => {
              const done = r.controls.filter((c) => c.controlStatus === "Completed").length;
              const both = r.controls.filter((c) => {
                const u = controlUploadState(c);
                return u.evidence.uploaded && u.testing.uploaded;
              }).length;
              return (
                <tr key={r.app.id}>
                  <td className="sticky left-0 z-10 border-b px-3 py-1.5" style={{ background: T.card, borderColor: T.divider }}>
                    <Link href={`/applications?app=${encodeURIComponent(r.app.id)}`} className="block truncate font-semibold hover:underline" style={{ color: T.text }} title={`${r.app.name} — open application`}>
                      {appLabel(r.app)}
                    </Link>
                    <span className="block truncate text-[10.5px]" style={{ color: T.faint }}>{r.app.hosting} · {r.app.controls.length} controls</span>
                  </td>
                  {groups.map((g) => {
                    const c = r.byKey.get(g.key);
                    if (!c) {
                      return (
                        <td key={g.key} className="border-b px-1.5 py-1.5 text-center" style={{ borderColor: T.divider }}>
                          <span className="mx-auto block h-[38px] w-[84px] rounded-[6px] border border-dashed" style={{ borderColor: T.divider }} title={`${appLabel(r.app)} · ${g.title}: not applicable`} />
                        </td>
                      );
                    }
                    const tone = STATUS_TONE[c.controlStatus];
                    const s = taskStats([c]);
                    const hot = needsAttention(c);
                    const dim = filtering && !matchIds.has(c.id);
                    return (
                      <td key={g.key} className="border-b px-1.5 py-1.5 text-center" style={{ borderColor: T.divider }}>
                        <button
                          type="button"
                          onClick={() => onOpen(c.id)}
                          className="mx-auto flex h-[38px] w-[84px] flex-col items-center justify-center gap-0.5 rounded-[6px] border transition hover:brightness-95"
                          style={{
                            background: tone.bg,
                            borderColor: hot ? T.red : `${tone.fg}55`,
                            boxShadow: c.id === openId ? `0 0 0 2px ${T.teal}` : hot ? `inset 0 0 0 1px ${T.red}` : undefined,
                            opacity: dim ? 0.35 : 1,
                          }}
                          title={`${appLabel(r.app)} · ${c.name}\n${c.controlStatus}${hot ? " · needs attention" : ""}\n${s.done}/${s.total} tasks`}
                        >
                          <span className="text-[10px] font-semibold" style={{ color: tone.fg }}>
                            {hot ? "! " : ""}
                            {STATUS_SHORT[c.controlStatus]} · {s.done}/{s.total}
                          </span>
                          <UploadIndicators control={c} mini />
                        </button>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap border-b px-3 py-1.5 text-[11.5px]" style={{ color: T.body, borderColor: T.divider }}>
                    <b style={{ color: T.text }}>{done}/{r.controls.length}</b> done
                    <span className="block text-[10.5px]" style={{ color: T.muted }}>{both}/{r.controls.length} E+T · {gaps(r)} gaps</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky bottom-0 left-0 z-30 border-t px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ background: "#f7f9fb", color: T.muted, borderColor: T.border }}>
                {filtering || codes.length ? `Filtered (${allRows.length})` : "All applications"}
              </td>
              {groups.map((g) => {
                const cells = allRows.map((r) => r.byKey.get(g.key)).filter((c): c is ComplianceControl => Boolean(c));
                const n = cells.length;
                const done = cells.filter((c) => c.controlStatus === "Completed").length;
                const testing = cells.filter((c) => controlUploadState(c).testing.uploaded).length;
                return (
                  <td key={g.key} className="sticky bottom-0 z-20 border-t px-1.5 py-2 text-center text-[10.5px]" style={{ background: "#f7f9fb", color: T.body, borderColor: T.border }} title={`${g.title}: ${done}/${n} done, ${testing}/${n} with testing data`}>
                    <b style={{ color: T.text }}>{done}/{n}</b> done
                    <span className="block" style={{ color: T.muted }}>T {testing}/{n}</span>
                  </td>
                );
              })}
              <td className="sticky bottom-0 z-20 border-t" style={{ background: "#f7f9fb", borderColor: T.border }} />
            </tr>
          </tfoot>
        </table>
      </div>
    );

  const body = (
    <>
      {toolbar}
      {table}
      <Pager info={info} setPage={state.setPage} unit="applications" />
    </>
  );

  return (
    <>
      {full ? (
        <>
          <div className="flex items-center justify-between rounded-[10px] border border-dashed px-4 py-6 text-[13px]" style={{ borderColor: T.border, color: T.muted }}>
            The control matrix is popped out.
            <button type="button" onClick={() => setFull(false)} className="font-medium" style={{ color: T.teal }}>Bring it back</button>
          </div>
          {createPortal(
            <div className="fixed inset-0 z-[44] flex flex-col p-3 sm:p-4" style={{ background: T.canvas }} role="region" aria-label="Control matrix (full screen)">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[15px] font-semibold" style={{ color: T.text }}>Control matrix</span>
                <span className="text-[12px]" style={{ color: T.muted }}>· Esc or Close to return</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{body}</div>
            </div>,
            document.body
          )}
        </>
      ) : (
        body
      )}
      <ControlPopout entry={open} onClose={onClose} />
    </>
  );
}
