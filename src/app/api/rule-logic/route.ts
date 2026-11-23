// Rule logic builder and assistant for one control (services/ruleLogic.ts).
//
//   mode "build" -- (re)write the Argos monitoring rule from everything
//                   known about the control: objective and risk, notes,
//                   the readiness profile, evidence excerpts and the
//                   deterministic profiles of the real testing data.
//                   Says how ready it is and what is still needed.
//   mode "chat"  -- answer a question about the rule, or revise it as
//                   asked. A rule that is approved or locked is only
//                   discussed, never changed (enforced here, not just in
//                   the prompt).
//
// Returns a draft; the client applies it (it owns the application state
// and auto-saves it), so this route never writes the control itself.

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
} from "@/services/dataProfile";
import {
  formatReferencesForPrompt,
  getStoredReferences,
} from "@/services/platformDocs";
import { summarizeReadinessForPrompt } from "@/services/readiness";
import {
  readRuleLogic,
  type RuleDraft,
  type RuleReadiness,
} from "@/services/ruleLogic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-opus-5-5";
const EVIDENCE_PER_DOC = 6_000;
const EVIDENCE_BUDGET = 30_000;
const DATA_PER_FILE = 8_000;
const DATA_BUDGET = 60_000;
const CHAT_TURNS = 12;

type Body = {
  application?: Application;
  controlId?: string;
  mode?: "build" | "chat";
  message?: string;
};

type ModelOutput = {
  readiness: RuleReadiness;
  spec_markdown: string;
  still_needed: string[];
  change_summary: string;
  reply: string;
  spec_changed: boolean;
};

const SYSTEM = `You build and maintain the Argos monitoring rule for one SOX / PCI DSS control in Control Governor, a compliance workspace. An Argos rule is repeatable logic that runs on system-generated data (exports, APIs, queries) and flags exceptions automatically, replacing screenshot-style evidence.

Write the rule as Markdown using these sections, in this order, including a section only when the information supports it:

## Data Sources
One line per source: what it is and how it is collected (API, query, export, script). Use the real file names, field names and methods from the testing data and evidence.

## Scope & Population
What is evaluated, what is exempt, and how the population is shown to be complete.

## Finding N: <name>
One block per exception the rule detects, each with **Scope**, **Rule** (the exact condition, using real field names) and **Severity** (CRITICAL / HIGH / MEDIUM / LOW).

## Thresholds
The concrete values each finding is measured against (from the policy or standard in the evidence).

## Frequency & Ownership
How often it runs and who receives and resolves exceptions -- only when known.

Rules you must follow:
- Use only facts present in the material provided. Never invent a field, table, threshold, owner or frequency. When something is missing, leave it out of the rule and list it under still_needed instead.
- When the testing data already shows exceptions, say which records the rule would flag, as a short "Would flag today:" line under the finding.
- Keep it concise and specific; no general advice.

Readiness:
- "ready": the data source, the fields the conditions use, and the thresholds are all known from real material -- the rule could be implemented as written.
- "partial": some findings are fully specified, others are missing a source, field or threshold.
- "not_ready": no real data source or fields are known yet; give a short outline of the intended rule and what is needed.

still_needed: short, specific asks (at most 6), each naming the exact data, field, threshold or access required. Empty when ready.
change_summary: one short sentence on what changed versus the current rule (or "First version").`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    readiness: { type: "string", enum: ["not_ready", "partial", "ready"] },
    spec_markdown: { type: "string" },
    still_needed: { type: "array", items: { type: "string" } },
    change_summary: { type: "string" },
    reply: { type: "string" },
    spec_changed: { type: "boolean" },
  },
  required: [
    "readiness",
    "spec_markdown",
    "still_needed",
    "change_summary",
    "reply",
    "spec_changed",
  ],
  additionalProperties: false,
};

function fit(texts: string[], budget: number): string {
  const out: string[] = [];
  let used = 0;
  for (const text of texts) {
    if (used + text.length > budget) {
      out.push(`(${texts.length - out.length} more file(s) omitted for length)`);
      break;
    }
    out.push(text);
    used += text.length;
  }
  return out.join("\n\n") || "None.";
}

function notesText(control: ComplianceControl): string {
  const lines: string[] = [];
  for (const note of control.notes ?? []) {
    if (note.documentDeleted) continue;
    lines.push(`- [${note.sourceKind}] ${note.text}`);
  }
  for (const task of control.nextTasks ?? []) {
    for (const note of task.notes ?? []) {
      if (note.documentDeleted) continue;
      lines.push(`- [${note.sourceKind}, on "${task.text.slice(0, 80)}"] ${note.text}`);
    }
  }
  return lines.length ? lines.slice(-60).join("\n") : "None.";
}

async function sourcesFor(application: Application, control: ComplianceControl) {
  const rows = await db
    .select({
      filename: evidenceDocuments.filename,
      kind: evidenceDocuments.kind,
      scope: evidenceDocuments.scope,
      controlNames: evidenceDocuments.controlNames,
      extractedText: evidenceDocuments.extractedText,
      storagePath: evidenceDocuments.storagePath,
    })
    .from(evidenceDocuments)
    .where(eq(evidenceDocuments.applicationId, application.id))
    .orderBy(desc(evidenceDocuments.uploadedAt));

  const seen = new Set<string>();
  const docs = rows.filter((row) => {
    const names = Array.isArray(row.controlNames) ? (row.controlNames as unknown[]) : [];
    const relevant = row.scope === "all" || names.includes(control.name);
    const key = `${row.kind}:${row.filename.toLowerCase()}`;
    if (!relevant || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const evidence = docs
    .filter((d) => d.kind !== "data")
    .map((d) => `### ${d.filename} [evidence]\n${d.extractedText.slice(0, EVIDENCE_PER_DOC)}`);

  const data: string[] = [];
  for (const d of docs.filter((doc) => doc.kind === "data")) {
    if (d.storagePath && canProfile(d.filename)) {
      try {
        const profile = await getDataProfile(d.storagePath, d.filename);
        data.push(formatDataProfile(profile, DATA_PER_FILE));
        continue;
      } catch (error) {
        console.error(`[rule logic] profile failed for ${d.filename}:`, error);
      }
    }
    data.push(`### ${d.filename} [testing data excerpt]\n${d.extractedText.slice(0, DATA_PER_FILE)}`);
  }

  return {
    evidence: fit(evidence, EVIDENCE_BUDGET),
    data: fit(data, DATA_BUDGET),
    counts: { evidence: evidence.length, data: data.length },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const application = body.application;
    const control = application?.controls?.find((c) => c.id === body.controlId);
    const mode = body.mode === "chat" ? "chat" : "build";
    const message = String(body.message ?? "").trim();

    if (!application || !control) {
      return NextResponse.json({ error: "Application or control not found." }, { status: 400 });
    }
    if (mode === "chat" && !message) {
      return NextResponse.json({ error: "Type a question or change." }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
    }

    const state = readRuleLogic(control.ruleLogic);
    const editable = !state || state.status === "draft";

    const [sources, refs] = await Promise.all([
      sourcesFor(application, control),
      getStoredReferences([application.name]).catch(() => []),
    ]);

    const context = `APPLICATION: ${application.name} (hosting: ${application.hosting})
Purpose: ${application.applicationPurpose || "not captured"}
Identity types: ${application.identityTypes.join(", ") || "not captured"}

CONTROL: ${control.name}${control.clientContext ? ` (${control.clientContext})` : ""} [${control.framework}]
Objective: ${control.controlObjective || "not defined"}
Risk: ${control.controlRisk || "not defined"}
Evidence strategy: ${control.evidenceStrategy || "not defined"}

CURRENT RULE (status: ${state?.status ?? "draft"}, version ${state?.version ?? 0}):
${control.argosObjective.trim() || "None yet."}

READINESS PROFILE (evidence vs. real data):
${summarizeReadinessForPrompt(control.readinessProfile)}

EVIDENCE VS. TESTING DATA GAP ANALYSIS:
${control.evidenceDataGapAnalysis.trim().slice(0, 8_000) || "Not analyzed yet."}

NOTES:
${notesText(control)}

OFFICIAL VENDOR DOCUMENTATION:
${formatReferencesForPrompt(refs, 6_000) || "None stored."}

EVIDENCE DOCUMENTS (${sources.counts.evidence}):
${sources.evidence}

TESTING DATA (${sources.counts.data}) -- deterministic profiles of the full files:
${sources.data}`;

    const history = (state?.chat ?? []).slice(-CHAT_TURNS);
    const task =
      mode === "build"
        ? `Build the rule from the material above${control.argosObjective.trim() ? ", improving the current rule" : ""}. Set spec_changed to true if the rule text differs from the current rule. Set reply to an empty string.`
        : editable
          ? `The user says: """${message}"""\nAnswer in reply (plain language, short). If they ask for a change -- or the answer shows the rule should change -- return the full revised rule in spec_markdown with spec_changed true; otherwise return the current rule unchanged with spec_changed false.`
          : `The user says: """${message}"""\nThis rule is ${state?.status}, so it must not change: answer in reply only, return the current rule unchanged with spec_changed false, and if they asked for a change, say they need to click "Keep developing"${state?.status === "locked" ? " after unlocking it" : ""} first.`;

    const response = await anthropic.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32_000,
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: "claude-opus-4-8" }],
        output_config: {
          effort: mode === "chat" ? "medium" : "high",
          format: { type: "json_schema", schema: OUTPUT_SCHEMA },
        },
        system: SYSTEM,
        messages: [
          { role: "user", content: context },
          {
            role: "assistant",
            content: "I have the control's material. What would you like me to do with the rule?",
          },
          ...history.map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
          { role: "user", content: task },
        ],
      })
      .finalMessage();

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined this request." }, { status: 502 });
    }
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    let output: ModelOutput;
    try {
      output = JSON.parse(text) as ModelOutput;
    } catch {
      return NextResponse.json(
        {
          error:
            response.stop_reason === "max_tokens"
              ? "The rule was too long to finish. Try again."
              : "The rule builder returned an unreadable answer. Try again.",
        },
        { status: 502 },
      );
    }

    console.log(
      `[rule logic] ${mode} ${application.name} / ${control.name}: ${output.readiness}, changed=${output.spec_changed}, in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
    );

    const changed =
      editable || mode === "build"
        ? output.spec_changed && output.spec_markdown.trim() !== control.argosObjective.trim()
        : false;

    const draft: RuleDraft = {
      spec: changed ? output.spec_markdown.trim() : control.argosObjective,
      readiness: output.readiness,
      stillNeeded: (output.still_needed ?? []).slice(0, 6),
      summary: output.change_summary,
      at: new Date().toISOString(),
    };

    return NextResponse.json({
      draft,
      changed,
      reply: mode === "chat" ? output.reply : "",
    });
  } catch (error) {
    console.error("[rule logic] failed:", error);
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `The rule builder is unavailable right now (${error.status ?? "network"}).` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rule building failed." },
      { status: 500 },
    );
  }
}
