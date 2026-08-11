import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { learnings } from "@/db/learning-schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ChangeLogEntryInput = {
  changeType: "ADDED" | "REMOVED";
  taskText: string;
  reason: string;
};

type AnalyzeRequestBody = {
  applicationId: string;
  controlId: string;
  framework: string;
  hosting: string;
  controlObjective: string;
  changeLogEntries: ChangeLogEntryInput[];
};

type AnalysisResult = {
  changeType: "ADDED" | "REMOVED";
  taskText: string;
  shouldCapture: boolean;
  content?: string;
  suggestedTaskText?: string;
  suggestedCategory?: string;
  suggestedFramework?: string;
  suggestedHosting?: string;
};

function createLearningId(): string {
  return `learning-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;

    const changeLogEntries = Array.isArray(
      body.changeLogEntries
    )
      ? body.changeLogEntries
      : [];

    if (changeLogEntries.length === 0) {
      return NextResponse.json({ learnings: [] });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,

      system: `
You are the Learning Engine analyzer for Control Governor, a compliance checklist tool.

You are given a batch of checklist changes a user just made to one control. Each
change already includes WHY, taken from the user's own notes, in "reason".

For each change, decide whether it represents generalizable knowledge that could
usefully apply to OTHER applications and controls in the future (of the same
compliance framework and/or hosting type), not just this one specific case.

A change is generalizable when the reason describes something structural or
reusable (a category of evidence, a type of access, a common gap in the default
checklist) rather than something purely specific to this one application's
idiosyncratic details (a person's name, a one-off event, a typo fix).

Most changes are NOT generalizable. Default to shouldCapture: false unless
there is a clear, well-reasoned case for reuse.

When shouldCapture is true, also produce:
- content: one or two plain sentences describing the recommendation in general terms.
- suggestedTaskText: for ADDED changes, the literal checklist item text to add to
  future matching checklists. For REMOVED changes, describe what future checklists
  should reconsider or avoid including by default.
- suggestedCategory: one of Homework, Discovery, Access, Evidence Collection,
  Validation, Approval, Argos Design, Next Steps.
- suggestedFramework: SOX, PCI DSS, or Any if it applies regardless of framework.
- suggestedHosting: SaaS, PaaS, IaaS, On-premises, or Any if it applies regardless
  of hosting type. Only pick a specific value when the reason clearly ties the
  learning to that hosting type; otherwise use Any.

Return exactly one analyze_checklist_learnings tool call, with one result per
change in the same order they were given.
`,

      messages: [
        {
          role: "user",
          content: `
CONTROL CONTEXT

Framework: ${body.framework}
Hosting: ${body.hosting}
Control Objective: ${body.controlObjective || "Not defined"}

CHECKLIST CHANGES TO ANALYZE

${changeLogEntries
  .map(
    (entry, index) =>
      `${index + 1}. [${entry.changeType}] "${entry.taskText}" — ${entry.reason}`
  )
  .join("\n")}
`,
        },
      ],

      tools: [
        {
          name: "analyze_checklist_learnings",
          description:
            "Decide, for each checklist change, whether it represents generalizable knowledge worth capturing as a learning.",

          input_schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    changeType: {
                      type: "string",
                      enum: ["ADDED", "REMOVED"],
                    },
                    taskText: { type: "string" },
                    shouldCapture: { type: "boolean" },
                    content: { type: "string" },
                    suggestedTaskText: { type: "string" },
                    suggestedCategory: {
                      type: "string",
                      enum: [
                        "Homework",
                        "Discovery",
                        "Access",
                        "Evidence Collection",
                        "Validation",
                        "Approval",
                        "Argos Design",
                        "Next Steps",
                      ],
                    },
                    suggestedFramework: {
                      type: "string",
                      enum: ["SOX", "PCI DSS", "Any"],
                    },
                    suggestedHosting: {
                      type: "string",
                      enum: [
                        "SaaS",
                        "PaaS",
                        "IaaS",
                        "On-premises",
                        "Any",
                      ],
                    },
                  },
                  required: ["changeType", "taskText", "shouldCapture"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      ],

      tool_choice: {
        type: "tool",
        name: "analyze_checklist_learnings",
      },
    });

    const toolCall = response.content.find(
      (block) =>
        block.type === "tool_use" &&
        block.name === "analyze_checklist_learnings"
    );

    if (!toolCall || toolCall.type !== "tool_use") {
      throw new Error(
        "Claude did not return a valid learning analysis."
      );
    }

    const results =
      ((toolCall.input as { results?: AnalysisResult[] })
        .results ?? []).filter(
        (result) => result.shouldCapture
      );

    if (results.length === 0) {
      return NextResponse.json({ learnings: [] });
    }

    const rows = results.map((result) => ({
      id: createLearningId(),
      content: result.content ?? "",
      suggestedTaskText: result.suggestedTaskText ?? "",
      suggestedCategory: result.suggestedCategory ?? "Discovery",
      framework:
        result.suggestedFramework &&
        result.suggestedFramework !== "Any"
          ? result.suggestedFramework
          : null,
      hosting:
        result.suggestedHosting &&
        result.suggestedHosting !== "Any"
          ? result.suggestedHosting
          : null,
      status: "pending",
      sourceApplicationId: body.applicationId,
      sourceControlId: body.controlId,
      sourceChangeType: result.changeType,
      sourceTaskText: result.taskText,
      sourceReason:
        changeLogEntries.find(
          (entry) =>
            entry.changeType === result.changeType &&
            entry.taskText === result.taskText
        )?.reason ?? "",
    }));

    const inserted = await learningDb
      .insert(learnings)
      .values(rows)
      .returning();

    return NextResponse.json({ learnings: inserted });
  } catch (error) {
    console.error("Learning Engine analyze error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
