"use client";

// Asks before creating a second control of the same control type on
// one application (see services/controlTypeConflicts). Shown by
// AppStateProvider between the assistant's reply and applying it.

import { useEffect } from "react";

import type { ControlTypeConflict } from "@/services/controlTypeConflicts";

export type ConflictChoice = "keepAll" | "onePerType" | "cancel";

export default function ControlTypeConflictModal({
  conflict,
  onChoose,
}: {
  conflict: ControlTypeConflict;
  onChoose: (choice: ConflictChoice) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChoose("cancel");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChoose]);

  const isAdd = conflict.kind === "add";
  const dropped = conflict.groups.reduce((n, g) => n + g.incoming.length - 1, 0);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,30,45,0.45)] p-4" onClick={() => onChoose("cancel")}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="control-type-conflict-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-[#dfe4ea] bg-white p-5 text-[#1b2430] shadow-2xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e5730f]">Same control type</p>
        <h4 id="control-type-conflict-title" className="mt-1 text-[17px] font-semibold">
          {isAdd ? `${conflict.applicationName} already has this control type` : `Duplicate control types for ${conflict.applicationName}`}
        </h4>
        <p className="mt-1.5 text-[13px] leading-6 text-[#3c4652]">
          {isAdd
            ? "Adding it creates a second control of the same type on this application. Is that intended (for example a separate firefighter or privileged access review)?"
            : "These listed controls share a control type, so the application would get more than one control of that type. Is that intended?"}
        </p>

        <ul className="mt-3 space-y-2">
          {conflict.groups.map((g) => (
            <li key={g.code} className="rounded-lg border border-[#e3e8ee] bg-[#f8fafc] p-3 text-[12.5px]">
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-[#e2f2f5] px-1.5 py-[1px] font-mono text-[11px] font-semibold text-[#0f7d8c]">{g.code}</span>
                <span className="font-medium capitalize">{g.title}</span>
              </span>
              {g.existing.length ? (
                <p className="mt-1.5 text-[#6b7684]">
                  Already on the application:
                  {g.existing.map((n) => (
                    <span key={n} className="block text-[#1b2430]">• {n}</span>
                  ))}
                </p>
              ) : null}
              <p className="mt-1.5 text-[#6b7684]">
                {isAdd ? "Being added:" : "Listed:"}
                {g.incoming.map((n, i) => (
                  <span key={`${n}-${i}`} className="block text-[#1b2430]">• {n}</span>
                ))}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onChoose("cancel")} className="rounded-lg border border-[#dfe4ea] px-3 py-2 text-[13px] font-medium text-[#3c4652] hover:bg-[#eef1f4]">
            {isAdd ? "Don't add it" : "Cancel"}
          </button>
          {!isAdd ? (
            <button type="button" onClick={() => onChoose("onePerType")} className="rounded-lg border border-[#0f7d8c] px-3 py-2 text-[13px] font-medium text-[#0f7d8c] hover:bg-[#e2f2f5]">
              Keep one per type{dropped ? ` (skip ${dropped})` : ""}
            </button>
          ) : null}
          <button type="button" onClick={() => onChoose("keepAll")} className="rounded-lg bg-[#0f7d8c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0c6b78]">
            {isAdd ? `Yes, add another ${conflict.groups[0]?.code}` : "Yes, keep all"}
          </button>
        </div>
      </div>
    </div>
  );
}
