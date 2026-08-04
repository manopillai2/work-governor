"use client";

import { useState } from "react";

export type PendingLearning = {
  id: string;
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
  createdAt: string;
  respondedAt: string | null;
};

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
};

const FRAMEWORK_OPTIONS = ["Any", "SOX", "PCI DSS"];
const HOSTING_OPTIONS = [
  "Any",
  "SaaS",
  "PaaS",
  "IaaS",
  "On-premises",
];

function LearningCard({
  learning,
  onRespond,
}: {
  learning: PendingLearning;
  onRespond: (
    id: string,
    response: LearningResponse
  ) => void | Promise<void>;
}) {
  const [framework, setFramework] = useState(
    learning.framework ?? "Any"
  );
  const [hosting, setHosting] = useState(
    learning.hosting ?? "Any"
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function respond(
    status: "accepted" | "rejected"
  ) {
    setIsSubmitting(true);

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
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-indigo-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
          New Learning
        </span>

        <span className="text-[10px] text-slate-400">
          from {learning.sourceApplicationId}
        </span>
      </div>

      <p className="mt-2 text-sm leading-5 text-slate-700">
        {learning.content}
      </p>

      {learning.suggestedTaskText ? (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600">
          <span className="font-medium text-slate-500">
            Suggested checklist item:
          </span>{" "}
          {learning.suggestedTaskText}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <label className="flex-1 text-xs text-slate-500">
          Framework
          <select
            value={framework}
            onChange={(event) =>
              setFramework(event.target.value)
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            {FRAMEWORK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1 text-xs text-slate-500">
          Hosting
          <select
            value={hosting}
            onChange={(event) =>
              setHosting(event.target.value)
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            {HOSTING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder='Optional note, e.g. "good, but only applicable for IaaS applications"'
        rows={2}
        className="mt-3 w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs leading-5 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
      />

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => respond("rejected")}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reject
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => respond("accepted")}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function ClientReferenceLearningCard({
  learning,
  onRespond,
}: {
  learning: PendingClientReferenceLearning;
  onRespond: (
    id: string,
    status: "accepted" | "rejected"
  ) => void | Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function respond(
    status: "accepted" | "rejected"
  ) {
    setIsSubmitting(true);

    try {
      await onRespond(learning.id, status);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-amber-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          New Control Code
        </span>

        <span className="text-[10px] text-slate-400">
          from {learning.sourceApplicationId}
        </span>
      </div>

      <p className="mt-2 text-sm leading-5 text-slate-700">
        <span className="font-semibold">
          {learning.code}
        </span>{" "}
        — {learning.title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        On control:{" "}
        {learning.sourceControlName}
      </p>

      {learning.sourceQuote ? (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs italic leading-5 text-slate-600">
          &quot;{learning.sourceQuote}&quot;
        </div>
      ) : null}

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Accepting adds this to the client control
        reference table for future matching, and
        fills it in on the control above.
      </p>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => respond("rejected")}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reject
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => respond("accepted")}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

export default function LearningNotifications({
  learnings,
  onRespond,
  clientReferenceLearnings = [],
  onRespondClientReference,
}: LearningNotificationsProps) {
  if (
    learnings.length === 0 &&
    clientReferenceLearnings.length === 0
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
      {clientReferenceLearnings.map((learning) => (
        <ClientReferenceLearningCard
          key={learning.id}
          learning={learning}
          onRespond={
            onRespondClientReference ??
            (() => {})
          }
        />
      ))}

      {learnings.map((learning) => (
        <LearningCard
          key={learning.id}
          learning={learning}
          onRespond={onRespond}
        />
      ))}
    </div>
  );
}
