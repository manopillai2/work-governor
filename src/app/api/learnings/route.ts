// Every learning, whatever its status -- for the Learnings page. The
// pop-up uses /api/learnings/pending (pending only).
import { desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import {
  clientReferenceLearnings,
  learningNotes,
  learnings,
} from "@/db/learning-schema";

export async function GET() {
  const rows = await learningDb
    .select()
    .from(learnings)
    .orderBy(desc(learnings.createdAt));

  const notes = rows.length
    ? await learningDb
        .select()
        .from(learningNotes)
        .where(
          inArray(
            learningNotes.learningId,
            rows.map((row) => row.id)
          )
        )
    : [];

  const codes = await learningDb
    .select()
    .from(clientReferenceLearnings)
    .orderBy(desc(clientReferenceLearnings.createdAt));

  return NextResponse.json({
    learnings: rows.map((row) => ({
      ...row,
      notes: notes
        .filter((note) => note.learningId === row.id)
        .map((note) => ({
          id: note.id,
          note: note.note,
          createdAt: note.createdAt,
        })),
    })),
    clientReferenceLearnings: codes,
  });
}
