import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { clientReferenceLearnings } from "@/db/learning-schema";

type RespondBody = {
  status: "accepted" | "rejected";
};

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
      respondedAt: new Date(),
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
