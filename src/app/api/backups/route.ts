import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { backups } from "@/db/schema";
import type { BackupEntry } from "@/services/backup";
import type { ChatMessage } from "@/components/ChatPanel";
import type { Application } from "@/services/commandEngine";

type BackupSnapshot = {
  applications: Application[];
  messages: ChatMessage[];
};

export async function GET() {
  const rows = await db
    .select()
    .from(backups)
    .orderBy(desc(backups.version));

  const entries: BackupEntry[] = rows.map((row) => {
    const snapshot = row.snapshot as BackupSnapshot;

    return {
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      applications: snapshot.applications,
      messages: snapshot.messages,
    };
  });

  return NextResponse.json({ backups: entries });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BackupSnapshot;

  const existingVersions = await db
    .select({ version: backups.version })
    .from(backups);

  const nextVersion =
    existingVersions.reduce(
      (max, row) => Math.max(max, row.version),
      0
    ) + 1;

  const id = `backup-${nextVersion}-${Date.now()}`;

  const [inserted] = await db
    .insert(backups)
    .values({
      id,
      version: nextVersion,
      snapshot: {
        applications: body.applications,
        messages: body.messages,
      },
    })
    .returning();

  const entry: BackupEntry = {
    version: inserted.version,
    createdAt: inserted.createdAt.toISOString(),
    applications: body.applications,
    messages: body.messages,
  };

  return NextResponse.json({ backup: entry });
}
