import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { clientReferenceLearnings } from "@/db/learning-schema";

export async function GET() {
  const rows = await learningDb
    .select()
    .from(clientReferenceLearnings)
    .where(eq(clientReferenceLearnings.status, "pending"))
    .orderBy(asc(clientReferenceLearnings.createdAt));

  return NextResponse.json({ learnings: rows });
}
