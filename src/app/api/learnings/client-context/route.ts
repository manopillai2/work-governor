import { and, ilike, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { clientReferenceLearnings } from "@/db/learning-schema";

type CreateBody = {
  code: string;
  title: string;
  sourceQuote: string;
  sourceApplicationId: string;
  sourceControlId: string;
  sourceControlName: string;
};

function createClientReferenceLearningId(): string {
  return `client-ref-learning-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateBody;

  if (
    !body.code?.trim() ||
    !body.title?.trim() ||
    !body.sourceApplicationId ||
    !body.sourceControlId
  ) {
    return NextResponse.json(
      { error: "code, title, sourceApplicationId, and sourceControlId are required." },
      { status: 400 }
    );
  }

  const [existing] = await learningDb
    .select({ id: clientReferenceLearnings.id })
    .from(clientReferenceLearnings)
    .where(
      and(
        ilike(
          clientReferenceLearnings.code,
          body.code.trim()
        ),
        ne(clientReferenceLearnings.status, "rejected")
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ learning: null });
  }

  const [inserted] = await learningDb
    .insert(clientReferenceLearnings)
    .values({
      id: createClientReferenceLearningId(),
      code: body.code.trim(),
      title: body.title.trim(),
      status: "pending",
      sourceApplicationId: body.sourceApplicationId,
      sourceControlId: body.sourceControlId,
      sourceControlName: body.sourceControlName ?? "",
      sourceQuote: body.sourceQuote ?? "",
    })
    .returning();

  return NextResponse.json({
    learning: inserted,
  });
}
