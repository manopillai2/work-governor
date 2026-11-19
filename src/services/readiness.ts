// Control readiness profile: a clean, shareable picture of one control,
// built from the evidence (how the application team says the control is
// done -- context, not proof) checked against the real testing data
// (pulled with the same service account that will run compliance
// monitoring -- the facts). Re-built after every new upload so it keeps
// getting more complete: what's verified, what's only claimed, what
// conflicts, what's missing, and what data / access to ask for next.
//
// Shared by the server (generation, prompt summaries) and the UI.

export type ReadinessStatus =
  | "verified" // the data confirms it
  | "conflict" // the data contradicts the evidence
  | "evidence_only" // claimed in evidence, not yet backed by data
  | "data_only" // in the data, the evidence doesn't mention it
  | "missing" // neither the evidence nor the data covers it yet
  | "not_applicable";

export const READINESS_STATUSES: ReadinessStatus[] = [
  "verified",
  "conflict",
  "evidence_only",
  "data_only",
  "missing",
  "not_applicable",
];

export const STATUS_LABEL: Record<ReadinessStatus, string> = {
  verified: "Verified by data",
  conflict: "Data contradicts evidence",
  evidence_only: "Evidence only",
  data_only: "Data only",
  missing: "Missing",
  not_applicable: "Not applicable",
};

export type ReadinessItem = {
  name: string;
  evidenceSays: string;
  dataShows: string;
  status: ReadinessStatus;
  sources: string[];
  // How to pull it programmatically with the monitoring service account
  // (object / API / query / report).
  retrieval: string;
  // The automated check compliance monitoring should run.
  validationRule: string;
  // Access the service account still needs to retrieve it ("" = none).
  accessNeeded: string;
  gap: string;
};

export type ReadinessSectionKey = "population" | "configuration" | "access";

export type ReadinessSection = {
  key: ReadinessSectionKey;
  title: string;
  items: ReadinessItem[];
};

export type ReadinessRequest = {
  request: string;
  reason: string;
  accessNeeded: string;
  priority: "high" | "medium" | "low";
};

export type ReadinessProfile = {
  version: 1;
  generatedAt: string;
  controlType: string;
  summary: string;
  // The 3-5 things everyone should know, one line each -- shown first.
  keyFindings?: string[];
  howDoneToday: string;
  sections: ReadinessSection[];
  sufficiency: {
    verdict: "sufficient" | "partial" | "insufficient";
    explanation: string;
    missing: string[];
    conflicts: string[];
  };
  nextDataRequests: ReadinessRequest[];
  changesSinceLast: string[];
  sourcesUsed: {
    evidence: string[];
    data: string[];
    // Official documentation pages cited by items (platform reference).
    documentation?: { title: string; url: string }[];
    documentationProduct?: string;
  };
};

// ---------- blueprints ----------
// What each kind of control needs covered. Titles are what everyone
// sees; "cover" is guidance for the analysis.

export type ReadinessBlueprint = {
  label: string;
  population: { title: string; cover: string };
  configuration: { title: string; cover: string };
  access: { title: string; cover: string };
};

const GENERIC: ReadinessBlueprint = {
  label: "Control",
  population: {
    title: "In-scope population",
    cover: "Every population the control must cover (users, accounts, changes, jobs, assets...) and whether the full population is in the data.",
  },
  configuration: {
    title: "Rules & configuration",
    cover: "The settings, rules or process steps the control relies on, at every level they can be set.",
  },
  access: {
    title: "Data access & retrieval",
    cover: "For each population and rule above: where the data comes from, whether the monitoring service account can retrieve it, and what access is missing.",
  },
};

const BLUEPRINTS: Record<string, ReadinessBlueprint> = {
  IS03: {
    label: "Password management",
    population: {
      title: "Identities in scope",
      cover:
        "Every identity type that can authenticate: local/standard users, privileged & admin users, service / integration accounts, API-only users and connected apps / OAuth clients, SSO / federated users (and whether they also have a local password), guest / portal / community users, system and automated-process users. Counts (all vs. active) come from the data.",
    },
    configuration: {
      title: "Password policy layers",
      cover:
        "Every level a password rule can be set, as applicable: org-wide policy, profile-level policies (and which profiles deviate from the standard), user-level exceptions (e.g. password-never-expires, API-only), system / integration accounts, the identity provider / AD / SSO policy for federated users, plus lockout, history, complexity, expiry, MFA and session settings.",
    },
    access: {
      title: "Access to identities & policies",
      cover:
        "For each identity type and policy layer: the object / API / metadata type it comes from, whether the service account can read it today (evidenced by a successful pull), and the exact permission or access still needed (e.g. View Setup, Metadata API, IdP admin read access).",
    },
  },
  IS02: {
    label: "User provisioning",
    population: { title: "Accounts created in scope", cover: "New accounts in the period, by identity type, from the system itself (not a ticket list)." },
    configuration: { title: "Provisioning & approval rules", cover: "Request/approval workflow, who can approve, role/profile assignment rules, automated vs. manual provisioning (e.g. via IdP/SailPoint)." },
    access: { title: "Access to accounts & approvals", cover: "Where creation dates, assigned access and approval records come from, and whether the service account can read them." },
  },
  IS04: {
    label: "User access review (infrastructure)",
    population: { title: "Accounts & entitlements in review scope", cover: "Every account and privileged entitlement on the in-scope infrastructure, from the systems." },
    configuration: { title: "Review process", cover: "Reviewers, frequency, completeness of the review population, how removals are tracked." },
    access: { title: "Access to accounts & review records", cover: "Where entitlements and review results come from, and access still needed." },
  },
  IS05: {
    label: "User access review (application)",
    population: { title: "Users & entitlements in review scope", cover: "Every active user and their roles / profiles / permission sets / groups, from the application." },
    configuration: { title: "Review process", cover: "Reviewers, frequency, the review population vs. the full population, firefighter / privileged handling, how removals are tracked." },
    access: { title: "Access to entitlements & review records", cover: "Where entitlements and review sign-offs come from, and access still needed." },
  },
  IS06: {
    label: "Access termination",
    population: { title: "Terminated people vs. active accounts", cover: "Terminations from the HR source compared with accounts still active, by identity type (including SSO, service and local accounts)." },
    configuration: { title: "Deprovisioning rules", cover: "Timeliness requirement, automated (IdP/SailPoint) vs. manual removal, freeze vs. deactivate." },
    access: { title: "Access to HR & account data", cover: "Where the termination feed and account status/deactivation dates come from, and access still needed." },
  },
  IS07: {
    label: "Access to configuration",
    population: { title: "Users who can change configuration", cover: "Every user holding configuration / admin permissions, from the system." },
    configuration: { title: "Configuration access rules", cover: "Which permissions allow configuration change, who should hold them, approvals." },
    access: { title: "Access to permissions & audit data", cover: "Where permission assignments and setup/audit trails come from, and access still needed." },
  },
  IS08: {
    label: "Segregation of duties",
    population: { title: "Users & role combinations", cover: "Every user and their combined roles / permissions." },
    configuration: { title: "SOD rule set", cover: "The conflicting combinations, mitigating controls and approved exceptions." },
    access: { title: "Access to roles & rule set", cover: "Where assignments and the rule set come from, and access still needed." },
  },
  CM11: {
    label: "Change management",
    population: { title: "Changes in scope", cover: "Every change deployed in the period from the system / pipeline itself, not only the ticketing tool." },
    configuration: { title: "Change rules", cover: "Approval, testing, emergency change handling and their evidence trail." },
    access: { title: "Access to change records", cover: "Where deployments, tickets and approvals come from, and access still needed." },
  },
  CM12: {
    label: "Change management — developer SOD",
    population: { title: "People who can develop and deploy", cover: "Who can change code/config and who can deploy to production." },
    configuration: { title: "Segregation rules", cover: "Which combinations are prohibited and how deployments are restricted." },
    access: { title: "Access to permissions & deployment logs", cover: "Where permissions and deployment history come from, and access still needed." },
  },
  OP21: {
    label: "Batch monitoring",
    population: { title: "Jobs in scope", cover: "Every scheduled job relevant to the control." },
    configuration: { title: "Monitoring & failure handling", cover: "Alerting, failure resolution and who is notified." },
    access: { title: "Access to job history", cover: "Where schedules and run history come from, and access still needed." },
  },
  OP22: {
    label: "Backup",
    population: { title: "Systems & data in backup scope", cover: "Every system / dataset that must be backed up." },
    configuration: { title: "Backup & restore rules", cover: "Schedule, retention, failure handling, restore testing." },
    access: { title: "Access to backup records", cover: "Where backup jobs and results come from, and access still needed." },
  },
  OP23: {
    label: "IT asset validation",
    population: { title: "Assets in scope", cover: "Every asset that should be in the inventory, from discovery sources." },
    configuration: { title: "Inventory rules", cover: "Ownership, reconciliation frequency, handling of unknown assets." },
    access: { title: "Access to inventory & discovery data", cover: "Where the CMDB and discovery data come from, and access still needed." },
  },
};

export function blueprintFor(clientContext: string): ReadinessBlueprint {
  const code = clientContext.trim().slice(0, 4).toUpperCase();
  return BLUEPRINTS[code] ?? GENERIC;
}

// ---------- normalization ----------

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

function normalizeItem(raw: unknown): ReadinessItem | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = str(r.name);
  if (!name) return null;
  const status = READINESS_STATUSES.includes(r.status as ReadinessStatus) ? (r.status as ReadinessStatus) : "missing";
  return {
    name,
    evidenceSays: str(r.evidenceSays),
    dataShows: str(r.dataShows),
    status,
    sources: strList(r.sources),
    retrieval: str(r.retrieval),
    validationRule: str(r.validationRule),
    accessNeeded: str(r.accessNeeded),
    gap: str(r.gap),
  };
}

export function normalizeReadinessProfile(
  raw: unknown,
  blueprint: ReadinessBlueprint,
  sourcesUsed: { evidence: string[]; data: string[] }
): ReadinessProfile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawSections = Array.isArray(r.sections) ? (r.sections as Array<Record<string, unknown>>) : [];
  const keys: ReadinessSectionKey[] = ["population", "configuration", "access"];
  const sections = keys.map((key) => {
    const found = rawSections.find((s) => s?.key === key);
    return {
      key,
      title: blueprint[key].title,
      items: (Array.isArray(found?.items) ? found!.items : []).map(normalizeItem).filter((i): i is ReadinessItem => i !== null),
    };
  });
  const s = (r.sufficiency ?? {}) as Record<string, unknown>;
  const verdict = ["sufficient", "partial", "insufficient"].includes(s.verdict as string)
    ? (s.verdict as ReadinessProfile["sufficiency"]["verdict"])
    : "insufficient";
  const requests = Array.isArray(r.nextDataRequests) ? (r.nextDataRequests as Array<Record<string, unknown>>) : [];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    controlType: blueprint.label,
    summary: str(r.summary),
    keyFindings: strList(r.keyFindings).slice(0, 6),
    howDoneToday: str(r.howDoneToday),
    sections,
    sufficiency: { verdict, explanation: str(s.explanation), missing: strList(s.missing), conflicts: strList(s.conflicts) },
    nextDataRequests: requests
      .map((q) => ({
        request: str(q?.request),
        reason: str(q?.reason),
        accessNeeded: str(q?.accessNeeded),
        priority: (["high", "medium", "low"].includes(q?.priority as string) ? q.priority : "medium") as ReadinessRequest["priority"],
      }))
      .filter((q) => q.request),
    changesSinceLast: strList(r.changesSinceLast),
    sourcesUsed,
  };
}

// Tolerant read of a stored profile (older / partial shapes -> null).
export function readStoredReadiness(raw: unknown): ReadinessProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ReadinessProfile>;
  if (r.version !== 1 || !Array.isArray(r.sections) || !r.sufficiency) return null;
  return r as ReadinessProfile;
}

// ---------- derived views ----------

export function readinessCounts(profile: ReadinessProfile): Record<ReadinessStatus, number> & { applicable: number } {
  const counts = Object.fromEntries(READINESS_STATUSES.map((s) => [s, 0])) as Record<ReadinessStatus, number>;
  for (const section of profile.sections) for (const item of section.items) counts[item.status]++;
  return { ...counts, applicable: READINESS_STATUSES.filter((s) => s !== "not_applicable").reduce((n, s) => n + counts[s], 0) };
}

// Share of applicable items the real data verifies, 0-100.
export function readinessPercent(profile: ReadinessProfile): number {
  const c = readinessCounts(profile);
  return c.applicable === 0 ? 0 : Math.round((c.verified / c.applicable) * 100);
}

// Compact form for the main assistant prompt.
export function summarizeReadinessForPrompt(profile: ReadinessProfile | null | undefined): string {
  if (!profile) return "Not built yet.";
  const c = readinessCounts(profile);
  const open = profile.sections
    .flatMap((s) => s.items.filter((i) => i.status !== "verified" && i.status !== "not_applicable").map((i) => `${s.title}: ${i.name} [${STATUS_LABEL[i.status]}]${i.gap ? ` -- ${i.gap}` : ""}`))
    .slice(0, 12);
  return [
    `Built ${profile.generatedAt.slice(0, 10)}; ${c.verified} of ${c.applicable} items verified by real data; sufficiency: ${profile.sufficiency.verdict}.`,
    profile.summary,
    profile.keyFindings?.length ? `Key findings:\n${profile.keyFindings.map((k) => `- ${k}`).join("\n")}` : "",
    open.length ? `Open items:\n${open.map((o) => `- ${o}`).join("\n")}` : "",
    profile.nextDataRequests.length ? `Next data/access to request:\n${profile.nextDataRequests.slice(0, 6).map((q) => `- [${q.priority}] ${q.request}${q.accessNeeded ? ` (access: ${q.accessNeeded})` : ""}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Plain Markdown for copying into email / tickets / docs.
export function readinessMarkdown(profile: ReadinessProfile, applicationName: string, controlName: string): string {
  const c = readinessCounts(profile);
  const out: string[] = [
    `# ${controlName}`,
    `${applicationName} · ${profile.controlType} · readiness ${readinessPercent(profile)}% (${c.verified} of ${c.applicable} verified by data) · updated ${profile.generatedAt.slice(0, 10)}`,
    "",
    profile.summary,
    ...(profile.keyFindings?.length ? ["", "## Key findings", ...profile.keyFindings.map((k, i) => `${i + 1}. ${k}`)] : []),
    "",
    "## How the team does it today (from evidence)",
    profile.howDoneToday || "Not described in the evidence yet.",
  ];
  for (const s of profile.sections) {
    out.push("", `## ${s.title}`);
    if (s.items.length === 0) out.push("Nothing captured yet.");
    for (const i of s.items) {
      out.push(`- **${i.name}** — ${STATUS_LABEL[i.status]}`);
      if (i.evidenceSays) out.push(`  - Evidence says: ${i.evidenceSays}`);
      if (i.dataShows) out.push(`  - Data shows: ${i.dataShows}`);
      if (i.retrieval) out.push(`  - Retrieve: ${i.retrieval}`);
      if (i.validationRule) out.push(`  - Monitoring check: ${i.validationRule}`);
      if (i.accessNeeded) out.push(`  - Access needed: ${i.accessNeeded}`);
      if (i.gap) out.push(`  - Gap: ${i.gap}`);
    }
  }
  out.push("", `## Is the data sufficient? — ${profile.sufficiency.verdict}`, profile.sufficiency.explanation);
  if (profile.sufficiency.missing.length) out.push("", "Missing:", ...profile.sufficiency.missing.map((m) => `- ${m}`));
  if (profile.sufficiency.conflicts.length) out.push("", "Conflicts between evidence and data:", ...profile.sufficiency.conflicts.map((m) => `- ${m}`));
  if (profile.nextDataRequests.length) {
    out.push("", "## Next data & access to request");
    for (const q of profile.nextDataRequests) out.push(`- [${q.priority}] ${q.request}${q.reason ? ` — ${q.reason}` : ""}${q.accessNeeded ? ` (access: ${q.accessNeeded})` : ""}`);
  }
  return out.join("\n");
}
