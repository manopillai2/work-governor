import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { learningNotes, learnings } from "@/db/learning-schema";

type RespondBody = {
  status: "accepted" | "rejected";
  framework?: string | null;
  hosting?: string | null;
  note?: string;
};

function createNoteId(): string {
  return `learning-note-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as RespondBody;

  if (body.status !== "accepted" && body.status !== "rejected") {
    return NextResponse.json(
      { error: "status must be 'accepted' or 'rejected'." },
      { status: 400 }
    );
  }

  const [updated] = await learningDb
    .update(learnings)
    .set({
      status: body.status,
      respondedAt: new Date(),
      ...(body.framework !== undefined
        ? { framework: body.framework }
        : {}),
      ...(body.hosting !== undefined
        ? { hosting: body.hosting }
        : {}),
    })
    .where(eq(learnings.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Learning not found." },
      { status: 404 }
    );
  }

  if (body.note && body.note.trim()) {
    await learningDb.insert(learningNotes).values({
      id: createNoteId(),
      learningId: id,
      note: body.note.trim(),
    });
  }

  return NextResponse.json({ learning: updated });
}
