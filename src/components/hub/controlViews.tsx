"use client";

// Shared building blocks for the /controls matrix: grouping by control
// type, status colours, the control pop-out, and the search / quick
// filter / sort / paging toolbar.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import ConnectedControlCard from "@/components/ConnectedControlCard";
import { splitApplicationName } from "@/services/applicationName";
import type { FlatControlEntry } from "@/services/applicationFilters";
import { CLIENT_REFERENCE_TABLE } from "@/services/clientReference";
import type { Application, ComplianceControl, ControlStatus } from "@/services/commandEngine";
import type { Details } from "@/components/ControlDetailsButton";
import { controlUploadState } from "@/services/uploads";
import { I, Icon, T, controlTypeKey, needsAttention } from "./hubUi";

// ---------- status ----------
export const STATUS_TONE: Record<ControlStatus, { fg: string; bg: string }> = {
  New: { fg: T.muted, bg: "#eef1f4" },
  "Checklist Review Pending": { fg: T.orange, bg: T.orangeSoft },
  "In Progress": { fg: T.blue, bg: "#e8f1fa" },
  "Ready for Review": { fg: T.teal, bg: T.tealSoft },
  Completed: { fg: T.green, bg: T.greenSoft },
  "On Hold": { fg: T.red, bg: T.redSoft },
};

export const STATUS_SHORT: Record<ControlStatus, string> = {
  New: "New",
  "Checklist Review Pending": "Review",
  "In Progress": "In progress",
  "Ready for Review": "Ready",
  Completed: "Done",
  "On Hold": "On hold",
};

// ---------- grouping ----------
export type ControlGroup = { key: string; title: string; isCode: boolean; items: { app: Application; c: ComplianceControl }[] };

// Group flat entries by control type: the fixed client reference order
// first (IS02, IS03 ... OP23), then any other types alphabetically;
// applications inside a group alphabetically.
export function groupByControlType(entries: FlatControlEntry[]): ControlGroup[] {
  const byKey = new Map<string, ControlGroup>();
  for (const { application, control } of entries) {
    const key = controlTypeKey(control);
    let group = byKey.get(key);
    if (!group) {
      const ref = CLIENT_REFERENCE_TABLE.find((e) => e.code === key);
      group = { key, title: ref ? control.name || ref.title : key, isCode: !!ref, items: [] };
      byKey.set(key, group);
    }
    group.items.push({ app: application, c: control });
  }
  const refOrder = CLIENT_REFERENCE_TABLE.map((e) => e.code);
  const rank = (k: string) => (refOrder.includes(k) ? refOrder.indexOf(k) : refOrder.length);
  const groups = [...byKey.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
  for (const g of groups) g.items.sort((a, b) => a.app.name.localeCompare(b.app.name, undefined, { numeric: true }));
  return groups;
}

export function CodeChip({ group }: { group: Pick<ControlGroup, "key" | "isCode"> }) {
  return group.isCode ? (
    <span className="shrink-0 rounded-md px-1.5 py-[1px] font-mono text-[11px] font-semibold" style={{ background: T.tealSoft, color: T.teal }}>{group.key}</span>
  ) : null;
}

export const appLabel = (app: Application) => splitApplicationName(app.name).appName;

// ---------- pop-out ----------
// One application's control as the full ControlCard over the page.
// Esc / backdrop / × close it; a nested dialog (Control details)
// handles its own Escape first and marks it handled.
export function ControlPopout({ entry, onClose }: { entry: FlatControlEntry | undefined; onClose: () => void }) {
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  if (!entry) return null;
  return createPortal(
    <div className="fixed inset-0 z-[45] flex items-start justify-center overflow-y-auto bg-[rgba(15,30,45,0.45)] p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${entry.control.name} — ${appLabel(entry.application)}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-xl shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-md hover:bg-[#eef1f4]"
          style={{ borderColor: T.border, color: T.body }}
        >
          <Icon d={I.close} size={16} />
        </button>
        <ConnectedControlCard application={entry.application} control={entry.control} expanded onToggleExpanded={onClose} />
      </div>
    </div>,
    document.body
  );
}

// ---------- shared derivations ----------
export function groupDetails(group: ControlGroup): Details[] {
  return group.items.map(({ app, c }) => ({
    controlName: group.title,
    applicationName: appLabel(app),
    framework: c.framework,
    globalControlReference: c.globalControlReference,
    clientContext: c.clientContext,
    controlObjective: c.controlObjective,
    controlRisk: c.controlRisk,
    applicabilityRationale: c.applicabilityRationale,
    evidenceStrategy: c.evidenceStrategy,
  }));
}

// ---------- scale: search, quick filters, sort, paging ----------
// Every view shares one toolbar so lists stay usable as the number of
// applications grows: free-text search, quick "gap" filters (with
// live counts), a sort, and paging / show-more instead of unbounded
// lists.

export type QuickFilter = "all" | "attention" | "open" | "noEvidence" | "noTesting";

export const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "open", label: "Not completed" },
  { key: "noEvidence", label: "Missing evidence" },
  { key: "noTesting", label: "Missing testing data" },
];

export function matchesQuick(c: ComplianceControl, q: QuickFilter): boolean {
  switch (q) {
    case "all":
      return true;
    case "attention":
      return needsAttention(c);
    case "open":
      return c.controlStatus !== "Completed";
    case "noEvidence":
      return !controlUploadState(c).evidence.uploaded;
    case "noTesting":
      return !controlUploadState(c).testing.uploaded;
  }
}

export function matchesSearch(e: FlatControlEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const a = e.application;
  const c = e.control;
  return [a.name, a.applicationOwner, a.technicalOwner, a.businessProcess, c.name, c.clientContext, c.globalControlReference, c.framework]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function useListState<S extends string>(defaultSort: S, pageSize = 25) {
  const [query, setQueryRaw] = useState("");
  const [quick, setQuickRaw] = useState<QuickFilter>("all");
  const [sort, setSortRaw] = useState<S>(defaultSort);
  const [page, setPage] = useState(0);
  return {
    query,
    quick,
    sort,
    page,
    pageSize,
    setPage,
    // Any change to what is shown starts again from the first page.
    setQuery: (v: string) => {
      setQueryRaw(v);
      setPage(0);
    },
    setQuick: (v: QuickFilter) => {
      setQuickRaw(v);
      setPage(0);
    },
    setSort: (v: S) => {
      setSortRaw(v);
      setPage(0);
    },
  };
}

export type ListState<S extends string> = ReturnType<typeof useListState<S>>;

export function ListToolbar<S extends string>({
  state,
  sorts,
  placeholder,
  counts,
  right,
}: {
  state: ListState<S>;
  sorts?: { key: S; label: string }[];
  placeholder: string;
  counts?: Partial<Record<QuickFilter, number>>;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-[30px] min-w-[240px] flex-1 items-center gap-2 rounded-md border bg-white px-3 text-[13px]" style={{ borderColor: T.border }}>
          <Icon d={I.search} size={15} color={T.faint} />
          <input
            value={state.query}
            onChange={(e) => state.setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-full flex-1 bg-transparent outline-none"
            style={{ color: T.text, boxShadow: "none" }}
          />
          {state.query ? (
            <button type="button" onClick={() => state.setQuery("")} aria-label="Clear search" style={{ color: T.faint }}>
              <Icon d={I.close} size={13} />
            </button>
          ) : null}
        </label>
        {sorts ? (
          <label className="relative flex h-[30px] items-center rounded-md border bg-white text-[13px]" style={{ borderColor: T.border }}>
            <span className="pl-3 text-[12px]" style={{ color: T.muted }}>Sort</span>
            <select value={state.sort} onChange={(e) => state.setSort(e.target.value as S)} className="h-full appearance-none bg-transparent pl-2 pr-8 outline-none" style={{ color: T.text }}>
              {sorts.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5" style={{ color: T.text }}><Icon d={I.chevron} size={13} /></span>
          </label>
        ) : null}
        {right}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map((f) => {
          const active = state.quick === f.key;
          const n = counts?.[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => state.setQuick(f.key)}
              aria-pressed={active}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12px] font-medium transition"
              style={active ? { background: T.tealActive, borderColor: T.teal, color: T.teal } : { background: "#fff", borderColor: T.border, color: T.body }}
            >
              {f.label}
              {n !== undefined ? (
                <span className="rounded-full px-1.5 text-[10.5px]" style={{ background: active ? "#fff" : "#eef1f4", color: active ? T.teal : T.muted }}>{n}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Counts per quick filter over a list of controls (after search).
export function quickCounts(controls: ComplianceControl[]): Record<QuickFilter, number> {
  return Object.fromEntries(QUICK_FILTERS.map((f) => [f.key, controls.filter((c) => matchesQuick(c, f.key)).length])) as Record<QuickFilter, number>;
}

export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(page, pages - 1);
  return { slice: items.slice(p * size, p * size + size), page: p, pages, from: items.length ? p * size + 1 : 0, to: Math.min(items.length, (p + 1) * size), total: items.length };
}

export function Pager({ info, setPage, unit }: { info: ReturnType<typeof paginate>; setPage: (p: number) => void; unit: string }) {
  if (info.total === 0) return null;
  const btn = "rounded-md border px-2.5 py-1 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]" style={{ color: T.muted }}>
      <span>
        Showing <b style={{ color: T.text }}>{info.from}–{info.to}</b> of <b style={{ color: T.text }}>{info.total}</b> {unit}
      </span>
      {info.pages > 1 ? (
        <span className="flex items-center gap-1.5">
          <button type="button" className={btn} style={{ borderColor: T.border, color: T.body, background: "#fff" }} disabled={info.page === 0} onClick={() => setPage(info.page - 1)}>‹ Prev</button>
          <span>Page {info.page + 1} of {info.pages}</span>
          <button type="button" className={btn} style={{ borderColor: T.border, color: T.body, background: "#fff" }} disabled={info.page >= info.pages - 1} onClick={() => setPage(info.page + 1)}>Next ›</button>
        </span>
      ) : null}
    </div>
  );
}

export function EmptyResult({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-[10px] border border-dashed p-8 text-center text-[13px]" style={{ borderColor: T.border, color: T.muted }}>
      Nothing matches this search / filter.{" "}
      <button type="button" onClick={onReset} className="font-medium underline" style={{ color: T.teal }}>Clear</button>
    </div>
  );
}
