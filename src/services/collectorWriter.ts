// Server-only. Writes / updates an application's collector script with
// Claude, following the user's collect-app-data skill (skills/
// collect-app-data/*.md, loaded verbatim) plus a Work Governor runtime
// contract describing how the app runs scripts. Never sees secret
// values: only variable names, which are secret, and non-secret
// endpoint values (URLs, hosts).

import { readFile } from "node:fs/promises";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import type { CollectorRun, CollectorScript, ConnectionVariable } from "./collectors";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The model that writes collector code: security-sensitive code for
// production systems, so the most capable Opus; falls back on refusal.
const WRITER_MODEL = "claude-opus-5-5";
const FALLBACK_MODEL = "claude-opus-4-8";

const SKILL_DIR = path.join(process.cwd(), "skills", "collect-app-data");
const SKILL_FILES = ["skill.md", "credentials.md", "probing.md", "data-collection.md", "output-files.md", "security-enforcement.md"];

const RUNTIME_CONTRACT = `# WORK GOVERNOR RUNTIME CONTRACT (overrides the skill where they differ)

You are running the collect-app-data skill inside Work Governor, a compliance app. Differences from running it in Claude Code:

- You do not talk to the user turn by turn. You get everything in one message and return one result. If something essential to write a working collector is missing and cannot be derived (e.g. the platform is unclear, or there is no endpoint URL at all), return status "needs_input" with up to 3 specific questions instead of code. Otherwise return status "ready" with the complete script.
- Credentials: the app stores them and injects them as ENVIRONMENT VARIABLES at run time, with exactly the names listed under CONNECTION. Read them with os.environ.get("NAME", "") only. Never read a .env file (no python-dotenv), never prompt (no input()/getpass()) -- runs are unattended. If a required variable is empty, call write_blocker_file() where appropriate and exit with a sanitized message.
- Output: write every output file (the 6 output types, run_log.txt, blocker files) into the directory given by os.environ["OUTPUT_DIR"]. Use it as the app folder for write_blocker_file(). The app collects everything in OUTPUT_DIR and attaches it to the application as testing data.
- Running against live credentials is IN scope here (the skill's "Out of scope" item is overridden): a human reviews every script version before it runs. The script must still be strictly READ-ONLY: GET requests and read queries only; POST only for authentication or for query/search endpoints that do not change data. No subprocess/os.system, no eval/exec.
- Pagination: never cap a population with a LIMIT/row count unless the user asks; if a source needs a time window (login history, audit trails), make the window an environment-variable-free constant at the top of the script, default to the full period the source retains, and record the window in the analysis report.
- Python 3.14, standard library plus the third-party packages you list in "requirements" (pip names). Prefer libraries the skill names.
- Updating an existing script: keep everything that already works (endpoints, field mappings, output names), change only what the instruction or the last run's blockers require, and return the COMPLETE updated script (not a diff). Describe the changes in changeSummary as short bullet lines.
- Also return the complete updated app-notes.md (env vars, endpoints, known limitations, output files, change history line for this version).
- Run the skill's security-enforcement pre-completion checklist on your own script before returning. The app also runs automatic checks and will refuse a script with: hard-coded credentials, verify=False, HTTP calls without a timeout, PUT/PATCH/DELETE, data-changing SQL, subprocess/eval, missing write_blocker_file().`;

async function loadSkill(): Promise<string> {
  const parts = await Promise.all(
    SKILL_FILES.map(async (f) => {
      try {
        return `\n\n===== ${f} =====\n\n${await readFile(path.join(SKILL_DIR, f), "utf8")}`;
      } catch {
        return "";
      }
    })
  );
  const text = parts.join("");
  if (!text.trim()) throw new Error("The collect-app-data skill files are missing (skills/collect-app-data).");
  return `${text}\n\n${RUNTIME_CONTRACT}`;
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["ready", "needs_input"] },
    questions: { type: "array", items: { type: "string" } },
    code: { type: "string" },
    appNotes: { type: "string" },
    requirements: { type: "array", items: { type: "string" } },
    changeSummary: { type: "string" },
  },
  required: ["status", "questions", "code", "appNotes", "requirements", "changeSummary"],
  additionalProperties: false,
} as const;

export type WriterResult = {
  status: "ready" | "needs_input";
  questions: string[];
  code: string;
  appNotes: string;
  requirements: string[];
  changeSummary: string;
};

// Non-secret values that help write the probes (endpoints), shown to
// the model; everything else is name-only.
const SHAREABLE = /(URL|URI|HOST|PORT|BASE_DN|TENANT_ID|API_VERSION|DB_NAME|SERVICE_NAME|ENVIRONMENT|INSTANCE|DOMAIN)$/;

export async function writeCollectorScript(input: {
  applicationName: string;
  platform: string;
  authMethod: string;
  environment: string;
  variables: ConnectionVariable[];
  instruction: string;
  previous: CollectorScript | null;
  lastRun: CollectorRun | null;
  dataGaps: string[];
}): Promise<{ result: WriterResult; usage: string }> {
  const vars = input.variables
    .map((v) => `- ${v.name}${v.secret ? " (secret)" : SHAREABLE.test(v.name) && v.value ? ` = ${v.value}` : " (value set, not shown)"}`)
    .join("\n");

  const lastRun = input.lastRun
    ? `LAST RUN of v${input.lastRun.scriptVersion ?? "?"}: ${input.lastRun.status} (exit ${input.lastRun.exitCode ?? "?"}), ${input.lastRun.outputFiles.length} output files: ${input.lastRun.outputFiles.map((f) => `${f.name} (${f.bytes} bytes)`).join(", ").slice(0, 3000)}
Log (tail):
${input.lastRun.log.slice(-5000)}
${input.lastRun.blockers.length ? `Blocker / limitation files:\n${input.lastRun.blockers.map((b) => `--- ${b.name}\n${b.text.slice(0, 1500)}`).join("\n").slice(0, 8000)}` : ""}`
    : "No runs yet.";

  const content = `APPLICATION: ${input.applicationName}
ENVIRONMENT: ${input.environment || "not stated"}
PLATFORM: ${input.platform}
AUTH METHOD: ${input.authMethod}

CONNECTION (environment variables injected at run time):
${vars || "- none defined yet"}

${input.previous ? `CURRENT SCRIPT (v${input.previous.version}, ${input.previous.status}${input.previous.source === "imported" ? ", imported from the existing collector folder" : ""}):\n\`\`\`python\n${input.previous.code}\n\`\`\`\n\nCURRENT app-notes.md:\n${input.previous.appNotes || "(none)"}` : "CURRENT SCRIPT: none -- write a new collector."}

${lastRun}

DATA THE COMPLIANCE REVIEW STILL NEEDS (from the controls' readiness profiles -- use these to decide what extra data to pull):
${input.dataGaps.length ? input.dataGaps.map((g) => `- ${g}`).join("\n") : "- none recorded"}

INSTRUCTION FROM THE USER:
${input.instruction.trim() || (input.previous ? "Fix the blockers from the last run and adapt the script to the Work Governor runtime contract." : "Write the collector.")}`;

  const response = await anthropic.beta.messages
    .stream({
      model: WRITER_MODEL,
      max_tokens: 100_000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: [{ model: FALLBACK_MODEL }],
      output_config: { effort: "high", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: [{ type: "text", text: await loadSkill(), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
    })
    .finalMessage();

  const usage = `model=${response.model} input=${response.usage.input_tokens} cache_read=${response.usage.cache_read_input_tokens ?? 0} output=${response.usage.output_tokens} stop=${response.stop_reason}`;

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to write this script. Rephrase the instruction (describe the read-only data you need) and try again.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The script was too long to finish in one response. Try a narrower instruction.");
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed: WriterResult;
  try {
    parsed = JSON.parse(text) as WriterResult;
  } catch {
    throw new Error("The model's answer couldn't be read. Nothing was saved -- try again.");
  }
  return { result: parsed, usage };
}
