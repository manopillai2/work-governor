// Application connections (services/collectors.ts). Secret values are
// encrypted on save and NEVER returned: the browser only learns that a
// secret is set. Saving a secret field blank keeps the stored value.

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { appConnections } from "@/db/schema";
import { ENV_NAME, type AppConnection, type ConnectionVariable } from "@/services/collectors";
import { encryptSecret } from "@/services/secrets";

type Row = typeof appConnections.$inferSelect;

function toClient(row: Row): AppConnection {
  return {
    id: row.id,
    applicationId: row.applicationId,
    label: row.label,
    environment: row.environment,
    platform: row.platform,
    authMethod: row.authMethod,
    variables: row.variables.map((v) => (v.secret ? { name: v.name, secret: true, value: "", hasValue: Boolean(v.value) } : { name: v.name, secret: false, value: v.value })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const applicationId = new URL(request.url).searchParams.get("applicationId") ?? "";
  const rows = await db.select().from(appConnections).where(eq(appConnections.applicationId, applicationId));
  return NextResponse.json({ connections: rows.map(toClient) });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AppConnection> & { variables?: ConnectionVariable[] };
    const applicationId = String(body.applicationId ?? "").trim();
    const label = String(body.label ?? "").trim();
    if (!applicationId || !label) return NextResponse.json({ error: "Application and connection name are required." }, { status: 400 });

    const incoming = Array.isArray(body.variables) ? body.variables : [];
    const names = new Set<string>();
    for (const v of incoming) {
      const name = String(v.name ?? "").trim();
      if (!ENV_NAME.test(name)) return NextResponse.json({ error: `"${name}" isn't a valid variable name (capital letters, digits and _).` }, { status: 400 });
      if (names.has(name)) return NextResponse.json({ error: `${name} is listed twice.` }, { status: 400 });
      names.add(name);
    }

    const existing = body.id
      ? (await db.select().from(appConnections).where(and(eq(appConnections.id, body.id), eq(appConnections.applicationId, applicationId))))[0]
      : undefined;
    const previous = new Map((existing?.variables ?? []).map((v) => [v.name, v]));

    const variables = incoming.map((v) => {
      const name = String(v.name).trim();
      const value = String(v.value ?? "");
      if (!v.secret) return { name, secret: false, value: value.trim() };
      if (value) return { name, secret: true, value: encryptSecret(value) };
      // Blank secret = keep the saved one (also across a rename).
      const prior = previous.get(String(v.previousName ?? name));
      return { name, secret: true, value: prior?.secret ? prior.value : "" };
    });

    const values = {
      applicationId,
      label,
      environment: String(body.environment ?? "").trim(),
      platform: String(body.platform ?? "REST"),
      authMethod: String(body.authMethod ?? ""),
      variables,
      updatedAt: new Date(),
    };
    let row: Row;
    if (existing) {
      [row] = await db.update(appConnections).set(values).where(eq(appConnections.id, existing.id)).returning();
    } else {
      [row] = await db.insert(appConnections).values({ id: `conn-${Date.now()}-${randomUUID().slice(0, 6)}`, ...values }).returning();
    }
    return NextResponse.json({ connection: toClient(row) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Saving the connection failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await db.delete(appConnections).where(eq(appConnections.id, id));
  return NextResponse.json({ ok: true });
}
