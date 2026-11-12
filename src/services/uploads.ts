import type { ComplianceControl, Note } from "./commandEngine";

// Whether a control has evidence and/or testing data uploaded, derived
// from the notes that uploads leave on the control and its checklist
// items (sourceKind "evidence" / "data"). Notes whose source document
// was later deleted don't count -- the upload is gone.
//
// Internally the testing-data kind is still stored as "data"; only the
// user-facing label is "Testing data".

export type UploadKindSummary = {
  uploaded: boolean;
  notes: number;
  files: string[];
};

export type ControlUploadState = {
  evidence: UploadKindSummary;
  testing: UploadKindSummary;
};

function summarize(notes: Note[]): UploadKindSummary {
  const live = notes.filter((n) => !n.documentDeleted);
  const files = [
    ...new Set(
      live
        .map((n) => n.sourceDocumentFilename)
        .filter((f): f is string => Boolean(f))
    ),
  ];
  return { uploaded: live.length > 0, notes: live.length, files };
}

export function controlUploadState(
  control: Pick<ComplianceControl, "notes" | "nextTasks">
): ControlUploadState {
  const all = [
    ...control.notes,
    ...control.nextTasks.flatMap((t) => t.notes),
  ];
  return {
    evidence: summarize(all.filter((n) => n.sourceKind === "evidence")),
    testing: summarize(all.filter((n) => n.sourceKind === "data")),
  };
}

export type UploadFilterValue =
  | "Evidence uploaded"
  | "Testing data uploaded"
  | "Both uploaded"
  | "Nothing uploaded";

export const UPLOAD_FILTER_OPTIONS: UploadFilterValue[] = [
  "Evidence uploaded",
  "Testing data uploaded",
  "Both uploaded",
  "Nothing uploaded",
];

export function matchesUploadFilter(
  control: ComplianceControl,
  value: UploadFilterValue
): boolean {
  const { evidence, testing } = controlUploadState(control);
  switch (value) {
    case "Evidence uploaded":
      return evidence.uploaded;
    case "Testing data uploaded":
      return testing.uploaded;
    case "Both uploaded":
      return evidence.uploaded && testing.uploaded;
    case "Nothing uploaded":
      return !evidence.uploaded && !testing.uploaded;
  }
}
