import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { clientReferenceLearnings } from "@/db/learning-schema";

type RespondBody = {
  status?: "accepted" | "rejected" | "pending";
  snoozeHours?: number;
  reviewInHub?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as RespondBody;

  const snoozeHours = Number(body.snoozeHours);
  const isSnooze = Number.isFinite(snoozeHours) && snoozeHours > 0;

  // Pop-up housekeeping only (snooze / park on the Learnings page).
  if (body.status === undefined) {
    if (!isSnooze && body.reviewInHub === undefined) {
      return NextResponse.json(
        { error: "Send a status, snoozeHours or reviewInHub." },
        { status: 400 }
      );
    }

    const [parked] = await learningDb
      .update(clientReferenceLearnings)
      .set({
        ...(isSnooze
          ? { snoozedUntil: new Date(Date.now() + snoozeHours * 3_600_000) }
          : {}),
        ...(body.reviewInHub !== undefined
          ? { reviewInHub: body.reviewInHub }
          : {}),
      })
      .where(eq(clientReferenceLearnings.id, id))
      .returning();

    return parked
      ? NextResponse.json({ learning: parked })
      : NextResponse.json({ error: "Learning not found." }, { status: 404 });
  }

  if (!["accepted", "rejected", "pending"].includes(body.status)) {
    return NextResponse.json(
      { error: "status must be 'accepted', 'rejected' or 'pending'." },
      { status: 400 }
    );
  }

  // Deliberately does not touch the main app DB here -- the client
  // holds the authoritative in-memory application/control state and
  // auto-saves the whole thing on every change (see the PUT /api/state
  // effect in page.tsx), so a direct write here would just get
  // silently overwritten by the next autosave. The client backfills
  // the source control's clientContext itself after a successful
  // accept response.
  const [updated] = await learningDb
    .update(clientReferenceLearnings)
    .set({
      status: body.status,
      respondedAt: body.status === "pending" ? null : new Date(),
      snoozedUntil: null,
      reviewInHub: body.status === "pending",
    })
    .where(eq(clientReferenceLearnings.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Learning not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ learning: updated });
}
