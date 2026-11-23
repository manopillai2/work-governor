"use client";

// ======================================================
// Route          : /learnings
// Purpose        : The Learning hub -- every Learning Engine item
//                  (checklist learnings and proposed control codes)
//                  by status: Waiting for approval, Approved,
//                  Denied. Waiting items can be approved / denied
//                  here (same actions as the pop-up); approved
//                  learnings can be revoked and denied ones
//                  re-opened. The pop-up hides itself on this page.
// ======================================================

import { useCallback, useEffect, useMemo, useState } from "react";

import HubShell from "@/components/hub/HubShell";
import { I, Icon, T } from "@/components/hub/hubUi";
import { useAppState } from "@/components/AppStateProvider";
import {
  FRAMEWORK_OPTIONS,
  HOSTING_OPTIONS,
  isParked,
  learningHeadline,
  learningWhy,
  scopeLabel,
  type PendingClientReferenceLearning,
  type PendingLearning,
} from "@/components/LearningNotifications";

type LearningRow = PendingLearning & {
  notes: { id: string; note: string; createdAt: string }[];
};

type Entry =
  | { kind: "checklist"; row: LearningRow }
  | { kind: "code"; row: PendingClientReferenceLearning };

type Tab = "pending" | "accepted" | "rejected";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Waiting for approval" },
  { key: "accepted", label: "Approved" },
  { key: "rejected", label: "Denied" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function waitingBadge(row: {
  snoozedUntil?: string | null;
  reviewInHub?: boolean;
}): string {
  if (!isParked(row)) return "In pop-up";
  if (row.reviewInHub) return "Moved to hub";
  return `Snoozed until ${new Date(row.snoozedUntil!).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

const button =
  "rounded-md px-3 py-1.5 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40";

function LearningItem({
  entry,
  onApprove,
  onDeny,
  onRevoke,
  onReopen,
}: {
  entry: Entry;
  onApprove: (scope?: { framework: string | null; hosting: string | null; note?: string }) => Promise<void>;
  onDeny: () => Promise<void>;
  onRevoke: () => Promise<void>;
  onReopen: () => Promise<void>;
}) {
  const row = entry.row;
  const isCode = entry.kind === "code";
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [framework, setFramework] = useState(
    !isCode ? (entry.row.framework ?? "Any") : "Any"
  );
  const [hosting, setHosting] = useState(
    !isCode ? (entry.row.hosting ?? "Any") : "Any"
  );
  const [note, setNote] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const headline = isCode
    ? `${entry.row.code} — ${entry.row.title}`
    : learningHeadline(entry.row);
  const why = isCode
    ? `Proposed control code, on ${entry.row.sourceControlName}.`
    : learningWhy(entry.row);

  return (
    <li
      className="rounded-[10px] border bg-white p-4"
      style={{ borderColor: T.border }}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        <span
          className="rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide"
          style={
            isCode
              ? { background: "#fef3c7", color: "#92400e" }
              : { background: "#e0e7ff", color: "#4338ca" }
          }
        >
          {isCode ? "Control code" : "Checklist learning"}
        </span>
        <span style={{ color: T.muted }}>
          from <span style={{ color: T.body }}>{row.sourceApplicationId}</span>
          {" · "}
          {formatDate(row.createdAt)}
        </span>
        {row.status === "pending" ? (
          <span
            className="ml-auto rounded-full px-2 py-0.5"
            style={{ background: T.orangeSoft, color: T.orange }}
          >
            {waitingBadge(row)}
          </span>
        ) : (
          <span className="ml-auto" style={{ color: T.muted }}>
            {row.status === "accepted" ? "Approved" : "Denied"}{" "}
            {formatDate(row.respondedAt)}
          </span>
        )}
      </div>

      <p className="mt-2 text-[15px] font-semibold" style={{ color: T.text }}>
        {headline}
      </p>
      {why ? (
        <p className="mt-0.5 text-[13px] leading-5" style={{ color: T.body }}>
          {why}
        </p>
      ) : null}

      {!isCode && entry.row.suggestedTaskText ? (
        <div className="mt-2 rounded-md px-3 py-2" style={{ background: T.canvas }}>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.faint }}>
            {entry.row.sourceChangeType === "REMOVED"
              ? "Future checklists reconsider"
              : `Future checklists add · ${entry.row.suggestedCategory}`}
          </p>
          <p className="mt-0.5 text-[13px] leading-5" style={{ color: T.body }}>
            {entry.row.suggestedTaskText}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: T.muted }}>
        {!isCode ? (
          <span>
            Applies to:{" "}
            <span style={{ color: T.body }}>
              {scopeLabel(entry.row.framework, entry.row.hosting)}
            </span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-medium hover:underline"
          style={{ color: T.teal }}
        >
          {open ? "Hide details" : "Details"}
        </button>
      </div>

      {open ? (
        <div className="mt-2 space-y-2 border-t pt-2 text-[12.5px] leading-5" style={{ borderColor: T.divider, color: T.body }}>
          {isCode ? (
            entry.row.sourceQuote ? (
              <p>
                <span className="font-medium">From your message:</span>{" "}
                <i>&quot;{entry.row.sourceQuote}&quot;</i>
              </p>
            ) : null
          ) : (
            <>
              {entry.row.content && entry.row.headline ? null : (
                <p>{entry.row.content}</p>
              )}
              {entry.row.sourceReason ? (
                <p>
                  <span className="font-medium">Learned from your note:</span>{" "}
                  {entry.row.sourceReason}
                </p>
              ) : null}
              <p>
                <span className="font-medium">Checklist change:</span>{" "}
                {entry.row.sourceChangeType === "REMOVED" ? "removed" : "added"} &quot;
                {entry.row.sourceTaskText}&quot;
              </p>
              {entry.row.notes.map((n) => (
                <p key={n.id}>
                  <span className="font-medium">Reviewer note:</span> {n.note}
                </p>
              ))}
              {row.status === "pending" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <label className="text-[11.5px]" style={{ color: T.muted }}>
                    Framework
                    <select value={framework} onChange={(e) => setFramework(e.target.value)} className="ml-1.5 rounded-md border px-2 py-1 text-[12px]" style={{ borderColor: T.border, color: T.text }}>
                      {FRAMEWORK_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="text-[11.5px]" style={{ color: T.muted }}>
                    Hosting
                    <select value={hosting} onChange={(e) => setHosting(e.target.value)} className="ml-1.5 rounded-md border px-2 py-1 text-[12px]" style={{ borderColor: T.border, color: T.text }}>
                      {HOSTING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="min-w-[200px] flex-1 rounded-md border px-2 py-1 text-[12px]" style={{ borderColor: T.border, color: T.text }} />
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {row.status === "pending" ? (
          <>
            <button type="button" disabled={busy} onClick={() => run(onDeny)} className={button} style={{ background: T.redSoft, color: T.red }}>
              Deny
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(() =>
                  onApprove(
                    isCode
                      ? undefined
                      : {
                          framework: framework === "Any" ? null : framework,
                          hosting: hosting === "Any" ? null : hosting,
                          note: note.trim() || undefined,
                        }
                  )
                )
              }
              className={button}
              style={{ background: T.green, color: "#fff" }}
            >
              Approve
            </button>
          </>
        ) : row.status === "accepted" ? (
          isCode ? (
            <span className="text-[12px]" style={{ color: T.muted }}>
              In use for control matching
            </span>
          ) : (
            <button type="button" disabled={busy} onClick={() => run(onRevoke)} className={button} style={{ border: `1px solid ${T.border}`, color: T.body }}>
              Revoke
            </button>
          )
        ) : (
          <button type="button" disabled={busy} onClick={() => run(onReopen)} className={button} style={{ border: `1px solid ${T.border}`, color: T.body }}>
            Re-open
          </button>
        )}
      </div>
    </li>
  );
}

export default function LearningsPage() {
  const {
    progress,
    pendingLearnings,
    pendingClientReferenceLearnings,
    respondToLearning,
    respondToClientReferenceLearning,
    reloadLearnings,
  } = useAppState();

  const [rows, setRows] = useState<LearningRow[]>([]);
  const [codes, setCodes] = useState<PendingClientReferenceLearning[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/learnings");
      if (!response.ok) throw new Error("Couldn't load learnings.");
      const data = await response.json();
      setRows(data.learnings ?? []);
      setCodes(data.clientReferenceLearnings ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load learnings.");
    } finally {
      setLoaded(true);
    }
  }, []);

  // Reload whenever the pending set changes (a new learning arrives, or
  // one is decided in the pop-up from another tab).
  const pendingKey = [
    ...pendingLearnings.map((l) => l.id),
    ...pendingClientReferenceLearnings.map((l) => l.id),
  ].join(",");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount / when the pending set changes
    void load();
  }, [load, pendingKey]);

  async function setStatus(kind: Entry["kind"], id: string, status: "rejected" | "pending") {
    await fetch(kind === "checklist" ? `/api/learnings/${id}` : `/api/learnings/client-context/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await Promise.all([load(), reloadLearnings()]);
  }

  const entries: Entry[] = useMemo(
    () =>
      [
        ...rows.map((row) => ({ kind: "checklist" as const, row })),
        ...codes.map((row) => ({ kind: "code" as const, row })),
      ].sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt)),
    [rows, codes]
  );

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, accepted: 0, rejected: 0 };
    for (const e of entries) {
      if (e.row.status in c) c[e.row.status as Tab] += 1;
    }
    return c;
  }, [entries]);

  const q = query.trim().toLowerCase();
  const visible = entries.filter((e) => {
    if (e.row.status !== tab) return false;
    if (!q) return true;
    const text =
      e.kind === "code"
        ? `${e.row.code} ${e.row.title} ${e.row.sourceControlName} ${e.row.sourceApplicationId}`
        : `${e.row.headline ?? ""} ${e.row.content} ${e.row.suggestedTaskText} ${e.row.sourceApplicationId} ${e.row.suggestedCategory}`;
    return text.toLowerCase().includes(q);
  });

  return (
    <HubShell title="Learnings" progress={progress}>
      <div className="h-full overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: T.text }}>
                Learning hub
              </h1>
              <p className="mt-0.5 text-[13px]" style={{ color: T.muted }}>
                What Control Governor learned from your checklist changes. Approved learnings shape future checklists.
              </p>
            </div>
            <label className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.faint }}>
                <Icon d={I.search} size={14} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search learnings…"
                className="w-64 rounded-md border bg-white py-1.5 pl-8 pr-3 text-[13px] outline-none"
                style={{ borderColor: T.border, color: T.text }}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-5 border-b text-[13.5px]" style={{ borderColor: T.border }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="-mb-px flex items-center gap-1.5 border-b-2 pb-2 font-medium"
                style={{
                  borderColor: tab === t.key ? T.teal : "transparent",
                  color: tab === t.key ? T.text : T.muted,
                }}
              >
                {t.label}
                <span
                  className="rounded-full px-1.5 text-[11px] tabular-nums"
                  style={{
                    background: t.key === "pending" && counts.pending ? T.orangeSoft : "#eef1f4",
                    color: t.key === "pending" && counts.pending ? T.orange : T.muted,
                  }}
                >
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          {error ? (
            <p className="mt-4 text-[13px]" style={{ color: T.red }}>{error}</p>
          ) : !loaded ? (
            <p className="mt-4 text-[13px]" style={{ color: T.muted }}>Loading…</p>
          ) : visible.length === 0 ? (
            <div className="mt-4 rounded-[10px] border border-dashed p-8 text-center text-[13.5px]" style={{ borderColor: T.border, color: T.muted }}>
              {q
                ? "No learnings match this search."
                : tab === "pending"
                  ? "Nothing waiting for approval. New learnings appear here and in the pop-up as you add notes to checklists."
                  : tab === "accepted"
                    ? "No approved learnings yet."
                    : "No denied learnings."}
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((entry) => (
                <LearningItem
                  key={`${entry.kind}-${entry.row.id}`}
                  entry={entry}
                  onApprove={async (scope) => {
                    if (entry.kind === "code") {
                      await respondToClientReferenceLearning(entry.row.id, "accepted");
                    } else {
                      await respondToLearning(entry.row.id, { status: "accepted", ...scope });
                    }
                    await load();
                  }}
                  onDeny={async () => {
                    if (entry.kind === "code") {
                      await respondToClientReferenceLearning(entry.row.id, "rejected");
                    } else {
                      await respondToLearning(entry.row.id, { status: "rejected" });
                    }
                    await load();
                  }}
                  onRevoke={() => setStatus(entry.kind, entry.row.id, "rejected")}
                  onReopen={() => setStatus(entry.kind, entry.row.id, "pending")}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </HubShell>
  );
}
