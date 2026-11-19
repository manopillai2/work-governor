// What the chat shows while the assistant is working: a short, readable
// line about what it is doing right now, instead of echoing the user's
// own message back. The kind of request is read from its wording; each
// kind has a few steps that advance as time passes, so a long request
// visibly moves forward.

export type WorkingKind = "confirm" | "upload" | "email" | "report" | "backup" | "create" | "checklist" | "question" | "update";

const STEPS: Record<WorkingKind, string[]> = {
  confirm: ["Waiting for your confirmation in the dialog…"],
  upload: [
    "Reading the uploaded document…",
    "Pulling out the facts it contains…",
    "Matching them to checklist items…",
    "Writing notes on the matched controls…",
    "Comparing evidence with testing data…",
  ],
  email: [
    "Gathering the open items for this application…",
    "Picking the questions that still need answers…",
    "Drafting the email…",
    "Tidying up the wording…",
  ],
  report: ["Collecting progress across every application…", "Building the report…", "Finishing the export…"],
  backup: ["Taking a snapshot of your workspace…", "Saving the backup…"],
  create: ["Setting up the application…", "Mapping its controls…", "Preparing starting checklists…", "Saving everything…"],
  checklist: [
    "Reviewing the control and its context…",
    "Working out which checklist items apply…",
    "Updating the checklist…",
    "Recording the reasons in the change log…",
  ],
  question: ["Looking through your workspace…", "Checking the relevant controls and notes…", "Putting the answer together…"],
  update: [
    "Reading your request…",
    "Checking your applications and controls…",
    "Working out the changes…",
    "Applying the update…",
    "Double-checking the result…",
  ],
};

// Seconds after which each successive step is shown.
const STEP_AT = [0, 3, 8, 15, 25];
const SLOW_AFTER = 45;

// While the app waits on a confirmation dialog it sets the request to
// this text (see AppStateProvider), so the chat says so.
export const AWAITING_CONFIRMATION = "Awaiting your confirmation";

export function workingKind(request: string): WorkingKind {
  const r = request.trim().toLowerCase();
  if (r === AWAITING_CONFIRMATION.toLowerCase()) return "confirm";
  if (/^attached\b/.test(r)) return "upload";
  if (/\bemail\b|\bopen questions\b|\bprep\b/.test(r)) return "email";
  if (/\bexport\b|\breport\b|\bpdf\b|executive summary/.test(r)) return "report";
  if (/\bbackups?\b|\bback up\b|\broll ?back\b|\brestore\b/.test(r)) return "backup";
  if (/^(create|add|new|set up)\b.*\b(application|app|system)\b/.test(r)) return "create";
  if (/\bchecklists?\b|\bregenerate\b|\btasks?\b|\birrelevant\b|\bn\/a\b/.test(r)) return "checklist";
  if (r.endsWith("?") || /^(what|why|how|which|who|when|where|is|are|does|do|can|could|show|list|tell)\b/.test(r)) return "question";
  return "update";
}

// The line to show `seconds` into the request.
export function workingStatus(request: string, seconds: number): string {
  if (workingKind(request) === "confirm") return STEPS.confirm[0];
  if (seconds >= SLOW_AFTER) return "Still working — this one is taking a little longer than usual…";
  const steps = STEPS[workingKind(request)];
  let index = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (seconds >= STEP_AT[i]) index = i;
  }
  return steps[index];
}
