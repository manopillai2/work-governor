// Collector scripts per application: list (with runs and importable
// folders), write/update with the AI (collect-app-data skill), import an
// existing collect_users.py, approve / reject. Every version passes the
// automatic security gate (services/collectorGate.ts); only an approved
// version can run (see ./run).

import { randomUUID } from "node:crypto";
import { readdir, readFile, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { appConnections, collectorRuns, collectorScripts, evidenceDocuments } from "@/db/schema";
import { checkCollectorScript, detectRequirements } from "@/services/collectorGate";
import { runningFor, runsDirFor } from "@/services/collectorRunner";
import type { CollectorRun, CollectorScript, SecurityReport } from "@/services/collectors";
import { writeCollectorScript } from "@/services/collectorWriter";
import { decryptSecret } from "@/services/secrets";

type ScriptRow = typeof collectorScripts.$inferSelect;
type RunRow = typeof collectorRuns.$inferSelect;

const toScript = (r: ScriptRow): CollectorScript => ({
  id: r.id,
  applicationId: r.applicationId,
  connectionId: r.connectionId,
  version: r.version,
  code: r.code,
  appNotes: r.appNotes,
  requirements: r.requirements,
  instruction: r.instruction,
  changeSummary: r.changeSummary,
  questions: r.questions,
  source: r.source as CollectorScript["source"],
  status: r.status as CollectorScript["status"],
  securityReport: r.securityReport as SecurityReport,
  createdAt: r.createdAt.toISOString(),
  reviewedAt: r.reviewedAt?.toISOString() ?? null,
});

const toRun = (r: RunRow, versions: Map<string, number>): CollectorRun => ({
  id: r.id,
  applicationId: r.applicationId,
  scriptId: r.scriptId,
  scriptVersion: versions.get(r.scriptId),
  controlName: r.controlName,
  status: r.status as CollectorRun["status"],
  exitCode: r.exitCode,
  log: r.log,
  outputFiles: r.outputFiles,
  blockers: r.blockers,
  evidenceIds: r.evidenceIds,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
});

const IMPORT_DIR = () => process.env.COLLECTORS_IMPORT_DIR ?? "";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Folders in COLLECTORS_IMPORT_DIR with a collect_users.py whose name
// matches the application (e.g. "Salesforce - CXT" -> Salesforce-CXT-Prod).
async function importCandidates(applicationName: string): Promise<string[]> {
  const root = IMPORT_DIR();
  if (!root || !applicationName) return [];
  const want = norm(applicationName).split(" ").filter(Boolean);
  try {
    const out: string[] = [];
    for (const name of await readdir(root)) {
      const words = norm(name).split(" ");
      if (!want.every((w) => words.includes(w))) continue;
      try {
        await stat(path.join(root, name, "collect_users.py"));
        out.push(name);
      } catch {}
    }
    return out.sort();
  } catch {
    return [];
  }
}

async function connectionFor(applicationId: string, connectionId: string | null | undefined) {
  if (!connectionId) return undefined;
  return (await db.select().from(appConnections).where(and(eq(appConnections.id, connectionId), eq(appConnections.applicationId, applicationId))))[0];
}

function secretValues(conn: Awaited<ReturnType<typeof connectionFor>>): string[] {
  const out: string[] = [];
  for (const v of conn?.variables ?? []) {
    if (!v.secret || !v.value) continue;
    try {
      out.push(decryptSecret(v.value));
    } catch {}
  }
  return out;
}

async function nextVersion(applicationId: string): Promise<number> {
  const [last] = await db.select({ v: collectorScripts.version }).from(collectorScripts).where(eq(collectorScripts.applicationId, applicationId)).orderBy(desc(collectorScripts.version)).limit(1);
  return (last?.v ?? 0) + 1;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const applicationId = params.get("applicationId") ?? "";
  const scripts = await db.select().from(collectorScripts).where(eq(collectorScripts.applicationId, applicationId)).orderBy(desc(collectorScripts.version));
  const runs = await db.select().from(collectorRuns).where(eq(collectorRuns.applicationId, applicationId)).orderBy(desc(collectorRuns.startedAt)).limit(20);
  const versions = new Map(scripts.map((s) => [s.id, s.version]));
  return NextResponse.json({
    scripts: scripts.map(toScript),
    runs: runs.map((r) => toRun(r, versions)),
    running: runningFor(applicationId) ?? null,
    importCandidates: await importCandidates(params.get("applicationName") ?? ""),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const applicationId = String(body.applicationId ?? "");
    const action = String(body.action ?? "");

    if (action === "approve" || action === "reject") {
      const [script] = await db.select().from(collectorScripts).where(and(eq(collectorScripts.id, String(body.scriptId)), eq(collectorScripts.applicationId, applicationId)));
      if (!script) return NextResponse.json({ error: "Script not found." }, { status: 404 });
      if (action === "approve") {
        if (script.status !== "draft") return NextResponse.json({ error: "Only a draft version can be approved." }, { status: 400 });
        // Re-check at approval time against the connection's current secrets.
        const conn = await connectionFor(applicationId, script.connectionId);
        const report = checkCollectorScript(script.code, { envVarNames: (conn?.variables ?? []).map((v) => v.name), secretValues: secretValues(conn) });
        if (!report.passed) {
          await db.update(collectorScripts).set({ securityReport: report }).where(eq(collectorScripts.id, script.id));
          return NextResponse.json({ error: `This version can't be approved: ${report.blockers.join(" ")}` }, { status: 400 });
        }
      }
      await db.update(collectorScripts).set({ status: action === "approve" ? "approved" : "rejected", reviewedAt: new Date() }).where(eq(collectorScripts.id, script.id));
      return NextResponse.json({ ok: true });
    }

    const conn = await connectionFor(applicationId, body.connectionId);
    const envVarNames = (conn?.variables ?? []).map((v) => v.name);

    if (action === "import") {
      const folder = String(body.folder ?? "");
      if (!folder || folder.includes("/") || folder.includes("..") || !IMPORT_DIR()) {
        return NextResponse.json({ error: "Choose one of the listed folders." }, { status: 400 });
      }
      const dir = path.join(IMPORT_DIR(), folder);
      const code = await readFile(path.join(dir, "collect_users.py"), "utf8");
      let appNotes = "";
      try {
        appNotes = await readFile(path.join(dir, "app-notes.md"), "utf8");
      } catch {}
      const report = checkCollectorScript(code, { envVarNames, secretValues: secretValues(conn) });
      const [row] = await db
        .insert(collectorScripts)
        .values({
          id: `collector-${Date.now()}-${randomUUID().slice(0, 6)}`,
          applicationId,
          connectionId: conn?.id ?? null,
          version: await nextVersion(applicationId),
          code,
          appNotes,
          requirements: detectRequirements(code),
          instruction: `Imported from ${folder}/collect_users.py`,
          changeSummary: `Imported the existing collector from ${folder}.`,
          source: "imported",
          status: "draft",
          securityReport: report,
        })
        .returning();
      // Variables the script reads -> lets the UI pre-fill the connection.
      const envNames = [...new Set([...code.matchAll(/(?:environ\.get|getenv|environ\[)\(?\s*["']([A-Z][A-Z0-9_]+)["']/g)].map((m) => m[1]))].filter((n) => n !== "OUTPUT_DIR");
      return NextResponse.json({ script: toScript(row), envNames });
    }

    if (action === "generate") {
      if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
      if (!conn) return NextResponse.json({ error: "Add a connection first — the script needs to know how to reach the application." }, { status: 400 });
      const scripts = await db.select().from(collectorScripts).where(eq(collectorScripts.applicationId, applicationId)).orderBy(desc(collectorScripts.version));
      const previous = scripts.find((s) => s.status !== "rejected" && s.status !== "needs_input" && s.code.trim());
      const [lastRunRow] = await db.select().from(collectorRuns).where(eq(collectorRuns.applicationId, applicationId)).orderBy(desc(collectorRuns.startedAt)).limit(1);
      const versions = new Map(scripts.map((s) => [s.id, s.version]));

      const { result, usage } = await writeCollectorScript({
        applicationName: String(body.applicationName ?? applicationId),
        platform: conn.platform,
        authMethod: conn.authMethod,
        environment: conn.environment,
        variables: conn.variables.map((v) => ({ name: v.name, secret: v.secret, value: v.secret ? "" : v.value })),
        instruction: String(body.instruction ?? ""),
        previous: previous ? toScript(previous) : null,
        lastRun: lastRunRow ? toRun(lastRunRow, versions) : null,
        dataGaps: Array.isArray(body.dataGaps) ? body.dataGaps.map(String).slice(0, 30) : [],
      });
      console.log(`[collector writer] app="${applicationId}" ${usage}`);

      const needsInput = result.status === "needs_input" || !result.code.trim();
      const report: SecurityReport = needsInput
        ? { passed: false, blockers: [], warnings: [] }
        : checkCollectorScript(result.code, { envVarNames, secretValues: secretValues(conn) });
      const requirements = [...new Set([...(result.requirements ?? []), ...detectRequirements(result.code ?? "")])].sort();
      const [row] = await db
        .insert(collectorScripts)
        .values({
          id: `collector-${Date.now()}-${randomUUID().slice(0, 6)}`,
          applicationId,
          connectionId: conn.id,
          version: await nextVersion(applicationId),
          code: needsInput ? previous?.code ?? "" : result.code,
          appNotes: needsInput ? previous?.appNotes ?? "" : result.appNotes,
          requirements: needsInput ? previous?.requirements ?? [] : requirements,
          instruction: String(body.instruction ?? ""),
          changeSummary: result.changeSummary ?? "",
          questions: result.questions ?? [],
          source: "generated",
          status: needsInput ? "needs_input" : "draft",
          securityReport: report,
        })
        .returning();
      return NextResponse.json({ script: toScript(row) });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Collectors error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The request failed." }, { status: 500 });
  }
}

// Clear everything Data collection holds for one application:
// connections (and their encrypted secrets), every script version, the
// run history and run folders, and the testing data the runs attached
// (files + their cached profiles). Hand-uploaded files are not touched.
// ?parts=connections,scripts,runs,files picks what to clear (default: all).
export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const applicationId = params.get("applicationId") ?? "";
  const parts = new Set((params.get("parts") ?? "connections,scripts,runs,files").split(",").map((p) => p.trim()));
  if (!applicationId) return NextResponse.json({ error: "Application is required." }, { status: 400 });
  if (runningFor(applicationId)) {
    return NextResponse.json({ error: "A collection is running for this application — wait for it to finish first." }, { status: 409 });
  }

  const runs = await db.select({ evidenceIds: collectorRuns.evidenceIds }).from(collectorRuns).where(eq(collectorRuns.applicationId, applicationId));
  const evidenceIds = [...new Set(runs.flatMap((r) => r.evidenceIds))];
  let files = 0;
  if (parts.has("files") && evidenceIds.length) {
    const docs = await db
      .select({ id: evidenceDocuments.id, storagePath: evidenceDocuments.storagePath })
      .from(evidenceDocuments)
      .where(and(eq(evidenceDocuments.applicationId, applicationId), inArray(evidenceDocuments.id, evidenceIds)));
    for (const d of docs) {
      const full = path.join(process.cwd(), d.storagePath);
      await unlink(full).catch(() => {});
      await unlink(`${full}.profile.json`).catch(() => {});
    }
    if (docs.length) {
      await db.delete(evidenceDocuments).where(inArray(evidenceDocuments.id, docs.map((d) => d.id)));
    }
    files = docs.length;
    // Runs that are kept no longer point at the removed files.
    if (!parts.has("runs")) {
      await db.update(collectorRuns).set({ evidenceIds: [] }).where(eq(collectorRuns.applicationId, applicationId));
    }
  }

  // Cached cross-file facts may include the removed files.
  try {
    const uploadDir = path.join(process.cwd(), "uploads", applicationId);
    for (const name of await readdir(uploadDir)) {
      if (name.startsWith(".identity-facts-")) await unlink(path.join(uploadDir, name)).catch(() => {});
    }
  } catch {}

  const deletedRuns = parts.has("runs")
    ? await db.delete(collectorRuns).where(eq(collectorRuns.applicationId, applicationId)).returning({ id: collectorRuns.id })
    : [];
  if (parts.has("runs")) await rm(runsDirFor(applicationId), { recursive: true, force: true });
  const deletedScripts = parts.has("scripts")
    ? await db.delete(collectorScripts).where(eq(collectorScripts.applicationId, applicationId)).returning({ id: collectorScripts.id })
    : [];
  const deletedConnections = parts.has("connections")
    ? await db.delete(appConnections).where(eq(appConnections.applicationId, applicationId)).returning({ id: appConnections.id })
    : [];

  return NextResponse.json({
    cleared: { connections: deletedConnections.length, scripts: deletedScripts.length, runs: deletedRuns.length, files },
  });
}
