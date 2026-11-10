import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

export async function GET() {
  const checkedAt = new Date().toISOString();
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  const dbStart = Date.now();
  let database: { status: "up" | "down"; latencyMs?: number; error?: string };

  try {
    await db.execute(sql`select 1`);
    database = { status: "up", latencyMs: Date.now() - dbStart };
  } catch (error) {
    database = {
      status: "down",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }

  const memory = process.memoryUsage();
  const ok = database.status === "up";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checkedAt,
      uptimeSeconds,
      database,
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
    },
    { status: ok ? 200 : 503 }
  );
}
