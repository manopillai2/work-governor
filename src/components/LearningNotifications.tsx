"use client";

// The "New learning" pop-up: one short card at a time -- a headline,
// one line of why, what it would add to future checklists -- with
// Approve / Deny, and Snooze / "Review in Learning hub" to deal with it
// later. Scope (framework / hosting) and a note are tucked under
// "Details". Everything here is also on the Learnings page (/learnings),
// where the pop-up stays out of the way.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type PendingLearning = {
  id: string;
  headline?: string;
  content: string;
  suggestedTaskText: string;
  suggestedCategory: string;
  framework: string | null;
  hosting: string | null;
  status: string;
  sourceApplicationId: string;
  sourceControlId: string;
  sourceChangeType: string;
  sourceTaskText: string;
  sourceReason: string;
  snoozedUntil?: string | null;
  reviewInHub?: boolean;
  createdAt: string;
  respondedAt: string | null;
};

export type LearningResponse = {
  status: "accepted" | "rejected";
  framework?: string | null;
  hosting?: string | null;
  note?: string;
};

export type PendingClientReferenceLearning = {
  id: string;
  code: string;
  title: string;
  status: string;
  sourceApplicationId: string;
  sourceControlId: string;
  sourceControlName: string;
  sourceQuote: string;
  snoozedUntil?: string | null;
  reviewInHub?: boolean;
  createdAt: string;
  respondedAt: string | null;
};

type ParkAction = { snoozeHours: number } | { reviewInHub: true };

type LearningNotificationsProps = {
  learnings: PendingLearning[];
  onRespond: (
    id: string,
    response: LearningResponse
  ) => void | Promise<void>;

  clientReferenceLearnings?: PendingClientReferenceLearning[];
  onRespondClientReference?: (
    id: string,
    status: "accepted" | "rejected"
  ) => void | Promise<void>;

  onPark?: (
    kind: "checklist" | "code",
    id: string,
    action: ParkAction
  ) => void | Promise<void>;
};

export const FRAMEWORK_OPTIONS = ["Any", "SOX", "PCI DSS"];
export const HOSTING_OPTIONS = [
  "Any",
  "SaaS",
  "PaaS",
  "IaaS",
  "On-premises",
];

const SNOOZE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "1 day", hours: 24 },
  { label: "1 week", hours: 24 * 7 },
];

// Older learnings have no headline: use the first sentence, trimmed.
export function learningHeadline(learning: {
  headline?: string;
  content: string;
  suggestedTaskText: string;
}): string {
  const source =
    learning.headline?.trim() ||
    learning.content.split(/(?<=[.!?])\s/)[0] ||
    learning.suggestedTaskText;
  return source.length > 90
    ? `${source.slice(0, 87).trimEnd()}…`
    : source;
}

// The "why" line, only when a real headline exists (otherwise the
// headline already is the content's first sentence).
export function learningWhy(learning: {
  headline?: string;
  content: string;
}): string {
  return learning.headline?.trim() ? learning.content : "";
}

// Hidden from the pop-up: snoozed for now, or parked on the page.
export function isParked(item: {
  snoozedUntil?: string | null;
  reviewInHub?: boolean;
}): boolean {
  if (item.reviewInHub) return true;
  return Boolean(
    item.snoozedUntil &&
      new Date(item.snoozedUntil).getTime() > Date.now()
  );
}

export function scopeLabel(
  framework: string | null,
  hosting: string | null
): string {
  return `${framework || "Any framework"} · ${hosting ? `${hosting} apps` : "any hosting"}`;
}

function SnoozeMenu({
  onSnooze,
  disabled,
}: {
  onSnooze: (hours: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
      >
        Snooze ▾
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-28 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {SNOOZE_OPTIONS.map((option) => (
            <button
              key={option.hours}
              type="button"
              onClick={() => {
                setOpen(false);
                onSnooze(option.hours);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CardShell({
  tone,
  label,
  from,
  position,
  onPrev,
  onNext,
  children,
}: {
  tone: "indigo" | "amber";
  label: string;
  from: string;
  position: string;
  onPrev?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}) {
  const chip =
    tone === "indigo"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-amber-100 text-amber-800";
  const border =
    tone === "indigo" ? "border-indigo-200" : "border-amber-200";

  return (
    <div
      role="dialog"
      aria-label={label}
      className={`w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border ${border} bg-white p-4 shadow-xl`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${chip}`}
        >
          {label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
          from {from}
        </span>
        {onPrev || onNext ? (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              aria-label="Previous learning"
              className="rounded px-1 hover:bg-slate-100 disabled:opacity-30"
            >
              ‹
            </button>
            <span className="tabular-nums">{position}</span>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Next learning"
              className="rounded px-1 hover:bg-slate-100 disabled:opacity-30"
            >
              ›
            </button>
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ActionRow({
  busy,
  onApprove,
  onDeny,
  onSnooze,
  onHub,
}: {
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onSnooze: (hours: number) => void;
  onHub: () => void;
}) {
  return (
    <>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDeny}
          className="flex-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
        >
          Deny
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <SnoozeMenu onSnooze={onSnooze} disabled={busy} />
        <button
          type="button"
          disabled={busy}
          onClick={onHub}
          className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
        >
          Review in Learning hub →
        </button>
      </div>
    </>
  );
}

function LearningCard({
  learning,
  nav,
  onRespond,
  onPark,
}: {
  learning: PendingLearning;
  nav: { position: string; onPrev?: () => void; onNext?: () => void };
  onRespond: (
    id: string,
    response: LearningResponse
  ) => void | Promise<void>;
  onPark: (action: ParkAction) => void;
}) {
  const [framework, setFramework] = useState(
    learning.framework ?? "Any"
  );
  const [hosting, setHosting] = useState(
    learning.hosting ?? "Any"
  );
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(false);

  async function respond(status: "accepted" | "rejected") {
    setBusy(true);
    try {
      await onRespond(learning.id, {
        status,
        framework:
          status === "accepted"
            ? framework === "Any"
              ? null
              : framework
            : undefined,
        hosting:
          status === "accepted"
            ? hosting === "Any"
              ? null
              : hosting
            : undefined,
        note: note.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  const why = learningWhy(learning);
  const isRemoval = learning.sourceChangeType === "REMOVED";

  return (
    <CardShell
      tone="indigo"
      label="New learning"
      from={learning.sourceApplicationId}
      {...nav}
    >
      <p className="mt-2.5 text-[15px] font-semibold leading-snug text-slate-900">
        {learningHeadline(learning)}
      </p>

      {why ? (
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">
          {why}
        </p>
      ) : null}

      {learning.suggestedTaskText ? (
        <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
            {isRemoval
              ? "Future checklists will reconsider"
              : `Future checklists will add · ${learning.suggestedCategory}`}
          </p>
          <p className="mt-0.5 line-clamp-3 text-[12.5px] leading-5 text-slate-700">
            {learning.suggestedTaskText}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between text-[11.5px] text-slate-500">
        <span>
          Applies to:{" "}
          <span className="font-medium text-slate-700">
            {scopeLabel(
              framework === "Any" ? null : framework,
              hosting === "Any" ? null : hosting
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="font-medium text-indigo-600 hover:underline"
        >
          {showDetails ? "Hide details" : "Details"}
        </button>
      </div>

      {showDetails ? (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          {learning.sourceReason ? (
            <p className="text-[11.5px] leading-5 text-slate-500">
              <span className="font-medium text-slate-600">
                Learned from your note:
              </span>{" "}
              {learning.sourceReason}
            </p>
          ) : null}
          <div className="flex gap-2">
            <label className="flex-1 text-[11px] text-slate-500">
              Framework
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
              >
                {FRAMEWORK_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-[11px] text-slate-500">
              Hosting
              <select
                value={hosting}
                onChange={(e) => setHosting(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
              >
                {HOSTING_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            rows={2}
            className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs leading-5 text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-500"
          />
        </div>
      ) : null}

      <ActionRow
        busy={busy}
        onApprove={() => void respond("accepted")}
        onDeny={() => void respond("rejected")}
        onSnooze={(hours) => onPark({ snoozeHours: hours })}
        onHub={() => onPark({ reviewInHub: true })}
      />
    </CardShell>
  );
}

function ClientReferenceLearningCard({
  learning,
  nav,
  onRespond,
  onPark,
}: {
  learning: PendingClientReferenceLearning;
  nav: { position: string; onPrev?: () => void; onNext?: () => void };
  onRespond: (
    id: string,
    status: "accepted" | "rejected"
  ) => void | Promise<void>;
  onPark: (action: ParkAction) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  async function respond(status: "accepted" | "rejected") {
    setBusy(true);
    try {
      await onRespond(learning.id, status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CardShell
      tone="amber"
      label="New control code"
      from={learning.sourceApplicationId}
      {...nav}
    >
      <p className="mt-2.5 text-[15px] font-semibold leading-snug text-slate-900">
        {learning.code} — {learning.title}
      </p>
      <p className="mt-1 text-[13px] leading-5 text-slate-600">
        Add this code to your control reference list and set it on{" "}
        <span className="font-medium text-slate-700">
          {learning.sourceControlName}
        </span>
        ?
      </p>

      {learning.sourceQuote ? (
        <div className="mt-2 flex items-center justify-end text-[11.5px]">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="font-medium text-indigo-600 hover:underline"
          >
            {showDetails ? "Hide details" : "Where it came from"}
          </button>
        </div>
      ) : null}
      {showDetails ? (
        <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-2 text-[11.5px] italic leading-5 text-slate-600">
          &quot;{learning.sourceQuote}&quot;
        </p>
      ) : null}

      <ActionRow
        busy={busy}
        onApprove={() => void respond("accepted")}
        onDeny={() => void respond("rejected")}
        onSnooze={(hours) => onPark({ snoozeHours: hours })}
        onHub={() => onPark({ reviewInHub: true })}
      />
    </CardShell>
  );
}

type Item =
  | { kind: "code"; item: PendingClientReferenceLearning }
  | { kind: "checklist"; item: PendingLearning };

export default function LearningNotifications({
  learnings,
  onRespond,
  clientReferenceLearnings = [],
  onRespondClientReference,
  onPark,
}: LearningNotificationsProps) {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  // Re-check snoozes once a minute so an expired snooze reappears.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const items: Item[] = [
    ...clientReferenceLearnings
      .filter((item) => !isParked(item))
      .map((item) => ({ kind: "code" as const, item })),
    ...learnings
      .filter((item) => !isParked(item))
      .map((item) => ({ kind: "checklist" as const, item })),
  ];

  const waitingTotal =
    learnings.length + clientReferenceLearnings.length;

  // The Learnings page lists everything itself.
  if (items.length === 0 || pathname?.startsWith("/learnings")) {
    return null;
  }

  const position = Math.min(index, items.length - 1);
  const current = items[position];
  const nav = {
    position: `${position + 1} of ${items.length}`,
    onPrev: position > 0 ? () => setIndex(position - 1) : undefined,
    onNext:
      position < items.length - 1
        ? () => setIndex(position + 1)
        : undefined,
  };
  const others = waitingTotal - 1;

  return (
    // Below modal windows (z-[48] / z-50): a dialog the user opened wins.
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5">
      {current.kind === "code" ? (
        <ClientReferenceLearningCard
          key={current.item.id}
          learning={current.item}
          nav={nav}
          onRespond={onRespondClientReference ?? (() => {})}
          onPark={(action) =>
            void onPark?.("code", current.item.id, action)
          }
        />
      ) : (
        <LearningCard
          key={current.item.id}
          learning={current.item}
          nav={nav}
          onRespond={onRespond}
          onPark={(action) =>
            void onPark?.("checklist", current.item.id, action)
          }
        />
      )}
      <Link
        href="/learnings?ui=hub"
        className="rounded-full bg-white/95 px-3 py-1 text-[11.5px] font-medium text-indigo-700 shadow ring-1 ring-indigo-100 hover:bg-indigo-50"
      >
        {others > 0
          ? `${others} more waiting · Open Learning hub`
          : "Open Learning hub"}
      </Link>
    </div>
  );
}
