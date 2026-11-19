// Builds (or rebuilds) one control's readiness profile -- see
// services/readiness.ts. Evidence = how the application team says the
// control is done (context, not proof). Testing data = facts, pulled
// with the service account that will run compliance monitoring; it's
// summarized here by code (services/dataProfile.ts) from the FULL
// files, so counts and exceptions are exact rather than guessed from a
// truncated excerpt. The previous profile is passed in so each rebuild
// extends it rather than starting over.

import Anthropic from "@anthropic-ai/sdk";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { evidenceDocuments } from "@/db/schema";
import type { Application, ComplianceControl } from "@/services/commandEngine";
import {
  canProfile,
  formatDataProfile,
  getDataProfile,
  getSalesforceIdentityFacts,
} from "@/services/dataProfile";
import {
  READINESS_STATUSES,
  blueprintFor,
  normalizeReadinessProfile,
  readStoredReadiness,
} from "@/services/readiness";
import {
  formatReferencesForPrompt,
  keepKnownUrls,
  referenceUrls,
  resolvePlatformReference,
} from "@/services/platformDocs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EVIDENCE_BUDGET = 60_000;
const EVIDENCE_PER_DOC = 12_000;
const DATA_BUDGET = 120_000;
const DATA_PER_FILE_MAX = 9_000;

type DocRow = {
  id: string;
  filename: string;
  kind: string;
  scope: string;
  controlNames: unknown;
  extractedText: string;
  truncated: boolean;
  storagePath: string;
  uploadedAt: Date;
};

// Water-filling: small items keep everything, large ones share what's
// left equally, so one 255 MB export can't crowd out the rest.
function fitToBudget(texts: string[], budget: number): string[] {
  const sorted = texts
    .map((t, i) => ({ i, len: t.length }))
    .sort((a, b) => a.len - b.len);
  let remaining = budget;
  let left = sorted.length;
  const caps = new Array<number>(texts.length);
  for (const { i, len } of sorted) {
    const fair = Math.floor(remaining / left);
    caps[i] = Math.min(len, fair);
    remaining -= caps[i];
    left--;
  }
  return texts.map((t, i) =>
    t.length <= caps[i] ? t : `${t.slice(0, caps[i])}\n(…trimmed for space)`,
  );
}

const STATIC_SYSTEM = `You build the CONTROL READINESS PROFILE for one compliance control in Control Governor.

Purpose: a neat, accurate picture of the control that anyone (auditors, application teams, management) can read, and that tells the compliance-monitoring effort exactly what is proven, what is not, and what data or access to get next. The user retrieves the testing data with the SAME service account that will run continuous compliance monitoring, so the real data is the source of truth and the goal is for it to become 100% complete and accurate over successive uploads.

HOW TO TREAT THE INPUTS
- TESTING DATA = FACTS. The data profiles were computed by code from the full original files: record counts, whether an export is complete, value distributions, active-only breakdowns and named exceptions are exact. Copy numbers from them verbatim; never estimate, round differently or invent a number. If a fact you need is not in the profiles, say so -- that's a gap, not something to fill in.
- EVIDENCE = CLAIMS. Evidence documents show how the application team says the control is done today. Use them to understand the process and to know what to check, never as proof. Anything only the evidence supports is "evidence_only".
- An export marked INCOMPLETE is not a full population: say so wherever it matters and request the complete pull.
- If the data shows something the evidence never mentions (an extra identity type, a profile with a weaker policy), that's "data_only" and usually important.
- When data and evidence disagree, the data wins: status "conflict", and say exactly what each says.

STATUSES (per item)
verified -- the data confirms it (cite the file and the numbers)
conflict -- the data contradicts the evidence
evidence_only -- claimed in evidence, not yet backed by data
data_only -- present in the data, the evidence is silent
missing -- needed for this control, but neither evidence nor data covers it yet
not_applicable -- genuinely does not apply here (say why)

CROSS-FILE FACTS
When a CROSS-FILE FACTS block is present, it was computed by code by joining the full exports (e.g. users x profiles x password policies x login history). Those numbers are the most reliable facts you have -- build the population and the policy items on them, and name the accounts/profiles they name.

DOMAIN NOTES (Salesforce) -- read fields correctly
- User.FederationIdentifier set = the user signs in through SAML SSO; their password rules live in the identity provider (Azure AD / Okta), not in Salesforce. LastPasswordChangeDate / PasswordExpirationDate empty or "expired" for SSO users is EXPECTED, not a data gap -- never report it as one. The Salesforce password population is the active accounts WITHOUT a FederationIdentifier.
- Whether SSO users can still sign in with a Salesforce password is a separate question (My Domain sign-in options / profile IsMustUseSso) -- flag it if not shown.
- Profile PermissionsPasswordNeverExpires = passwords on that profile never expire, whatever the profile's passwordExpiration says. PermissionsApiUserOnly = API-only (no UI login).
- ProfilePasswordPolicy: minimumPasswordLifetime=true means a password must be at least a day old before it can be changed again (stops cycling through history) -- it is NOT "never expires". obscure = hide the secret answer -- not about the password. passwordComplexity: 0 none, 1 letters+numbers, 2 +special characters, 3 upper/lower/numbers, 4 upper/lower/numbers/special.
- LoginHistory.LoginType: "Remote Access 2.0" = OAuth token (keeps working after the password expires), "Other Apex API" = API login with username/password, "SAML ... SSO" = SSO.
- Inactive users (IsActive=false) cannot sign in; they are out of scope for a password control -- don't request inactive-user exports for it.
- A data profile marked "complete export" needs no re-pull. One marked LIKELY CAPPED (exactly 1,000 / 10,000 ... rows) is a sample: request the full period.

SCOPE
Stay inside this control. Topics that belong to other controls (firefighter / emergency access, access reviews, provisioning, termination) go nowhere in this profile.

WHAT TO PRODUCE
- summary: 2-3 plain sentences anyone can understand: where the control stands and the single most important gap.
- keyFindings: the 3-5 facts everyone must know, one line each, most important first, each with its numbers and names (e.g. "API Admin and OKTA Integration profiles allow 8-character passwords — 1 active local account each").
- howDoneToday: how the application team performs the control today, from the evidence (who, how often, which tool/report, what they check). Plain language.
- sections, using the three keys exactly:
  population -- the in-scope population, item per type (see the blueprint for this control type).
  configuration -- the rules/settings/process the control relies on, item per level or rule.
  access -- for each population type and configuration layer: can the monitoring service account retrieve it today (a successful pull in the testing data proves it can), and what is still needed.
  For every item fill: evidenceSays, dataShows (numbers from the profiles), status, sources (exact filenames), retrieval (the concrete object / API / metadata type / report to pull it from, with a suggested query where you can, e.g. a SOQL query; infer the source object from the data file's record type and filename), validationRule (the concrete automated check monitoring should run, with thresholds, e.g. "every active profile: minimumPasswordLength >= 12"), accessNeeded (the specific permission/access the service account still needs to pull it, "" if the data already proves access; phrase unconfirmed permissions as "likely needs ..."), gap (what is missing or wrong, "" if none).
  Name the actual exceptions from the profiles (e.g. which profiles deviate) -- that is the most useful part for everyone.
  When a PLATFORM DOCUMENTATION REFERENCE is given (facts from the product vendor's official documentation, with source URLs): use it as the checklist of what this product actually has. Any identity type, setting level or log the documentation lists that is relevant to this control but covered by neither the evidence nor the data is an item with status "missing" (or "evidence_only" if only the evidence mentions it) -- that is how gaps the evidence silently skips get caught. Use it to make retrieval and validationRule product-accurate. Add the documentation URL(s) you relied on to that item's sources, alongside any filenames. The documentation says what the product supports, never what this instance does -- only the data can verify an item.
- sufficiency: verdict (sufficient = every applicable item verified; partial; insufficient), explanation, missing (list), conflicts (list).
  Every missing and conflicts entry is "<Headline> — <point>; <point>": a headline of at most 6 words naming exactly what is missing (or what conflicts), then an em dash and at most 2 short points separated by "; " (each at most 8 words: what's wrong, then what to pull), e.g. "Password change timestamps — Empty for all 412 users; Pull from the identity provider". Shown as a bold headline with sub-bullets, so no full sentences. No vague headlines ("More data needed").
- nextDataRequests: the concrete next pulls or access requests that would close the gaps, highest value first, each with reason, accessNeeded and priority.
- changesSinceLast: when a PREVIOUS PROFILE is given, what changed with the new data (newly verified items, new gaps, resolved gaps). Keep every previous item unless the data shows it doesn't apply; improve it with the new facts. Empty list when there is no previous profile.

LENGTH LIMITS (the profile must fit in one response)
- Each text field: at most 2 short sentences. dataShows: the key numbers, not a narrative.
- retrieval and validationRule: one line each (a query or rule, not an essay).
- At most 10 items per section -- group similar things (e.g. all integration profiles in one item, naming them) rather than one item each.
- sufficiency.missing and conflicts: at most 8 entries each. nextDataRequests: at most 8. changesSinceLast: at most 8.
- Exception lists: name up to 8, then "and N more".

Be specific and concise. No filler. Write for a mixed audience: precise terms, no jargon without a short explanation.

Return exactly one record_readiness_profile tool call.`;

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    evidenceSays: { type: "string" },
    dataShows: { type: "string" },
    status: { type: "string", enum: READINESS_STATUSES },
    sources: { type: "array", items: { type: "string" } },
    retrieval: { type: "string" },
    validationRule: { type: "string" },
    accessNeeded: { type: "string" },
    gap: { type: "string" },
  },
  required: [
    "name",
    "evidenceSays",
    "dataShows",
    "status",
    "sources",
    "retrieval",
    "validationRule",
    "accessNeeded",
    "gap",
  ],
};

const TOOL: Anthropic.Tool = {
  name: "record_readiness_profile",
  description: "Record the control readiness profile.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      keyFindings: { type: "array", items: { type: "string" } },
      howDoneToday: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: {
              type: "string",
              enum: ["population", "configuration", "access"],
            },
            items: { type: "array", items: ITEM_SCHEMA },
          },
          required: ["key", "items"],
        },
      },
      sufficiency: {
        type: "object",
        properties: {
          verdict: {
            type: "string",
            enum: ["sufficient", "partial", "insufficient"],
          },
          explanation: { type: "string" },
          missing: { type: "array", items: { type: "string" } },
          conflicts: { type: "array", items: { type: "string" } },
        },
        required: ["verdict", "explanation", "missing", "conflicts"],
      },
      nextDataRequests: {
        type: "array",
        items: {
          type: "object",
          properties: {
            request: { type: "string" },
            reason: { type: "string" },
            accessNeeded: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["request", "reason", "accessNeeded", "priority"],
        },
      },
      changesSinceLast: { type: "array", items: { type: "string" } },
    },
    required: [
      "summary",
      "keyFindings",
      "howDoneToday",
      "sections",
      "sufficiency",
      "nextDataRequests",
      "changesSinceLast",
    ],
  },
};

function describeControl(
  application: Application,
  control: ComplianceControl,
): string {
  const ctx = [
    ["Application", application.name],
    ["Hosting", application.hosting],
    ["Purpose", application.applicationPurpose],
    ["Business process", application.businessProcess],
    ["Hosting details", application.hostingDetails],
    ["Integrations", application.integrations.join(", ")],
    ["Known identity types", application.identityTypes.join(", ")],
  ]
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const tasks = control.nextTasks
    .filter((t) => !t.irrelevant)
    .map(
      (t) =>
        `- [${t.completed ? "done" : "open"}] ${t.text}${
          t.notes.length
            ? ` (notes: ${t.notes
                .map((n) => n.text)
                .join(" | ")
                .slice(0, 400)})`
            : ""
        }`,
    )
    .join("\n");
  return `${ctx}

Control: ${control.name}
Framework: ${control.framework}
Client control code: ${control.clientContext || "not set"}
Global reference: ${control.globalControlReference || "not set"}
Objective: ${control.controlObjective || "not defined"}
Risk: ${control.controlRisk || "not defined"}
Evidence strategy: ${control.evidenceStrategy || "not defined"}
Rule logic (monitoring objective): ${control.argosObjective || "not defined"}

Checklist:
${tasks || "- none"}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const application = body.application as Application | undefined;
    const control = application?.controls?.find((c) => c.id === body.controlId);
    if (!application || !control) {
      return NextResponse.json(
        { error: "Application or control not found." },
        { status: 400 },
      );
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const rows = (await db
      .select({
        id: evidenceDocuments.id,
        filename: evidenceDocuments.filename,
        kind: evidenceDocuments.kind,
        scope: evidenceDocuments.scope,
        controlNames: evidenceDocuments.controlNames,
        extractedText: evidenceDocuments.extractedText,
        truncated: evidenceDocuments.truncated,
        storagePath: evidenceDocuments.storagePath,
        uploadedAt: evidenceDocuments.uploadedAt,
      })
      .from(evidenceDocuments)
      .where(eq(evidenceDocuments.applicationId, application.id))
      .orderBy(desc(evidenceDocuments.uploadedAt))) as DocRow[];

    // This control's documents (scoped to it, or application-wide);
    // re-uploads of the same file count once -- the newest.
    const seen = new Set<string>();
    const docs = rows.filter((row) => {
      const names = Array.isArray(row.controlNames)
        ? (row.controlNames as unknown[])
        : [];
      const relevant = row.scope === "all" || names.includes(control.name);
      const key = `${row.kind}:${row.filename.toLowerCase()}`;
      if (!relevant || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const evidenceDocs = docs.filter((d) => d.kind !== "data");
    const dataDocs = docs.filter((d) => d.kind === "data");

    if (docs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No evidence or testing data is attached to this control yet. Upload some first.",
        },
        { status: 400 },
      );
    }

    const evidenceTexts = fitToBudget(
      evidenceDocs.map(
        (d) =>
          `### ${d.filename} [Evidence${d.truncated ? ", stored copy truncated at upload" : ""}]\n${d.extractedText.slice(0, EVIDENCE_PER_DOC) || "(no text could be extracted)"}`,
      ),
      EVIDENCE_BUDGET,
    );

    // Profiles are computed once per stored file and cached on disk.
    const dataTexts: string[] = [];
    for (const d of dataDocs) {
      if (canProfile(d.filename)) {
        const profile = await getDataProfile(d.storagePath, d.filename);
        dataTexts.push(formatDataProfile(profile, DATA_PER_FILE_MAX));
      } else {
        dataTexts.push(
          `### ${d.filename} — not a CSV/JSON/text file; extracted text excerpt:\n${d.extractedText.slice(0, DATA_PER_FILE_MAX)}`,
        );
      }
    }
    const fittedData = fitToBudget(dataTexts, DATA_BUDGET);
    const crossFileFacts = await getSalesforceIdentityFacts(dataDocs);

    // Platform documentation reference for the product (stored copy;
    // researched from official documentation only if none is stored).
    const docsRef = await resolvePlatformReference({
      name: application.name,
      hosting: application.hosting,
      applicationPurpose: application.applicationPurpose,
      hostingDetails: application.hostingDetails,
      integrations: application.integrations,
      identityTypes: application.identityTypes,
    }).catch((error) => {
      console.error("Platform reference unavailable (continuing without it):", error);
      return null;
    });
    const docsRefs = docsRef ? [docsRef] : [];
    const docsText = formatReferencesForPrompt(docsRefs, 10_000);

    const blueprint = blueprintFor(control.clientContext);
    const previous = readStoredReadiness(control.readinessProfile);

    const userContent = `CONTROL TYPE: ${blueprint.label}${control.clientContext ? ` (${control.clientContext})` : ""}

WHAT THIS CONTROL TYPE NEEDS COVERED
- population -- "${blueprint.population.title}": ${blueprint.population.cover}
- configuration -- "${blueprint.configuration.title}": ${blueprint.configuration.cover}
- access -- "${blueprint.access.title}": ${blueprint.access.cover}

CONTROL & APPLICATION
${describeControl(application, control)}

PREVIOUS PROFILE
${previous ? JSON.stringify({ generatedAt: previous.generatedAt, summary: previous.summary, sections: previous.sections, sufficiency: previous.sufficiency, nextDataRequests: previous.nextDataRequests }) : "None -- this is the first build."}

EVIDENCE (${evidenceDocs.length} document(s) -- claims about how the control is done)
${evidenceTexts.join("\n\n") || "No evidence documents uploaded."}

${docsText ? `PLATFORM DOCUMENTATION REFERENCE (official vendor documentation -- what the product has, not what this instance does)\n${docsText}\n\n` : ""}${crossFileFacts ? `CROSS-FILE FACTS (computed by code across the full exports -- the most reliable numbers)\n${crossFileFacts}\n\n` : ""}TESTING DATA PROFILES (${dataDocs.length} file(s) -- facts, computed by code from the full files)
${fittedData.join("\n\n") || "No testing data uploaded yet."}`;

    // Streamed so the larger output ceiling doesn't hit HTTP timeouts;
    // a full profile for a control with many data files can run past
    // 16k output tokens.
    const response = await anthropic.messages
      .stream({
        model: "claude-haiku-4-5",
        max_tokens: 40000,
        system: [
          {
            type: "text",
            text: STATIC_SYSTEM,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: userContent }],
      })
      .finalMessage();

    console.log(
      `[readiness usage] control="${control.name}" evidence=${evidenceDocs.length} data=${dataDocs.length} input=${response.usage.input_tokens} cache_read=${response.usage.cache_read_input_tokens ?? 0} output=${response.usage.output_tokens} stop=${response.stop_reason}`,
    );

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          error:
            "The readiness profile was too large and got cut off. Nothing was changed -- try again.",
        },
        { status: 502 },
      );
    }
    const call = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!call) {
      return NextResponse.json(
        { error: "The assistant did not return a readiness profile." },
        { status: 502 },
      );
    }

    const profile = normalizeReadinessProfile(call.input, blueprint, {
      evidence: evidenceDocs.map((d) => d.filename),
      data: dataDocs.map((d) => d.filename),
    });

    // Documentation links in item sources must come from the reference;
    // anything else URL-shaped is dropped. Filenames are kept as-is.
    const knownUrls = referenceUrls(docsRefs);
    const citedUrls = new Set<string>();
    for (const section of profile.sections) {
      for (const item of section.items) {
        item.sources = item.sources.filter((src) => {
          if (!/^https?:\/\//i.test(src)) return true;
          const [kept] = keepKnownUrls([src], knownUrls);
          if (kept) citedUrls.add(kept);
          return !!kept;
        });
      }
    }
    if (docsRef?.status === "researched") {
      profile.sourcesUsed.documentation = docsRef.sources
        .filter((s) => citedUrls.has(s.url))
        .map((s) => ({ title: s.title, url: s.url }));
      profile.sourcesUsed.documentationProduct = docsRef.productName;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Readiness profile error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Building the readiness profile failed.",
      },
      { status: 500 },
    );
  }
}
