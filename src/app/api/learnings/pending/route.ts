import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { learnings } from "@/db/learning-schema";

export async function GET() {
  const rows = await learningDb
    .select()
    .from(learnings)
    .where(eq(learnings.status, "pending"))
    .orderBy(asc(learnings.createdAt));

  return NextResponse.json({ learnings: rows });
}
