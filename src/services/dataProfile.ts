// Server-only. Deterministic profiles of uploaded testing-data files
// (scripts/profile-data.mjs), computed from the full original file in a
// separate process and cached next to it as <file>.profile.json. These
// are the facts the readiness analysis works from -- record counts,
// export completeness, value distributions, named exceptions -- instead
// of the truncated text excerpt the assistant otherwise sees.

import { execFile } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT = path.join(process.cwd(), "scripts", "profile-data.mjs");
const PROFILE_VERSION = 3;
const PROFILE_TIMEOUT_MS = 180_000;

type FieldProfile = {
  name: string;
  filled: number;
  distinct: number | string;
  values?: Array<[string, number]>;
  moreValues?: number;
  range?: [unknown, unknown];
  topRepeats?: Array<[string, number]>;
};

export type DataProfile = {
  version?: number;
  filename: string;
  bytes?: number;
  format?: string;
  error?: string;
  recordType?: string | null;
  recordCount?: number;
  reportedTotal?: number | null;
  complete?: boolean | null;
  notes?: string[];
  fields?: FieldProfile[];
  otherFields?: string[];
  labelField?: string | null;
  outliers?: Array<{ field: string; value: string; count: number; typical: string; records: string[] }>;
  active?: { field: string; count: number; fields: FieldProfile[] };
  lineCount?: number;
  textExcerpt?: string;
};

const PROFILED_EXTENSIONS = new Set(["json", "csv", "txt", "md", "log"]);

export function canProfile(filename: string): boolean {
  return PROFILED_EXTENSIONS.has(path.extname(filename).toLowerCase().slice(1));
}

function runProfiler(storagePath: string, filename: string): Promise<DataProfile> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ["--max-old-space-size=6144", SCRIPT, storagePath, filename],
      { timeout: PROFILE_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve({ filename, error: `Could not profile the file: ${error.message.slice(0, 200)}` });
          return;
        }
        try {
          resolve(JSON.parse(stdout) as DataProfile);
        } catch {
          resolve({ filename, error: "The profiler returned unreadable output." });
        }
      }
    );
  });
}

// Cached per stored file; recomputed if the profiler format changes.
export async function getDataProfile(storagePath: string, filename: string): Promise<DataProfile> {
  const cachePath = `${storagePath}.profile.json`;
  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8")) as DataProfile;
    if (cached.version === PROFILE_VERSION) return cached;
  } catch {}

  try {
    await stat(storagePath);
  } catch {
    return { filename, error: "The stored file is missing on disk." };
  }

  const profile = { ...(await runProfiler(storagePath, filename)), version: PROFILE_VERSION };
  if (!profile.error) {
    try {
      await writeFile(cachePath, JSON.stringify(profile));
    } catch {}
  }
  return profile;
}

// ---------- compact text for the model ----------

const n = (v: number) => v.toLocaleString("en-US");

function fieldLine(f: FieldProfile): string {
  const head = `${f.name} (${n(f.filled)} filled, ${typeof f.distinct === "number" ? n(f.distinct) : f.distinct} distinct)`;
  if (f.filled === 0) return `${f.name}: always empty`;
  if (f.values) {
    return `${head}: ${f.values.map(([v, c]) => `${v || "(blank)"} ×${n(c)}`).join(", ")}${f.moreValues ? `, +${f.moreValues} more values` : ""}`;
  }
  if (f.range) return `${head}: ${String(f.range[0])} → ${String(f.range[1])}`;
  if (f.topRepeats) return `${head}; most repeated: ${f.topRepeats.map(([v, c]) => `${v} ×${n(c)}`).join(", ")}`;
  return head;
}

export function formatDataProfile(p: DataProfile, maxChars: number): string {
  const lines: string[] = [];
  if (p.error) {
    lines.push(`### ${p.filename} — could not be profiled (${p.error})`);
    if (p.textExcerpt) lines.push(p.textExcerpt.slice(0, maxChars));
    return lines.join("\n").slice(0, maxChars);
  }

  if (p.textExcerpt !== undefined) {
    lines.push(`### ${p.filename} — text file, ${n(p.lineCount ?? 0)} lines${p.notes?.length ? ` (${p.notes.join(" ")})` : ""}`);
    lines.push(p.textExcerpt);
    return lines.join("\n").slice(0, maxChars);
  }

  const completeness =
    p.complete === true
      ? `complete export (${n(p.recordCount ?? 0)} of ${n(p.reportedTotal ?? p.recordCount ?? 0)} reported)`
      : p.complete === false
        ? "INCOMPLETE export"
        : "completeness unknown (no source total in the file)";
  lines.push(`### ${p.filename} — ${p.recordType ?? p.format ?? "records"}: ${n(p.recordCount ?? 0)} records; ${completeness}`);
  for (const note of p.notes ?? []) lines.push(`! ${note}`);
  if (p.active) lines.push(`Active (by ${p.active.field}): ${n(p.active.count)} of ${n(p.recordCount ?? 0)}`);

  if (p.outliers?.length) {
    lines.push("Exceptions (minority values, with the records that hold them):");
    for (const o of p.outliers) {
      lines.push(`- ${o.field} = ${o.value || "(blank)"} on ${n(o.count)} (typical: ${o.typical}): ${o.records.join(", ")}`);
    }
  }

  if (p.active?.fields.length) {
    lines.push(`Active ${p.recordType ?? "records"} only:`);
    for (const f of p.active.fields) lines.push(`- ${fieldLine(f)}`);
  }

  lines.push("All records, by field:");
  for (const f of p.fields ?? []) lines.push(`- ${fieldLine(f)}`);
  if (p.otherFields?.length) {
    lines.push(`Other fields present (not profiled): ${p.otherFields.slice(0, 60).join(", ")}${p.otherFields.length > 60 ? `, +${p.otherFields.length - 60} more` : ""}`);
  }

  // Trim whole lines from the end so the header, exceptions and
  // active-only stats (the most decision-relevant parts) survive.
  let text = lines.join("\n");
  while (text.length > maxChars && lines.length > 3) {
    lines.pop();
    text = `${lines.join("\n")}\n(…more fields omitted for space)`;
  }
  return text;
}

// ---------- cross-file facts (Salesforce identity) ----------

const IDENTITY_SCRIPT = path.join(process.cwd(), "scripts", "salesforce-identity-facts.mjs");

type StoredFile = { filename: string; storagePath: string };

// When the testing data includes Salesforce User + Profile exports, join
// them (plus profile password policies, org policy and login history
// when present) in a separate process -- exact numbers the per-file
// profiles can't give. Cached per set of input files. Null when the
// inputs aren't there.
export async function getSalesforceIdentityFacts(files: StoredFile[]): Promise<string | null> {
  const find = (suffix: string) => files.find((f) => f.filename.toLowerCase().endsWith(suffix));
  const user = find("raw_user.json");
  const profile = find("raw_profile.json");
  if (!user || !profile) return null;
  const optional: Array<[string, StoredFile | undefined]> = [
    ["--policy", find("raw_profile_password_policy_metadata.json")],
    ["--org", find("raw_passwordpolicies.json")],
    ["--login", find("raw_loginhistory.json")],
  ];
  const args = ["--user", user.storagePath, "--profile", profile.storagePath];
  for (const [flag, f] of optional) if (f) args.push(flag, f.storagePath);

  const { createHash } = await import("node:crypto");
  const key = createHash("sha1").update(`v1|${args.join("|")}`).digest("hex").slice(0, 16);
  const cachePath = path.join(path.dirname(user.storagePath), `.identity-facts-${key}.txt`);
  try {
    return await readFile(cachePath, "utf8");
  } catch {}

  const text = await new Promise<string | null>((resolve) => {
    execFile(
      process.execPath,
      ["--max-old-space-size=6144", IDENTITY_SCRIPT, ...args],
      { timeout: PROFILE_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => resolve(error ? null : stdout)
    );
  });
  if (text) {
    try {
      await writeFile(cachePath, text);
    } catch {}
  }
  return text;
}
