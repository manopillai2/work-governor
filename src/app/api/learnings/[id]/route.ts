import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { learningNotes, learnings } from "@/db/learning-schema";

// Either a decision (status) or pop-up housekeeping for a pending
// learning (snoozeHours / reviewInHub). "pending" re-opens a denied or
// revoked learning so it can be decided again.
type RespondBody = {
  status?: "accepted" | "rejected" | "pending";
  framework?: string | null;
  hosting?: string | null;
  note?: string;
  snoozeHours?: number;
  reviewInHub?: boolean;
};

const STATUSES = ["accepted", "rejected", "pending"];

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

  const snoozeHours = Number(body.snoozeHours);
  const isSnooze = Number.isFinite(snoozeHours) && snoozeHours > 0;

  if (body.status === undefined) {
    if (!isSnooze && body.reviewInHub === undefined) {
      return NextResponse.json(
        { error: "Send a status, snoozeHours or reviewInHub." },
        { status: 400 }
      );
    }

    const [parked] = await learningDb
      .update(learnings)
      .set({
        ...(isSnooze
          ? { snoozedUntil: new Date(Date.now() + snoozeHours * 3_600_000) }
          : {}),
        ...(body.reviewInHub !== undefined
          ? { reviewInHub: body.reviewInHub }
          : {}),
      })
      .where(eq(learnings.id, id))
      .returning();

    return parked
      ? NextResponse.json({ learning: parked })
      : NextResponse.json({ error: "Learning not found." }, { status: 404 });
  }

  if (!STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: "status must be 'accepted', 'rejected' or 'pending'." },
      { status: 400 }
    );
  }

  const [updated] = await learningDb
    .update(learnings)
    .set({
      status: body.status,
      respondedAt: body.status === "pending" ? null : new Date(),
      // A decision (or re-opening) clears any pop-up snooze / parking;
      // re-opened learnings wait on the Learnings page, not the pop-up.
      snoozedUntil: null,
      reviewInHub: body.status === "pending",
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
