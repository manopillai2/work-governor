import { unlink } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { evidenceDocuments } from "@/db/schema";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [deleted] = await db
    .delete(evidenceDocuments)
    .where(eq(evidenceDocuments.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Evidence document not found." },
      { status: 404 }
    );
  }

  try {
    await unlink(
      path.join(process.cwd(), deleted.storagePath)
    );
  } catch (error) {
    // The DB row is already gone -- a missing file on disk (already
    // deleted, moved, or never written) shouldn't block the delete
    // from succeeding from the user's point of view.
    console.error(
      `Unable to remove evidence file on disk for ${id}:`,
      error
    );
  }

  return NextResponse.json({ evidence: deleted });
}
