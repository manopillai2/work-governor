// Starts a collector run (approved script + its connection) in the
// background and reports its status. See services/collectorRunner.ts.

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { appConnections, collectorRuns, collectorScripts } from "@/db/schema";
import { runningFor, startRun } from "@/services/collectorRunner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const applicationId = String(body.applicationId ?? "");
    const [script] = await db.select().from(collectorScripts).where(and(eq(collectorScripts.id, String(body.scriptId)), eq(collectorScripts.applicationId, applicationId)));
    if (!script || script.status !== "approved") {
      return NextResponse.json({ error: "Only an approved script version can run." }, { status: 400 });
    }
    const connectionId = String(body.connectionId ?? script.connectionId ?? "");
    const [conn] = await db.select().from(appConnections).where(and(eq(appConnections.id, connectionId), eq(appConnections.applicationId, applicationId)));
    if (!conn) return NextResponse.json({ error: "Choose a connection to run with." }, { status: 400 });
    // Blank values are allowed: scripts often support alternative auth
    // (client credentials OR username/password) or auto-detect a value.
    if (!conn.variables.some((v) => v.value)) {
      return NextResponse.json({ error: "This connection has no values filled in yet." }, { status: 400 });
    }
    if (runningFor(applicationId)) return NextResponse.json({ error: "A collection is already running for this application." }, { status: 409 });

    const runId = `run-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const controlName = String(body.controlName ?? "");
    await db.insert(collectorRuns).values({ id: runId, applicationId, scriptId: script.id, connectionId: conn.id, controlName, status: "running" });

    // Runs in the background; the client polls GET ?runId=.
    void startRun({
      runId,
      applicationId,
      controlName,
      code: script.code,
      appNotes: script.appNotes,
      requirements: script.requirements,
      variables: conn.variables,
    });
    return NextResponse.json({ runId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Starting the collection failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId") ?? "";
  const [run] = await db.select().from(collectorRuns).where(eq(collectorRuns.id, runId));
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  return NextResponse.json({
    run: {
      ...run,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
    },
  });
}
