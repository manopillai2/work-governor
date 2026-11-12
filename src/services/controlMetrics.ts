import type { ComplianceControl, Note } from "./commandEngine";

// Pure per-control helpers shared by the New UI (dashboard, controls
// matrix, cards) and the executive PDF, so every surface counts the
// same way. Re-exported from components/hub/hubUi for the UI.

export const activeTasks = (c: ComplianceControl) => c.nextTasks.filter((t) => !t.irrelevant);

export function taskStats(controls: ComplianceControl[]) {
  const tasks = controls.flatMap(activeTasks);
  const done = tasks.filter((t) => t.completed).length;
  const evidenced = tasks.filter((t) => !t.completed && t.notes.length > 0).length;
  return { total: tasks.length, done, evidenced, open: tasks.length - done - evidenced };
}

// Same definition as AppStateProvider's progress.needsAttention.
export const needsAttention = (c: ComplianceControl) =>
  c.controlStatus === "On Hold" || c.checklistStatus === "Needs Revision";

export const evidenceNotes = (c: ComplianceControl) =>
  [...c.notes, ...c.nextTasks.flatMap((t) => t.notes)].filter((n) => n.sourceKind !== "manual");

export function sourceFiles(notes: Note[]) {
  return [...new Set(notes.map((n) => n.sourceDocumentFilename).filter(Boolean))] as string[];
}

// "IS03 - password application" -> "IS03"
export const clientCode = (c: ComplianceControl) => c.clientContext.split(/\s+-\s+/)[0]?.trim() || "—";

// The "control type" a control belongs to across applications: its
// client control code (IS02, CM11...) when set, otherwise its global
// reference, otherwise its own name. Used by the dashboard heat map,
// the controls matrix and the executive PDF.
export function controlTypeKey(c: ComplianceControl): string {
  const code = clientCode(c);
  if (code !== "—") return code;
  return c.globalControlReference.trim() || c.name;
}
