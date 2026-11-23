// Rule logic (Argos monitoring rule) lifecycle for one control.
//
// The rule text itself stays in control.argosObjective (Markdown), so
// every existing reader -- prompts, exports, the readiness profile --
// keeps working. This state adds what the text alone can't carry:
//
//   draft     -- keeps developing: rebuilt automatically when new
//                testing data or a readiness profile arrives, and
//                editable through its assistant.
//   approved  -- reviewed and accepted: automatic rebuilds no longer
//                overwrite it; a rebuild is held as `pendingUpdate`
//                for the user to apply ("Keep developing") or dismiss.
//   locked    -- final: no rebuilds, no edits; new data only raises
//                `newDataSinceLock`. Unlock returns it to draft.
//
// Shared by the server (/api/rule-logic) and the UI.

export type RuleStatus = "draft" | "approved" | "locked";
export type RuleReadiness = "not_ready" | "partial" | "ready";
export type RuleAuthor = "auto" | "assistant" | "user";

export type RuleVersion = {
  version: number;
  at: string;
  by: RuleAuthor;
  summary: string;
  spec: string;
};

export type RuleChatTurn = {
  role: "user" | "assistant";
  content: string;
  at: string;
};

export type RuleDraft = {
  spec: string;
  readiness: RuleReadiness;
  stillNeeded: string[];
  summary: string;
  at: string;
};

export type RuleLogicState = {
  status: RuleStatus;
  version: number;
  readiness: RuleReadiness;
  stillNeeded: string[];
  updatedAt: string;
  updatedBy: RuleAuthor;
  // What changed in the current version, in one line.
  summary: string;
  history: RuleVersion[];
  chat: RuleChatTurn[];
  // A rebuild made while the rule was approved, waiting for review.
  pendingUpdate: RuleDraft | null;
  // New evidence / data arrived after the rule was locked.
  newDataSinceLock: boolean;
};

export const RULE_HISTORY_LIMIT = 10;
export const RULE_CHAT_LIMIT = 30;

export const RULE_STATUS_LABEL: Record<RuleStatus, string> = {
  draft: "Developing",
  approved: "Approved",
  locked: "Locked",
};

export const RULE_READINESS_LABEL: Record<RuleReadiness, string> = {
  not_ready: "Not enough information",
  partial: "Partly built",
  ready: "Ready for review",
};

const STATUSES: RuleStatus[] = ["draft", "approved", "locked"];
const READINESS: RuleReadiness[] = ["not_ready", "partial", "ready"];

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function readRuleLogic(raw: unknown): RuleLogicState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const status = STATUSES.includes(r.status as RuleStatus)
    ? (r.status as RuleStatus)
    : "draft";
  const readiness = READINESS.includes(r.readiness as RuleReadiness)
    ? (r.readiness as RuleReadiness)
    : "not_ready";
  const pending = r.pendingUpdate as Record<string, unknown> | null;

  return {
    status,
    version: typeof r.version === "number" ? r.version : 0,
    readiness,
    stillNeeded: strings(r.stillNeeded),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
    updatedBy: (["auto", "assistant", "user"] as const).includes(r.updatedBy as RuleAuthor)
      ? (r.updatedBy as RuleAuthor)
      : "auto",
    summary: typeof r.summary === "string" ? r.summary : "",
    history: Array.isArray(r.history) ? (r.history as RuleVersion[]).slice(-RULE_HISTORY_LIMIT) : [],
    chat: Array.isArray(r.chat) ? (r.chat as RuleChatTurn[]).slice(-RULE_CHAT_LIMIT) : [],
    pendingUpdate:
      pending && typeof pending.spec === "string"
        ? {
            spec: pending.spec,
            readiness: READINESS.includes(pending.readiness as RuleReadiness)
              ? (pending.readiness as RuleReadiness)
              : "partial",
            stillNeeded: strings(pending.stillNeeded),
            summary: typeof pending.summary === "string" ? pending.summary : "",
            at: typeof pending.at === "string" ? pending.at : "",
          }
        : null,
    newDataSinceLock: r.newDataSinceLock === true,
  };
}

// Automatic rebuilds may only rewrite a rule that is still developing.
export function ruleAcceptsAutoUpdate(state: RuleLogicState | null | undefined): boolean {
  return !state || state.status === "draft";
}

export function emptyRuleLogic(): RuleLogicState {
  return {
    status: "draft",
    version: 0,
    readiness: "not_ready",
    stillNeeded: [],
    updatedAt: "",
    updatedBy: "auto",
    summary: "",
    history: [],
    chat: [],
    pendingUpdate: null,
    newDataSinceLock: false,
  };
}

// A new version of the rule text, keeping the previous one in history.
export function withNewVersion(
  state: RuleLogicState | null | undefined,
  previousSpec: string,
  draft: RuleDraft,
  by: RuleAuthor
): RuleLogicState {
  const base = state ?? emptyRuleLogic();
  const history =
    previousSpec.trim() && base.version > 0
      ? [
          ...base.history,
          {
            version: base.version,
            at: base.updatedAt,
            by: base.updatedBy,
            summary: base.summary || "Initial outline",
            spec: previousSpec,
          },
        ].slice(-RULE_HISTORY_LIMIT)
      : base.history;
  return {
    ...base,
    status: "draft",
    version: base.version + 1,
    readiness: draft.readiness,
    stillNeeded: draft.stillNeeded,
    updatedAt: draft.at,
    updatedBy: by,
    summary: draft.summary,
    history,
    pendingUpdate: null,
  };
}
