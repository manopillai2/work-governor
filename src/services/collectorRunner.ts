// Server-only. Runs an approved collector script against the live
// application and turns its output into testing data.
//
// - Each run gets its own folder (collector-runs/<app>/<run id>/); the
//   script is copied there and runs with that folder as its working
//   directory and OUTPUT_DIR.
// - Python comes from the app-managed virtual environment
//   (.collectors-venv); the script's requirements are installed into it
//   (approving a script version approves its requirements).
// - The environment is minimal: PATH/HOME/locale, proxy/CA settings,
//   OUTPUT_DIR and the connection's variables (secrets decrypted only
//   here). Secret values are scrubbed from everything logged or stored.
// - Output files are copied to uploads/ and registered as testing data
//   ("data" evidence) for the application; blocker/limitation files are
//   kept on the run for the user to read.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { collectorRuns, evidenceDocuments } from "@/db/schema";
import { decryptSecret } from "./secrets";

const ROOT = process.cwd();
const VENV = path.join(ROOT, ".collectors-venv");
const VENV_PY = path.join(VENV, "bin", "python");
const RUNS_ROOT = path.join(ROOT, "collector-runs");
const UPLOAD_ROOT = path.join(ROOT, "uploads");
const RUN_TIMEOUT_MS = 60 * 60 * 1000;
const LOG_CAP = 200_000;
const TEXT_CAP = 300_000;
const TEXT_EXT = new Set(["json", "csv", "txt", "md", "log", "xml", "tsv"]);

// Survives dev-server module reloads.
const g = globalThis as unknown as { __collectorRuns?: Map<string, string> };
const active = (g.__collectorRuns ??= new Map<string, string>()); // applicationId -> runId

// Only these variables reach the child process (not the app's own env).
const asEnv = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

export function runningFor(applicationId: string): string | undefined {
  return active.get(applicationId);
}

function exec(cmd: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd ?? ROOT, env: asEnv({ PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: "C.UTF-8" }) });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs ?? 10 * 60 * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: 1, out: String(e.message) });
    });
  });
}

export async function ensurePythonEnv(requirements: string[]): Promise<string> {
  try {
    await stat(VENV_PY);
  } catch {
    const made = await exec("python3", ["-m", "venv", VENV]);
    if (made.code !== 0) {
      throw new Error(
        /ensurepip|python3[\d.]*-venv/.test(made.out)
          ? "Python can't create the collectors environment yet. Run this once in a terminal, then try again:  sudo apt install -y python3.14-venv"
          : `Couldn't create the Python environment: ${made.out.slice(0, 300)}`
      );
    }
  }
  const valid = requirements.filter((r) => /^[A-Za-z0-9][A-Za-z0-9._\-[\]=<>!~,]*$/.test(r));
  if (valid.length) {
    const pip = await exec(VENV_PY, ["-m", "pip", "install", "--disable-pip-version-check", "-q", ...valid]);
    if (pip.code !== 0) throw new Error(`Installing the script's Python packages failed: ${pip.out.slice(-600)}`);
  }
  return VENV_PY;
}

function scrub(text: string, secrets: string[]): string {
  let out = text;
  for (const s of secrets) if (s.length >= 4) out = out.split(s).join("********");
  return out;
}

const slug = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "_");

// Folder holding an application's collector run folders.
export const runsDirFor = (applicationId: string) => path.join(RUNS_ROOT, slug(applicationId));

export async function startRun(input: {
  runId: string;
  applicationId: string;
  controlName: string;
  code: string;
  appNotes: string;
  requirements: string[];
  variables: Array<{ name: string; secret: boolean; value: string }>;
}): Promise<void> {
  const { runId, applicationId } = input;
  active.set(applicationId, runId);
  const secrets: string[] = [];
  let log = "";
  const save = async (fields: Partial<typeof collectorRuns.$inferInsert>) => {
    await db.update(collectorRuns).set(fields).where(eq(collectorRuns.id, runId));
  };

  try {
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      LANG: "C.UTF-8",
      TZ: "UTC",
      PYTHONUNBUFFERED: "1",
    };
    for (const k of ["HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "https_proxy", "http_proxy", "no_proxy", "REQUESTS_CA_BUNDLE", "SSL_CERT_FILE"]) {
      if (process.env[k]) env[k] = process.env[k]!;
    }
    for (const v of input.variables) {
      const value = v.secret ? (v.value ? decryptSecret(v.value) : "") : v.value;
      if (v.secret && value) secrets.push(value);
      env[v.name] = value;
    }

    log += `[work-governor] preparing Python environment…\n`;
    await save({ log });
    const python = await ensurePythonEnv(input.requirements);

    const dir = path.join(RUNS_ROOT, slug(applicationId), runId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "collect_users.py"), input.code);
    await writeFile(path.join(dir, "app-notes.md"), input.appNotes);
    env.OUTPUT_DIR = dir;

    log += `[work-governor] running collect_users.py (read-only collector)…\n`;
    await save({ log });

    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(python, ["collect_users.py"], { cwd: dir, env: asEnv(env) });
      let pending = false;
      const append = (d: Buffer) => {
        log = scrub((log + d.toString()).slice(-LOG_CAP), secrets);
        if (!pending) {
          pending = true;
          setTimeout(() => {
            pending = false;
            void save({ log });
          }, 2000);
        }
      };
      child.stdout.on("data", append);
      child.stderr.on("data", append);
      const timer = setTimeout(() => {
        log += "\n[work-governor] stopped: the run exceeded 60 minutes.\n";
        child.kill("SIGKILL");
      }, RUN_TIMEOUT_MS);
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve(code ?? 1);
      });
      child.on("error", (e) => {
        clearTimeout(timer);
        log += `\n[work-governor] couldn't start Python: ${e.message}\n`;
        resolve(1);
      });
    });

    // Collect what the script wrote.
    const skip = new Set(["collect_users.py", "app-notes.md", "__pycache__"]);
    const outputs: Array<{ name: string; bytes: number }> = [];
    const blockers: Array<{ name: string; text: string }> = [];
    const evidenceIds: string[] = [];
    const uploadDir = path.join(UPLOAD_ROOT, applicationId);
    await mkdir(uploadDir, { recursive: true });

    for (const name of (await readdir(dir)).sort()) {
      if (skip.has(name)) continue;
      const full = path.join(dir, name);
      const info = await stat(full);
      if (!info.isFile()) continue;
      if (/blocker|limitation/i.test(name) && name.endsWith(".md")) {
        blockers.push({ name, text: scrub((await readFile(full, "utf8")).slice(0, 20_000), secrets) });
        continue;
      }
      outputs.push({ name, bytes: info.size });
      const ext = path.extname(name).toLowerCase().slice(1);
      const stored = path.join(uploadDir, `${Date.now()}-${slug(name)}`);
      await copyFile(full, stored);
      let text = "";
      if (TEXT_EXT.has(ext)) {
        // Read only the start of large files.
        const fh = await import("node:fs/promises").then((m) => m.open(full, "r"));
        const buf = Buffer.alloc(Math.min(info.size, TEXT_CAP * 4));
        await fh.read(buf, 0, buf.length, 0);
        await fh.close();
        text = scrub(buf.toString("utf8").slice(0, TEXT_CAP), secrets);
      }
      const id = `evidence-${Date.now()}-${randomUUID().slice(0, 8)}`;
      await db.insert(evidenceDocuments).values({
        id,
        applicationId,
        filename: name,
        fileType: ext || "bin",
        storagePath: path.relative(ROOT, stored),
        kind: "data",
        scope: input.controlName ? "selected" : "all",
        controlNames: input.controlName ? [input.controlName] : [],
        extractedText: text,
        truncated: info.size > TEXT_CAP,
      });
      evidenceIds.push(id);
    }

    const status = exitCode === 0 ? "succeeded" : blockers.length ? "blocked" : "failed";
    log += `\n[work-governor] finished (exit ${exitCode}): ${outputs.length} output file(s) attached as testing data${blockers.length ? `, ${blockers.length} blocker/limitation file(s)` : ""}.\n`;
    await save({ status, exitCode, log: scrub(log, secrets), outputFiles: outputs, blockers, evidenceIds, finishedAt: new Date() });
  } catch (error) {
    log += `\n[work-governor] ${scrub(error instanceof Error ? error.message : String(error), secrets)}\n`;
    await save({ status: "failed", log, finishedAt: new Date() });
  } finally {
    active.delete(applicationId);
  }
}
