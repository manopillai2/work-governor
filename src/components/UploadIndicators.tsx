"use client";

// Read-only status indicators per control: is evidence on file, and is
// testing data on file (see services/uploads.ts). Purely informational
// -- a check chip when present, a muted dashed chip when missing; the
// tooltip lists how many notes and which files are behind it.

import type { ComplianceControl } from "@/services/commandEngine";
import { controlUploadState, type UploadKindSummary } from "@/services/uploads";

const KINDS = [
  { key: "evidence", short: "E", label: "Evidence", fg: "#0f8a5f", bg: "#e6f5ee", border: "#b5e0cb" },
  { key: "testing", short: "T", label: "Testing data", fg: "#0f7d8c", bg: "#e2f2f5", border: "#afd9e0" },
] as const;

function describe(label: string, s: UploadKindSummary) {
  if (!s.uploaded) return `${label}: not uploaded`;
  const files = s.files.length ? ` from ${s.files.length} file${s.files.length === 1 ? "" : "s"} (${s.files.join(", ")})` : "";
  return `${label}: present — ${s.notes} note${s.notes === 1 ? "" : "s"}${files}`;
}

export default function UploadIndicators({
  control,
  compact = false,
  mini = false,
}: {
  control: Pick<ComplianceControl, "notes" | "nextTasks">;
  compact?: boolean;
  // Letter badges only ("E" / "T") for tight rows such as tiles; the
  // tooltip still spells out the kind and what is on file.
  mini?: boolean;
}) {
  const state = controlUploadState(control);
  if (mini) {
    return (
      <span className="inline-flex items-center gap-1">
        {KINDS.map(({ key, short, label, fg }) => {
          const s = state[key];
          const title = describe(label, s);
          return (
            <span
              key={key}
              title={title}
              aria-label={title}
              className="inline-flex h-[17px] w-[17px] cursor-default select-none items-center justify-center rounded-[4px] border text-[9.5px] font-bold"
              style={
                s.uploaded
                  ? { color: "#fff", background: fg, borderColor: fg }
                  : { color: "#a3acb7", background: "transparent", borderColor: "#cfd5dc", borderStyle: "dashed" }
              }
            >
              {short}
            </span>
          );
        })}
      </span>
    );
  }
  const icon = compact ? 11 : 12;
  return (
    <span className="inline-flex items-center gap-1.5">
      {KINDS.map(({ key, label, fg, bg, border }) => {
        const s = state[key];
        const title = describe(label, s);
        return (
          <span
            key={key}
            title={title}
            aria-label={title}
            className={`inline-flex cursor-default select-none items-center gap-1 whitespace-nowrap rounded-[5px] border font-medium ${
              compact ? "px-1.5 py-[1px] text-[10.5px]" : "px-2 py-[2px] text-[11.5px]"
            }`}
            style={
              s.uploaded
                ? { color: fg, background: bg, borderColor: border }
                : { color: "#8a94a0", background: "transparent", borderColor: "#d3d8df", borderStyle: "dashed" }
            }
          >
            {s.uploaded ? (
              <svg width={icon} height={icon} viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" fill={fg} />
                <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width={icon} height={icon} viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="9" fill="none" stroke="#b4bcc6" strokeWidth={2} strokeDasharray="3.5 3" />
              </svg>
            )}
            {label}
          </span>
        );
      })}
    </span>
  );
}
