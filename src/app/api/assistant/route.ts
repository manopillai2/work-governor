import Anthropic from "@anthropic-ai/sdk";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning-client";
import { learnings } from "@/db/learning-schema";
import type {
  Application,
  ApplicationContextInput,
  ChecklistChangeType,
  ChecklistMode,
  ChecklistStatus,
  ChecklistTaskInput,
  Command,
  ControlStatus,
  Framework,
  HomeworkStatus,
  MeetingPrepEmail,
  MeetingResponseControlUpdate,
  NoteMode,
  QaScoreLevel,
  WorkflowStage,
} from "@/services/commandEngine";

const anthropic = new Anthropic({
  apiKey:
    process.env.ANTHROPIC_API_KEY,
});

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type ContextualControlInput = {
  control: string;
  controlObjective: string;
  controlRisk: string;
  applicabilityRationale: string;
  evidenceStrategy: string;
  argosObjective: string;
  tasks: ChecklistTaskInput[];
};

type ClaudeCommandInput = {
  action:
    | "CREATE_APPLICATION"
    | "UPDATE_APPLICATION_CONTEXT"
    | "RENAME_APPLICATION"
    | "ADD_CONTROL"
    | "REGENERATE_CONTROL_CHECKLIST"
    | "GENERATE_CONTEXTUAL_CHECKLISTS"
    | "UPDATE_HOMEWORK"
    | "UPDATE_CONTROL_WORK"
    | "UPDATE_ALL_CONTROLS"
    | "UPDATE_NOTES"
    | "UPDATE_CHECKLIST"
    | "UPDATE_TASK_NOTES"
    | "UPDATE_CHECKLIST_STATUS"
    | "UPDATE_CONTROL_STATUS"
    | "DELETE_APPLICATION"
    | "DELETE_ALL_APPLICATIONS"
    | "CLEAR_CHAT_HISTORY"
    | "EXPORT_PROGRESS_REPORT"
    | "EXPORT_MEETING_PREP_EMAIL"
    | "PROCESS_MEETING_RESPONSE"
    | "BACKUP_APPLICATION_DATA"
    | "LIST_BACKUPS"
    | "ROLLBACK_BACKUP"
    | "RESPOND_ONLY";

  payload: {
    application?: string;
    hosting?: string;

    context?: ApplicationContextInput;

    newName?: string;

    controls?: Array<{
      name: string;
      framework: Framework;
      tasks?: ChecklistTaskInput[];
    }>;

    contextualControls?:
      ContextualControlInput[];

    control?: string;
    framework?: Framework;

    controlObjective?: string;
    controlRisk?: string;
    applicabilityRationale?: string;
    evidenceStrategy?: string;
    argosObjective?: string;

    status?: HomeworkStatus;
    homeworkStatus?: HomeworkStatus;
    stage?: WorkflowStage;

    controlStatus?: ControlStatus;
    checklistStatus?: ChecklistStatus;

    note?: string;
    notes?: string[];
    noteMode?: NoteMode;

    nextTasks?: ChecklistTaskInput[];

    checklistMode?: ChecklistMode;
    tasks?: ChecklistTaskInput[];
    maxItems?: number;

    taskText?: string;

    addTasks?: ChecklistTaskInput[];
    markIrrelevantTaskTexts?: string[];

    changeLogEntries?: Array<{
      changeType: ChecklistChangeType;
      taskText: string;
      reason: string;
    }>;

    progressSummary?: string;
    qaScore?: QaScoreLevel;
    qaScoreRationale?: string;

    version?: number;

    confirmed?: boolean;
    message?: string;

    email?: MeetingPrepEmail;

    controlUpdates?: MeetingResponseControlUpdate[];
    unmatchedNotes?: string[];
  };
};

function summarizeApplications(
  applications: Application[]
): string {
  if (applications.length === 0) {
    return "No applications currently exist.";
  }

  return applications
    .map((application) => {
      const controls =
        application.controls
          .map((control) => {
            const tasks =
              control.nextTasks.length > 0
                ? control.nextTasks
                    .map((task, index) => {
                      const taskNotes =
                        task.notes.length > 0
                          ? task.notes
                              .map(
                                (note, noteIndex) =>
                                  `     ${
                                    noteIndex + 1
                                  }. ${note}`
                              )
                              .join("\n")
                          : "     - None";

                      const irrelevantTag =
                        task.irrelevant
                          ? ` [Marked Irrelevant: ${
                              task.irrelevantReason ||
                              "no reason recorded"
                            }]`
                          : "";

                      return `${index + 1}. [${
                        task.completed
                          ? "Complete"
                          : "Open"
                      }] [${task.category}] ${
                        task.required
                          ? "[Required]"
                          : "[Optional]"
                      }${irrelevantTag} ${task.text}\n   Notes against this item:\n${taskNotes}`;
                    })
                    .join("\n")
                : "- None";

            const notes =
              control.notes.length > 0
                ? control.notes
                    .map(
                      (note, index) =>
                        `${index + 1}. ${note}`
                    )
                    .join("\n")
                : "- None";

            const changeLog =
              control.checklistChangeLog
                .length > 0
                ? control.checklistChangeLog
                    .slice(-6)
                    .map(
                      (entry) =>
                        `- [${entry.changeType}] ${entry.taskText} — ${entry.reason} (${entry.timestamp})`
                    )
                    .join("\n")
                : "- None yet";

            return `
Control: ${control.name}
Framework: ${control.framework}

Control Status: ${control.controlStatus}
Checklist Status: ${control.checklistStatus}
Homework Status: ${control.homeworkStatus}
Workflow Stage: ${control.stage}

QA Score: ${control.qaScore}
QA Score Rationale: ${control.qaScoreRationale || "Not yet assessed"}

Progress Summary:
${control.progressSummary || "No work notes captured yet."}

Control Objective:
${control.controlObjective || "Not defined"}

Risk Addressed:
${control.controlRisk || "Not defined"}

Applicability Rationale:
${control.applicabilityRationale || "Not defined"}

Evidence Strategy:
${control.evidenceStrategy || "Not defined"}

Argos Objective (Argos Rule Logic):
${control.argosObjective || "Not defined"}

Work Notes (control-level):
${notes}

Checklist (with per-item notes):
${tasks}

Recent Checklist Change Log:
${changeLog}`;
          })
          .join("\n\n");

      return `
Application: ${application.name}
Application ID: ${application.id}
Hosting: ${application.hosting}
Context Status: ${application.contextStatus}

Application Purpose:
${application.applicationPurpose || "Missing"}

Business Process:
${application.businessProcess || "Missing"}

Application Owner:
${application.applicationOwner || "Missing"}

Technical Owner:
${application.technicalOwner || "Missing"}

Application Contacts:
${
  application.applicationContacts.length > 0
    ? application.applicationContacts.join(", ")
    : "Missing"
}

Hosting and Architecture:
${application.hostingDetails || "Missing"}

Integrations:
${
  application.integrations.length > 0
    ? application.integrations.join(", ")
    : "Missing"
}

Known Identity Types:
${
  application.identityTypes.length > 0
    ? application.identityTypes.join(", ")
    : "Missing"
}

Data Classification:
${application.dataClassification || "Missing"}

Financial Relevance:
${application.financialRelevance || "Missing"}

Application-Level Notes:
${
  application.notes.length > 0
    ? application.notes
        .map(
          (note, index) => `${index + 1}. ${note}`
        )
        .join("\n")
    : "- None"
}

Controls:

${controls || "- None"}`;
    })
    .join("\n\n");
}

function summarizeConversation(
  history: ChatHistoryItem[]
): string {
  if (history.length === 0) {
    return "No recent conversation.";
  }

  return history
    .slice(-12)
    .map(
      (item) =>
        `${
          item.role === "user"
            ? "User"
            : "Work Governor"
        }: ${String(
          item.content ?? ""
        ).trim()}`
    )
    .join("\n");
}

type AcceptedLearning = {
  id: string;
  content: string;
  suggestedTaskText: string;
  suggestedCategory: string;
  framework: string | null;
  hosting: string | null;
};

function summarizeAcceptedLearnings(
  acceptedLearnings: AcceptedLearning[]
): string {
  if (acceptedLearnings.length === 0) {
    return "No accepted learnings yet.";
  }

  return acceptedLearnings
    .map(
      (learning) =>
        `- [${learning.id}] (Framework: ${
          learning.framework ?? "Any"
        }, Hosting: ${
          learning.hosting ?? "Any"
        }) ${learning.content} — Suggested checklist item: "${
          learning.suggestedTaskText
        }" (category: ${learning.suggestedCategory})`
    )
    .join("\n");
}

function getCurrentDate(): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Chicago",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }
  ).format(new Date());
}

// Claude's tool call is only schema-hinted, not schema-enforced -- the
// model can still return a malformed shape (e.g. an object where a
// plain string was expected). Anything that reaches the client and
// eventually a database text column must be a genuine string first,
// or it silently corrupts stored data (e.g. via implicit ToString
// coercion producing the literal text "[object Object]").
function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function sanitizeTaskInputs(
  tasks: unknown
): ChecklistTaskInput[] | undefined {
  if (!Array.isArray(tasks)) {
    return undefined;
  }

  const sanitized = tasks
    .filter(
      (task): task is Record<string, unknown> =>
        typeof task === "object" &&
        task !== null &&
        isNonEmptyString(
          (task as Record<string, unknown>).text
        )
    )
    .map((task) => ({
      text: task.text as string,
      category: isNonEmptyString(task.category)
        ? (task.category as ChecklistTaskInput["category"])
        : undefined,
      required:
        typeof task.required === "boolean"
          ? task.required
          : undefined,
      learningId: isNonEmptyString(task.learningId)
        ? (task.learningId as string)
        : undefined,
    }));

  return sanitized.length > 0
    ? sanitized
    : undefined;
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const message = String(
      body.message ?? ""
    ).trim();

    const applications = Array.isArray(
      body.applications
    )
      ? (body.applications as Application[])
      : [];

    const history = Array.isArray(
      body.history
    )
      ? (body.history as ChatHistoryItem[])
      : [];

    if (!message) {
      return NextResponse.json(
        {
          error:
            "A valid message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !process.env.ANTHROPIC_API_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const currentDate =
      getCurrentDate();

    let acceptedLearnings: AcceptedLearning[] = [];

    try {
      acceptedLearnings = await learningDb
        .select({
          id: learnings.id,
          content: learnings.content,
          suggestedTaskText: learnings.suggestedTaskText,
          suggestedCategory: learnings.suggestedCategory,
          framework: learnings.framework,
          hosting: learnings.hosting,
        })
        .from(learnings)
        .where(eq(learnings.status, "accepted"))
        .orderBy(desc(learnings.createdAt))
        .limit(50);
    } catch (error) {
      console.error(
        "Unable to load accepted learnings (continuing without them):",
        error
      );
    }

    const response =
      await anthropic.messages.create({
        model: "claude-haiku-4-5",
        // GENERATE_CONTEXTUAL_CHECKLISTS can regenerate every control on an
        // application in one response -- 6000 was tight enough to truncate
        // the tool call mid-JSON on applications with several controls,
        // producing a malformed command instead of a clear error. 16000 is
        // the safe non-streaming ceiling for this model/request shape.
        max_tokens: 16000,

        system: `
You are the command interpreter and contextual compliance advisor for Work Governor.

Work Governor is Manoj's personal application-control and Argos-readiness assistant.

CURRENT DATE

The current date is ${currentDate} in the user's Central Time zone.

PERMANENT ASSIGNMENT OBJECTIVE

This objective is permanent and must guide every application, control, checklist, question, response, and recommendation.

The user is not merely validating screenshots or confirming that prior evidence exists.

The user must:

1. Understand why each application exists.
2. Understand the business process and financial relevance supported by the application.
3. Understand why each SOX control applies to the application.
4. Understand the risk that the control is intended to address.
5. Challenge whether prior-season evidence is authoritative, complete, accurate, timely, and sufficient.
6. Prefer direct, system-generated, machine-readable evidence instead of manually captured screenshots.
7. Identify the authoritative systems, data owners, evidence owners, and control owners.
8. Obtain appropriate read-only access to applications, servers, databases, APIs, identity sources, logs, configuration records, ticketing systems, cloud platforms, and reports.
9. Identify every relevant human and non-human identity.
10. Translate the control into objective, repeatable Argos monitoring logic.

IDENTITY COMPLETENESS REQUIREMENT

Never limit identity discovery to usernames and groups.

Always consider, when relevant:

- employees;
- contractors;
- vendors;
- third-party support identities;
- standard users;
- privileged administrators;
- emergency or break-glass accounts;
- shared accounts;
- generic accounts;
- service accounts;
- system accounts;
- batch accounts;
- scheduled-job identities;
- database identities;
- application identities;
- integration identities;
- service principals;
- managed identities;
- API keys;
- API tokens;
- access tokens;
- refresh tokens;
- certificates;
- secrets;
- SSH keys;
- robotic-process-automation identities;
- dormant accounts;
- stale accounts;
- orphaned accounts;
- terminated-user accounts;
- unowned identities.

AUTHORITATIVE EVIDENCE REQUIREMENT

Prefer:

- direct APIs;
- databases;
- system tables;
- identity-provider data;
- application entitlement data;
- group and role membership;
- provisioning and deprovisioning records;
- logs;
- SIEM data;
- configuration records;
- source-control data;
- deployment records;
- ticketing records;
- approval records;
- cloud audit logs;
- backup-platform data;
- monitoring-platform data.

Treat screenshots as supplemental evidence only.

A checklist must challenge whether a screenshot can be replaced by a direct, repeatable, read-only data source.

ARGOS OBJECTIVE

Every control must progress toward:

- an authoritative data source;
- required fields;
- a data owner;
- a control owner;
- a collection method;
- read-only access;
- monitoring frequency;
- population-completeness logic;
- objective exception criteria;
- alert ownership;
- evidence retention;
- repeatable Argos rule logic.

APPLICATION CONTEXT

Every application should contain:

- application purpose;
- business process;
- business owner;
- technical owner;
- application contacts;
- hosting and architecture;
- integrations;
- identity types;
- data classification;
- financial relevance.

If context is missing, the application can still be created.

However:

- clearly state that application context is missing;
- treat initial checklists as preliminary;
- include a required task to complete the application context;
- never invent application-specific facts.

When the user later supplies application information, use UPDATE_APPLICATION_CONTEXT.

CHECKLIST GENERATION PRIORITY (applies to every checklist you produce,
whether creating a new control, adding one, or regenerating)

Every checklist, for every control, always follows this priority order:

1. Ground it first in the SOX (or PCI DSS) control's own intent: what
   risk this specific control exists to address, and what it requires
   regardless of any particular application. This is the foundation
   even when nothing else is known yet.
2. When application context is available, refine and specialize that
   foundation using the application's actual purpose, business process,
   hosting, integrations, identity types, and financial relevance --
   never replace the control's intent, sharpen it.
3. Check ACCEPTED LEARNINGS (see ACCEPTED LEARNINGS USAGE below) for
   anything applicable to this control's framework and this
   application's hosting, and weave in any match.
4. If application context is missing or incomplete, still produce a
   control-intent-grounded checklist per points 1 and 3 -- never a bare
   placeholder -- while clearly flagging that context is missing and
   including the required task to complete it.
5. Every task, in every case, exists to serve one underlying goal:
   deep research to find and collect valid, reliable evidence directly
   from the application -- prioritizing sources that are realistically
   obtainable through integration (APIs, logs, identity sources,
   configuration records) over manual screenshots -- and to progress
   toward concrete, repeatable Argos monitoring rule logic for the
   future.

CONTEXTUAL CONTROL ANALYSIS

For each control, combine:

1. Permanent assignment objective.
2. Application purpose.
3. Business process.
4. Financial relevance.
5. Hosting and architecture.
6. Integrations.
7. Identity types.
8. SOX control objective.
9. Control risk.
10. Argos monitoring objective.

Each contextual control should contain:

- controlObjective;
- controlRisk;
- applicabilityRationale;
- evidenceStrategy;
- argosObjective;
- categorized tasks.

GENERATING CONTEXTUAL CHECKLISTS

Use GENERATE_CONTEXTUAL_CHECKLISTS when the user says:

- regenerate contextual checklists for APP-01;
- generate checklists using the application context;
- refresh every control based on the application purpose;
- create contextual checklists for all controls;
- revise all checklists after adding application context.

For every existing control in that application, return one contextualControls entry.

Do not omit a control.

Do not invent a control that does not exist.

REGENERATING ONE CONTROL

Use REGENERATE_CONTROL_CHECKLIST when the user requests regeneration for one named control.

Always honor an explicit regeneration request by actually producing a
fresh, complete tasks list for that control -- never respond with
RESPOND_ONLY claiming the checklist was "already regenerated" based on
the recent conversation history. A prior assistant message describing
a regeneration is not proof the control's checklist is populated now;
the only source of truth is the control's actual current checklist
shown in CURRENT WORK GOVERNOR DATA. If that checklist is empty or
clearly incomplete when the user asks to regenerate, always treat this
as a fresh regeneration request and produce a full tasks list, even if
you or the user discussed regenerating it earlier in this conversation.
Every REGENERATE_CONTROL_CHECKLIST and GENERATE_CONTEXTUAL_CHECKLISTS
response must include a non-empty tasks list for every control being
regenerated; an empty or missing tasks list is never a valid response
to a regeneration request.

REGENERATION INPUTS

Both GENERATE_CONTEXTUAL_CHECKLISTS and REGENERATE_CONTROL_CHECKLIST must
re-evaluate the checklist from scratch using every one of these, not
just re-apply the previous checklist:

1. Every note recorded against individual checklist items and against
   the control itself (shown per control in CURRENT WORK GOVERNOR DATA)
   -- these often reveal that the checklist needs to change.
2. The application's CURRENT context fields and Application-Level
   Notes. The user's original understanding of the application may
   have been incomplete or wrong when it was first created -- always
   regenerate against the current, possibly corrected, context, never
   assume the original context was accurate.
3. ACCEPTED LEARNINGS applicable to this control's framework and this
   application's hosting (see ACCEPTED LEARNINGS USAGE below) -- check
   again on every regeneration, since new learnings may have been
   accepted since the checklist was last generated.

Items already marked irrelevant (shown with a "[Marked Irrelevant]"
tag in CURRENT WORK GOVERNOR DATA) should generally stay marked
irrelevant on regeneration unless the notes or context changes give a
concrete reason they're relevant again -- do not silently un-mark them.

TASK CATEGORIES

Each task must have:

- text;
- category;
- required.

Allowed categories:

- Homework
- Discovery
- Access
- Evidence Collection
- Validation
- Approval
- Argos Design
- Next Steps

HOMEWORK TASKS

Homework should cover:

- prior-season evidence;
- control description;
- application documentation;
- prior screenshots and reports;
- known audit questions;
- missing application context.

DISCOVERY TASKS

Discovery should cover:

- application purpose;
- process;
- architecture;
- owners;
- integrations;
- environments;
- identity types;
- control operation;
- third-party dependencies.

ACCESS TASKS

Access should cover:

- read-only application access;
- server access;
- database access;
- cloud access;
- API access;
- log access;
- identity-source access;
- ticketing access;
- configuration access.

EVIDENCE COLLECTION TASKS

Evidence Collection should cover:

- authoritative source;
- required fields;
- population;
- logs;
- reports;
- configuration;
- identities;
- tickets;
- approvals;
- deployments;
- transactions;
- data owner;
- extraction method.

VALIDATION TASKS

Validation should cover:

- completeness;
- accuracy;
- frequency;
- retention;
- ownership;
- reconciliation;
- stale data;
- missing records;
- unauthorized activity;
- orphaned identities;
- conflicting access;
- unresolved exceptions.

APPROVAL TASKS

Approval should cover:

- application-owner confirmation;
- control-owner confirmation;
- evidence-owner confirmation;
- reviewer approval;
- exception approval;
- sign-off.

ARGOS DESIGN TASKS

Argos Design should cover:

- data-source mapping;
- fields;
- monitoring logic;
- monitoring frequency;
- completeness logic;
- exception criteria;
- thresholds;
- alert owner;
- remediation workflow;
- retention.

NEXT STEPS TASKS

Next Steps should cover:

- meetings;
- follow-ups;
- dependencies;
- missing access;
- missing contacts;
- open questions;
- action owners.

CONTROL STATUS

Allowed values:

- New
- Checklist Review Pending
- In Progress
- Ready for Review
- Completed
- On Hold

CHECKLIST STATUS

Allowed values:

- Review Pending
- Approved
- Needs Revision
- Completed

APPLICATION IDENTIFIERS

If the user gives an explicit application name (any word or phrase,
for example "cricket", "Payroll System", "Vendor Portal"), use that
name exactly as payload.application. Preserve it exactly as given,
including capitalization. Do not convert it into an APP-NN
identifier and do not invent a numbered identifier for a named
application.

Only produce an APP-NN identifier when:

- the user references an application purely by number, for example
  "application 1" to APP-01, "app 18" to APP-18,
  "Application-9" to APP-09; or
- the user does not give any application name at all. In that case
  leave payload.application as an empty string; the system will
  automatically assign the next available APP-NN identifier.

Use existing control names exactly.

Do not invent applications or controls.

CREATE APPLICATION

Use CREATE_APPLICATION when the user creates an application.

A context object may be included when purpose, owners, integrations, identity types, or financial relevance are supplied.

payload.hosting must always be set to a short hosting category — SaaS,
PaaS, IaaS, On-premises, Hybrid, or Unknown — whenever the user describes
how or where the application is hosted, even briefly (for example
"IaaS-hosted on AWS EC2" means payload.hosting is "IaaS"). This is
separate from context.hostingDetails, which holds the fuller
architecture description. Never leave payload.hosting as "Unknown" when
the user actually stated a hosting model.

If the user requests common SOX controls, select suitable controls such as:

- User Access Control;
- Privileged Access Management;
- User Provisioning and Deprovisioning;
- Segregation of Duties;
- Change Management;
- System Monitoring and Logging;
- Configuration Management;
- Backup and Recovery.

For each control, also generate its initial checklist through
payload.controls[].tasks, using the same contextual analysis described
under CONTEXTUAL CONTROL ANALYSIS and the same ACCEPTED LEARNINGS USAGE
rules below — including tagging any task drawn from a matching accepted
learning with that learning's id. Do not leave tasks empty when you have
enough information to generate a reasonable checklist.

UPDATE APPLICATION CONTEXT

Use UPDATE_APPLICATION_CONTEXT when the user provides or changes:

- purpose;
- business process;
- owner;
- technical owner;
- contacts;
- hosting;
- integrations;
- identity types;
- financial relevance;
- data classification.

payload.hosting must be set to a short hosting category -- SaaS,
PaaS, IaaS, On-premises, Hybrid, or Unknown -- whenever the user
states or clearly implies the hosting model, exactly like
payload.hosting under CREATE APPLICATION. This is separate from
payload.context.hostingDetails, which holds the fuller architecture
description. Leave payload.hosting unset when hosting is not part of
this update.

Do not regenerate checklists in the same command because only one command can be returned.

After updating context, explain through the command result that contextual checklists should be regenerated.

RENAME APPLICATION

Use RENAME_APPLICATION when the user asks to rename, relabel, or
change the name of an existing application, for example:

- rename APP-02 to cricket;
- change the name of APP-02 to cricket;
- cricket should be the name for APP-02.

payload.application is the application's current identifier or name.

payload.newName is the new name exactly as given, preserving
capitalization.

Do not create a new application when the user is renaming an
existing one. Do not use RENAME_APPLICATION to change hosting,
purpose, or any other context field.

CHECKLIST REVIEW

Use UPDATE_CHECKLIST_STATUS with Approved when the user says:

- approve the checklist;
- checklist is approved;
- I reviewed the checklist.

Use Needs Revision when the user says:

- checklist needs revision;
- revise this checklist;
- this checklist is incomplete.

CONTROL COMPLETION

Use UPDATE_CONTROL_STATUS with Completed only when explicitly requested.

Do not automatically mark a control Completed merely because tasks are checked.

NOTES

Use UPDATE_NOTES for one control.

Use UPDATE_ALL_CONTROLS when the same note applies to every control.

Use:

- APPEND to retain existing notes;
- REPLACE to replace notes;
- CLEAR to remove notes.

CHECKLIST ITEM NOTES AND ADAPTIVE ANALYSIS

Use UPDATE_TASK_NOTES when the user adds, records, or shares a note
against one specific checklist item, at any time, before or after
meetings, and possibly multiple times before a control is complete.

payload.taskText must match an existing checklist item shown for
that control in CURRENT WORK GOVERNOR DATA. Never invent a task that
does not exist. If no item clearly matches, use RESPOND_ONLY and ask
which item the note belongs to.

payload.note is the note to record against that item, written as a
grammatically corrected version of what the user actually said. Fix
spelling, grammar, capitalization, and punctuation only. Never change,
add, remove, or reinterpret any fact, name, number, date, or meaning
the user provided. If the user's wording is already clean, keep it
essentially as written.

If the user's message about the note is too ambiguous, incomplete,
or self-contradictory for you to understand what actually happened
or what they mean, do not create a note and do not guess. Use
RESPOND_ONLY instead and ask one specific, direct question about the
exact thing you do not understand, in Manoj's language, not general
compliance jargon.

In the same command, always analyze this note together with every
other note already recorded for that control (control-level notes
and every checklist item's notes) and decide whether the checklist
itself should change:

- If the notes reveal a genuine gap the current checklist does not
  cover, add a new item through addTasks with a fitting category and
  a required flag.
- If an existing item is now redundant, fully answered with nothing
  further to track, or turns out not applicable, mark it as no longer
  relevant by listing its exact existing text in
  markIrrelevantTaskTexts. This never deletes the item -- it stays on
  the checklist permanently, visibly tagged, excluded from progress
  counting, for full audit transparency. Never invent an item that
  does not exist, and never re-mark an item that is already tagged
  irrelevant.
- Only change the checklist when the notes give real evidence for
  it. Do not add or mark items irrelevant speculatively.
- Every addition and every irrelevant-marking must have a matching
  entry in changeLogEntries (changeType ADDED or MARKED_IRRELEVANT)
  with a specific reason grounded in what the notes actually said.
  Never add or mark a checklist item without a logged reason.
- Do not ask for confirmation before making these changes. The change
  happens immediately, is visible on the checklist right away, and is
  permanently recorded in the checklist change log for later
  reference.

Always refresh progressSummary and qaScore in this same command,
based on all notes recorded for the control so far, not only the
new note:

progressSummary is one to three plain-language sentences describing
the current state of research and evidence-gathering for this
control: what has been confirmed, what sources or owners have been
identified, and what is still open.

qaScore reflects how deep the research is and how strongly the
user's notes have shaped and strengthened the checklist toward
solid, Argos-ready evidence. It is not a pass/fail control status.
Use this rubric:

- Not Started: no meaningful notes have been recorded yet.
- Surface Level: a few generic notes exist, but the checklist is
  still essentially the default one; evidence sources are not yet
  identified.
- Developing: notes contain real specifics, such as named systems,
  owners, or identities, and have prompted at least one checklist
  refinement.
- Well Researched: the checklist has been meaningfully reshaped by
  findings; evidence sources, owners, and access methods are named
  concretely rather than generically.
- Argos Ready: the evidence strategy and Argos objective are
  concrete and specific enough to implement monitoring logic
  directly, including data source, fields, frequency, and exception
  criteria.

Always include qaScoreRationale, one short sentence explaining why
this level applies right now.

As notes reveal real, specific information, also sharpen
argosObjective for that control so it stays concrete rather than
generic. Every control's argosObjective is shown to the user
together in one Argos Rule Logic section per application, so vague
objectives reduce the value of that section.

PROCESSING THE APPLICATION TEAM'S REPLY

Use PROCESS_MEETING_RESPONSE when the user pastes back the
application team's reply or answers to a meeting-prep email, for
example:

- here's the reply from the app team for APP-18: ...;
- the application team answered these questions: ...;
- got this back before our meeting: ...;
- APP-02's team sent this over: ...

Unlike UPDATE_TASK_NOTES, which records one note against one
checklist item, this reply may answer several different things at
once, possibly across several different controls, and possibly also
application-context questions (hosting, owners, integrations,
identity types, and so on). Read the whole reply and distribute every
piece of information to everywhere it belongs, all in this one
command.

payload.hosting: set this to a short hosting category -- SaaS, PaaS,
IaaS, On-premises, Hybrid, or Unknown -- whenever the reply states or
clearly implies the hosting model, exactly like payload.hosting under
CREATE APPLICATION. This is separate from
payload.context.hostingDetails, which holds the fuller architecture
description (specific platform, region, data center, and so on).
Leave payload.hosting unset only when the reply does not address
hosting at all.

payload.context: include only the application-context fields the
reply actually answers. Omit any field the reply does not address --
never overwrite an existing value with a guess.

payload.controlUpdates: one entry per control the reply provides
information for. For each entry:

- control is the existing control's name, exactly as shown in CURRENT
  WORK GOVERNOR DATA. Never invent a control that does not exist.
- taskNotes is one entry per checklist item the reply answers on that
  control: taskText must match an existing checklist item's exact
  text for that control, and note is a grammatically corrected
  version of what the reply actually said for that item -- fix
  spelling, grammar, and punctuation only, never add, remove, or
  reinterpret any fact.
- After applying those notes, apply the same adaptive-analysis rules
  as UPDATE_TASK_NOTES: if the combined notes reveal a genuine gap,
  add a new item through addTasks with a fitting category and
  required flag; if an existing item is now redundant or fully
  answered with nothing further to track, mark it through
  markIrrelevantTaskTexts. Every addition and every irrelevant-marking
  needs a matching changeLogEntries entry with a specific reason.
  Only change the checklist when the reply gives real evidence for it.
- Always refresh progressSummary, qaScore, and qaScoreRationale for
  that control based on every note now on file for it, not only the
  new ones, using the same rubric described under CHECKLIST ITEM
  NOTES AND ADAPTIVE ANALYSIS.

If part of the reply does not clearly map to any existing checklist
item or context field, put a grammatically corrected version of that
part into payload.unmatchedNotes instead of forcing a false match or
discarding it.

Never invent a checklist item, control, or application that does not
exist. If the reply references something that cannot be matched to
this application at all, use RESPOND_ONLY and ask which application
or control it belongs to.

Do not regenerate any checklist in this same command -- checklist
regeneration only happens when the user separately asks for it with
REGENERATE_CONTROL_CHECKLIST or GENERATE_CONTEXTUAL_CHECKLISTS, even
when the new notes make regeneration obviously worthwhile.
payload.message should summarize what was recorded and explicitly
suggest regenerating the checklist for the controls that received
meaningful new information.

DELETION

Deleting one application requires confirmation.

Never convert deletion of one application into deletion of all applications.

CHAT HISTORY

Use CLEAR_CHAT_HISTORY when the user asks to clear the chat.

Clearing chat history must not remove applications, controls, context, checklists, notes, or status.

EXECUTIVE PROGRESS EXPORT

Use EXPORT_PROGRESS_REPORT when the user says:

- export the current progress;
- export progress as a PDF;
- generate an executive report;
- create a PDF summary;
- download the progress report;
- give me an executive summary I can share.

EXPORT_PROGRESS_REPORT does not change applications, controls, context, checklists, notes, or status.

payload.message should briefly acknowledge that the executive PDF report was generated.

MEETING-PREP EMAIL EXPORT

Use EXPORT_MEETING_PREP_EMAIL when the user says:

- give me an email ready version for APP-18;
- draft a prep email for cricket;
- email ready export before the meeting;
- send this to the application team before we meet;
- I need to email the app team before our review.

This produces a short, plain-language email the user sends to the
application team BEFORE the compliance meeting, so the team can come
prepared with real answers instead of being surprised in the room.

Every one of these requests is answered with action
EXPORT_MEETING_PREP_EMAIL and a fully populated payload.email, in
this same response, with no exceptions. Do not use RESPOND_ONLY for
this trigger for any reason -- not to say the email is coming, not to
summarize what it will contain, not to list what context is missing
and wait, not to offer a choice between drafting now versus gathering
information first, not even when the application has zero context
recorded and zero controls with any notes. There is no scenario under
this trigger where RESPOND_ONLY is the correct action. If the
application is a bare shell with only a name and no other data at
all, still draft payload.email: applicationSummary and
applicationUse plainly state that nothing is documented yet, and
openQuestions is built entirely from that emptiness (purpose, owner,
hosting, and so on). That sparse email is itself the correct,
complete answer -- it is never a reason to stop and ask the user what
to do instead.

Build payload.email from CURRENT WORK GOVERNOR DATA for that
application only. Never invent facts the data does not contain --
anything unknown becomes an open question instead.

payload.email.subject: one short line naming the application and the
purpose of the email.

payload.email.applicationSummary: two to three plain sentences on
what the application is and why it exists, built from
applicationPurpose and businessProcess. If these are missing, say so
plainly rather than guessing.

payload.email.applicationUse: one to two plain sentences on how the
application is actually used day to day (who touches it, what
process it supports), built from businessProcess, integrations, and
any application notes. If unknown, do not guess -- leave it brief and
let the open questions cover it.

payload.email.checklistHighlights: four to eight short, plain-English
bullets summarizing where things stand across every control on this
application right now -- what's already confirmed, what's still open,
and anything already captured in notes. Write for someone outside
compliance: no framework jargon, no internal status labels.

payload.email.openQuestions: five to eight questions, one per
distinct topic, that together cover every real gap in the
application's context and open checklist items at a HIGH LEVEL, in
plain language, so the application team can read and answer quickly
without being compliance experts.

First, group every gap -- across missing/partial application context
fields and every required Discovery, Access, and Homework checklist
task with no notes yet, across every control -- into a small set of
topics (for example: hosting and architecture; ownership and who
approves server/database/access changes; integrations and dependent
systems; identity types and account inventory; business purpose and
process; financial relevance; logging and monitoring access). Many
individual checklist tasks and context fields will fall under the
same topic -- that is expected. Ask exactly one question per topic,
never more. Two questions that would be answered by the same fact
from the application team (for example one asking "where is this
hosted" and another separately asking "is this on AWS EC2") are
duplicates -- merge them into a single question. Then rank topics by
how foundational and commonly-unknown they are to an application
team, and keep the top five to eight; drop the rest rather than
padding the list.

For each topic, ask at the right depth for what is already known,
never re-asking something CURRENT WORK GOVERNOR DATA already answers.
A topic has layers (broad category, then specific detail, then
operational specifics), and a topic only gets dropped from
openQuestions when every layer that a reasonable person would still
want to know is answered -- knowing the broad category alone does
NOT resolve the topic if a natural next-level question remains
unanswered:

- If a topic is entirely unanswered, ask its broad, foundational
  layer (for example, for hosting: "Where is this application hosted
  -- IaaS, PaaS, SaaS, on-premises, or a hybrid mix?").
- If the broad layer is known but the next layer down is still open,
  ask that next layer instead -- do not drop the topic and do not
  repeat the broad question. For example: hosting known only as
  "IaaS", with no specific platform or environment on file yet, is
  still an open topic -- ask which specific platform and environment
  (on-prem servers, AWS, Azure, GCP, a specific data center), not
  whether it's IaaS again, and do not skip this topic just because
  the broad category is known.
- Only drop a topic from openQuestions once its specific, actionable
  layer is on file (for hosting, that means a concrete platform and
  environment are known, not just the broad category), or once every
  layer a reasonable person would ask about has already been
  answered by the data on file.

This means the same application's meeting-prep email should read
differently over time: broad and foundational the first time it's
requested, and progressively more specific on later requests as
context fields and checklist notes fill in from earlier replies.

Every question must include exampleAnswer: a short, clearly
illustrative example answer at the same depth as the question (never
a real fact about this specific application) that shows the level of
detail and the format expected, so the team knows how to answer well.

Every question must also include relatedControls: the exact name of
every control (as shown in CURRENT WORK GOVERNOR DATA) whose gap this
question addresses. Because questions are merged across controls
whenever they share the same underlying topic, most questions will
list more than one control -- for example, a single hosting question
often clears the way for both User Access Control and Change
Management at once. List every control the answer will genuinely
help, never just the first one that happened to raise the topic, and
never a control this question has nothing to do with.

payload.email.closingNote: one short, friendly sentence inviting a
reply before the meeting.

payload.message should briefly acknowledge that the meeting-prep
email was drafted.

EXPORT_MEETING_PREP_EMAIL does not change applications, controls,
context, checklists, notes, or status.

FULL DATA BACKUP

Use BACKUP_APPLICATION_DATA when the user says:

- take backup now;
- take a backup;
- backup the application;
- back up all data;
- create a full backup;
- download a backup of everything.

BACKUP_APPLICATION_DATA is different from EXPORT_PROGRESS_REPORT.
EXPORT_PROGRESS_REPORT produces a formatted executive PDF summary.
BACKUP_APPLICATION_DATA saves a new numbered, restorable snapshot of
every application, control, context field, checklist, note, and
status, plus the chat history, and also downloads it as a JSON file.
Prefer BACKUP_APPLICATION_DATA whenever the user asks for a
"backup" rather than a "report" or "summary".

BACKUP_APPLICATION_DATA does not change applications, controls,
context, checklists, notes, or status.

payload.message should briefly acknowledge that a full backup was
created.

LIST BACKUPS

Use LIST_BACKUPS when the user asks to see, list, or review their
backups, for example "show my backups", "list backups", "what
backups do I have". LIST_BACKUPS does not change any data. The
system fills in the actual backup list; payload.message is not
shown to the user for this action, so it can be left blank.

ROLLBACK TO A BACKUP

Use ROLLBACK_BACKUP when the user asks to roll back, restore, or
reinstate a specific backup by its number, for example "rollback to
backup 2", "restore backup 3", "reinstate backup 1".

payload.version is the backup number the user referenced.

Rolling back replaces the current application data with an older
backup, so it requires confirmation exactly like DELETE_APPLICATION:

- For an initial request such as "rollback to backup 2", use
  confirmed: false.
- Only use confirmed: true when the user has explicitly confirmed
  in this conversation, for example "yes, rollback to backup 2".

Never skip confirmation for ROLLBACK_BACKUP.

ACCEPTED LEARNINGS USAGE

ACCEPTED LEARNINGS in the user message lists recommendations the user has
already reviewed and approved from past checklist changes on other
applications and controls, each with an id, a scope (Framework and
Hosting), a description, and a suggested checklist item.

When generating or regenerating a checklist for a control (ADD_CONTROL,
REGENERATE_CONTROL_CHECKLIST, GENERATE_CONTEXTUAL_CHECKLISTS), check each
accepted learning against that specific control and application:

- Compare the learning's Framework scope against that control's own
  framework (SOX or PCI DSS). "Any" matches every framework.
- Compare the learning's Hosting scope against the application's hosting
  description. The application's hosting is freeform text, not a fixed
  category, so classify it into SaaS, PaaS, IaaS, On-premises, or Unclear
  using your best judgment before comparing. "Any" matches every hosting
  type. If the hosting is genuinely unclear or ambiguous, treat it as not
  matching rather than guessing.
- Only apply a learning when both dimensions match (or are "Any"). Never
  apply a learning whose scope does not genuinely match.
- When a learning applies, include a task using its exact suggested
  checklist item text and category, and set that task's learningId field
  to the learning's id exactly as given. Do not set learningId on any
  task that did not come from an accepted learning.
- Do not duplicate a checklist item that is already effectively present.

QUESTIONS AND FEEDBACK

Use RESPOND_ONLY for explanations, questions, feedback, and clarification.

Do not modify data when the user asks why something happened.

HARD CONSTRAINT -- READ THIS LAST, IT OVERRIDES ANY HESITATION ABOVE

If the latest user message is a request for a meeting-prep email
(see MEETING-PREP EMAIL EXPORT), the tool call in this response MUST
have action EXPORT_MEETING_PREP_EMAIL with payload.email fully
filled in. A tool call with action RESPOND_ONLY, or with
payload.email missing or empty, is an incorrect response to that
request, full stop -- it does not matter how little is known about
the application. Do not hedge, do not ask permission, do not
describe the email without attaching it: attach it.

Return exactly one execute_work_governor_command tool call.

Do not return ordinary prose outside the tool call.
`,

        messages: [
          {
            role: "user",
            content: `
ACCEPTED LEARNINGS

${summarizeAcceptedLearnings(
  acceptedLearnings
)}

CURRENT WORK GOVERNOR DATA

${summarizeApplications(
  applications
)}

RECENT CONVERSATION

${summarizeConversation(history)}

LATEST USER MESSAGE

${message}
`,
          },
        ],

        tools: [
          {
            name:
              "execute_work_governor_command",

            description:
              "Execute one structured Work Governor command using the permanent assignment objective and current application context.",

            input_schema: {
              type: "object",

              properties: {
                action: {
                  type: "string",

                  enum: [
                    "CREATE_APPLICATION",
                    "UPDATE_APPLICATION_CONTEXT",
                    "RENAME_APPLICATION",
                    "ADD_CONTROL",
                    "REGENERATE_CONTROL_CHECKLIST",
                    "GENERATE_CONTEXTUAL_CHECKLISTS",
                    "UPDATE_HOMEWORK",
                    "UPDATE_CONTROL_WORK",
                    "UPDATE_ALL_CONTROLS",
                    "UPDATE_NOTES",
                    "UPDATE_CHECKLIST",
                    "UPDATE_TASK_NOTES",
                    "UPDATE_CHECKLIST_STATUS",
                    "UPDATE_CONTROL_STATUS",
                    "DELETE_APPLICATION",
                    "DELETE_ALL_APPLICATIONS",
                    "CLEAR_CHAT_HISTORY",
                    "EXPORT_PROGRESS_REPORT",
                    "BACKUP_APPLICATION_DATA",
                    "LIST_BACKUPS",
                    "ROLLBACK_BACKUP",
                    "RESPOND_ONLY",
                  ],
                },

                payload: {
                  type: "object",

                  properties: {
                    application: {
                      type: "string",
                    },

                    hosting: {
                      type: "string",
                    },

                    newName: {
                      type: "string",
                    },

                    context: {
                      type: "object",

                      properties: {
                        applicationPurpose: {
                          type: "string",
                        },

                        businessProcess: {
                          type: "string",
                        },

                        applicationOwner: {
                          type: "string",
                        },

                        technicalOwner: {
                          type: "string",
                        },

                        applicationContacts: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },

                        integrations: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },

                        identityTypes: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },

                        hostingDetails: {
                          type: "string",
                        },

                        dataClassification: {
                          type: "string",
                        },

                        financialRelevance: {
                          type: "string",
                        },
                      },

                      additionalProperties:
                        false,
                    },

                    controls: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          name: {
                            type: "string",
                          },

                          framework: {
                            type: "string",

                            enum: [
                              "SOX",
                              "PCI DSS",
                            ],
                          },

                          tasks: {
                            type: "array",

                            items: {
                              type: "object",

                              properties: {
                                text: {
                                  type: "string",
                                },

                                category: {
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

                                required: {
                                  type: "boolean",
                                },

                                learningId: {
                                  type: "string",
                                },
                              },

                              required: [
                                "text",
                                "category",
                                "required",
                              ],

                              additionalProperties:
                                false,
                            },
                          },
                        },

                        required: [
                          "name",
                          "framework",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    contextualControls: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          control: {
                            type: "string",
                          },

                          controlObjective: {
                            type: "string",
                          },

                          controlRisk: {
                            type: "string",
                          },

                          applicabilityRationale: {
                            type: "string",
                          },

                          evidenceStrategy: {
                            type: "string",
                          },

                          argosObjective: {
                            type: "string",
                          },

                          tasks: {
                            type: "array",

                            items: {
                              type: "object",

                              properties: {
                                text: {
                                  type: "string",
                                },

                                category: {
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

                                required: {
                                  type: "boolean",
                                },

                                learningId: {
                                  type: "string",
                                },
                              },

                              required: [
                                "text",
                                "category",
                                "required",
                              ],

                              additionalProperties:
                                false,
                            },
                          },
                        },

                        required: [
                          "control",
                          "controlObjective",
                          "controlRisk",
                          "applicabilityRationale",
                          "evidenceStrategy",
                          "argosObjective",
                          "tasks",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    control: {
                      type: "string",
                    },

                    framework: {
                      type: "string",

                      enum: [
                        "SOX",
                        "PCI DSS",
                      ],
                    },

                    controlObjective: {
                      type: "string",
                    },

                    controlRisk: {
                      type: "string",
                    },

                    applicabilityRationale: {
                      type: "string",
                    },

                    evidenceStrategy: {
                      type: "string",
                    },

                    argosObjective: {
                      type: "string",
                    },

                    status: {
                      type: "string",

                      enum: [
                        "Waiting",
                        "Completed",
                      ],
                    },

                    homeworkStatus: {
                      type: "string",

                      enum: [
                        "Waiting",
                        "Completed",
                      ],
                    },

                    stage: {
                      type: "string",

                      enum: [
                        "Homework",
                        "Discovery",
                        "Evidence Collection",
                        "Testing",
                        "Review",
                        "Completed",
                      ],
                    },

                    controlStatus: {
                      type: "string",

                      enum: [
                        "New",
                        "Checklist Review Pending",
                        "In Progress",
                        "Ready for Review",
                        "Completed",
                        "On Hold",
                      ],
                    },

                    checklistStatus: {
                      type: "string",

                      enum: [
                        "Review Pending",
                        "Approved",
                        "Needs Revision",
                        "Completed",
                      ],
                    },

                    note: {
                      type: "string",
                    },

                    notes: {
                      type: "array",

                      items: {
                        type: "string",
                      },
                    },

                    noteMode: {
                      type: "string",

                      enum: [
                        "APPEND",
                        "REPLACE",
                        "CLEAR",
                      ],
                    },

                    nextTasks: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          text: {
                            type: "string",
                          },

                          category: {
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

                          required: {
                            type: "boolean",
                          },

                          learningId: {
                            type: "string",
                          },
                        },

                        required: [
                          "text",
                          "category",
                          "required",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    checklistMode: {
                      type: "string",

                      enum: [
                        "APPEND",
                        "REPLACE",
                        "REMOVE_DUPLICATES_AND_LIMIT",
                      ],
                    },

                    tasks: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          text: {
                            type: "string",
                          },

                          category: {
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

                          required: {
                            type: "boolean",
                          },

                          learningId: {
                            type: "string",
                          },
                        },

                        required: [
                          "text",
                          "category",
                          "required",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    maxItems: {
                      type: "number",
                      minimum: 1,
                      maximum: 30,
                    },

                    taskText: {
                      type: "string",
                    },

                    addTasks: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          text: {
                            type: "string",
                          },

                          category: {
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

                          required: {
                            type: "boolean",
                          },

                          learningId: {
                            type: "string",
                          },
                        },

                        required: [
                          "text",
                          "category",
                          "required",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    markIrrelevantTaskTexts: {
                      type: "array",

                      items: {
                        type: "string",
                      },
                    },

                    changeLogEntries: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          changeType: {
                            type: "string",

                            enum: [
                              "ADDED",
                              "MARKED_IRRELEVANT",
                            ],
                          },

                          taskText: {
                            type: "string",
                          },

                          reason: {
                            type: "string",
                          },
                        },

                        required: [
                          "changeType",
                          "taskText",
                          "reason",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    progressSummary: {
                      type: "string",
                    },

                    qaScore: {
                      type: "string",

                      enum: [
                        "Not Started",
                        "Surface Level",
                        "Developing",
                        "Well Researched",
                        "Argos Ready",
                      ],
                    },

                    qaScoreRationale: {
                      type: "string",
                    },

                    version: {
                      type: "number",
                      minimum: 1,
                    },

                    confirmed: {
                      type: "boolean",
                    },

                    message: {
                      type: "string",
                    },

                    email: {
                      type: "object",

                      properties: {
                        subject: {
                          type: "string",
                        },

                        applicationSummary: {
                          type: "string",
                        },

                        applicationUse: {
                          type: "string",
                        },

                        checklistHighlights: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },

                        openQuestions: {
                          type: "array",

                          items: {
                            type: "object",

                            properties: {
                              question: {
                                type: "string",
                              },

                              exampleAnswer: {
                                type: "string",
                              },

                              relatedControls: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                              },
                            },

                            required: [
                              "question",
                              "exampleAnswer",
                              "relatedControls",
                            ],

                            additionalProperties:
                              false,
                          },
                        },

                        closingNote: {
                          type: "string",
                        },
                      },

                      required: [
                        "subject",
                        "applicationSummary",
                        "applicationUse",
                        "checklistHighlights",
                        "openQuestions",
                        "closingNote",
                      ],

                      additionalProperties:
                        false,
                    },

                    controlUpdates: {
                      type: "array",

                      items: {
                        type: "object",

                        properties: {
                          control: {
                            type: "string",
                          },

                          taskNotes: {
                            type: "array",

                            items: {
                              type: "object",

                              properties: {
                                taskText: {
                                  type: "string",
                                },

                                note: {
                                  type: "string",
                                },
                              },

                              required: [
                                "taskText",
                                "note",
                              ],

                              additionalProperties:
                                false,
                            },
                          },

                          addTasks: {
                            type: "array",

                            items: {
                              type: "object",

                              properties: {
                                text: {
                                  type: "string",
                                },

                                category: {
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

                                required: {
                                  type: "boolean",
                                },

                                learningId: {
                                  type: "string",
                                },
                              },

                              required: [
                                "text",
                                "category",
                                "required",
                              ],

                              additionalProperties:
                                false,
                            },
                          },

                          markIrrelevantTaskTexts:
                            {
                              type: "array",
                              items: {
                                type: "string",
                              },
                            },

                          changeLogEntries: {
                            type: "array",

                            items: {
                              type: "object",

                              properties: {
                                changeType: {
                                  type: "string",

                                  enum: [
                                    "ADDED",
                                    "MARKED_IRRELEVANT",
                                  ],
                                },

                                taskText: {
                                  type: "string",
                                },

                                reason: {
                                  type: "string",
                                },
                              },

                              required: [
                                "changeType",
                                "taskText",
                                "reason",
                              ],

                              additionalProperties:
                                false,
                            },
                          },

                          progressSummary: {
                            type: "string",
                          },

                          qaScore: {
                            type: "string",

                            enum: [
                              "Not Started",
                              "Surface Level",
                              "Developing",
                              "Well Researched",
                              "Argos Ready",
                            ],
                          },

                          qaScoreRationale: {
                            type: "string",
                          },
                        },

                        required: [
                          "control",
                          "taskNotes",
                        ],

                        additionalProperties:
                          false,
                      },
                    },

                    unmatchedNotes: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                  },

                  additionalProperties:
                    false,
                },
              },

              required: [
                "action",
                "payload",
              ],

              additionalProperties: false,
            },
          },
        ],

        tool_choice: {
          type: "tool",

          name:
            "execute_work_governor_command",
        },
      });

    if (response.stop_reason === "max_tokens") {
      throw new Error(
        "The assistant's response was too large and got cut off before finishing (this can happen when regenerating checklists for every control on an application at once). Nothing was changed. Try regenerating one control at a time, or ask again."
      );
    }

    const toolCall =
      response.content.find(
        (block) =>
          block.type === "tool_use" &&
          block.name ===
            "execute_work_governor_command"
      );

    if (
      !toolCall ||
      toolCall.type !== "tool_use"
    ) {
      throw new Error(
        "Claude did not return a valid Work Governor command."
      );
    }

    const parsedCommand =
      toolCall.input as ClaudeCommandInput;

    // Claude's tool call is schema-hinted, not schema-enforced -- it
    // can omit `payload` entirely even though the schema marks it
    // required. Every switch case below reads rawCommand.payload.xxx
    // directly, so an undefined payload would throw before any `??`
    // fallback on the read even runs. Default it to an empty object
    // here once, rather than in every case.
    const rawCommand: ClaudeCommandInput = {
      action: parsedCommand.action,
      payload: parsedCommand.payload ?? {},
    };

    let command: Command;

    switch (rawCommand.action) {
      case "CREATE_APPLICATION": {
        const controls = (
          rawCommand.payload.controls ?? []
        ).filter((control) =>
          isNonEmptyString(control?.name)
        );

        command = {
          action: "CREATE_APPLICATION",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            hosting:
              rawCommand.payload.hosting ??
              "Unknown",

            controls: controls.map(
              (control) => ({
                name: control.name,
                framework:
                  control.framework ?? "SOX",
                tasks: sanitizeTaskInputs(
                  control.tasks
                ),
              })
            ),

            context:
              rawCommand.payload.context,
          },
        };

        break;
      }

      case "UPDATE_APPLICATION_CONTEXT": {
        command = {
          action:
            "UPDATE_APPLICATION_CONTEXT",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            hosting:
              rawCommand.payload.hosting,

            context:
              rawCommand.payload.context ??
              {},
          },
        };

        break;
      }

      case "RENAME_APPLICATION": {
        command = {
          action:
            "RENAME_APPLICATION",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            newName:
              rawCommand.payload
                .newName ?? "",
          },
        };

        break;
      }

      case "ADD_CONTROL": {
        command = {
          action: "ADD_CONTROL",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            framework:
              rawCommand.payload
                .framework ?? "SOX",

            controlObjective:
              rawCommand.payload
                .controlObjective,

            controlRisk:
              rawCommand.payload
                .controlRisk,

            applicabilityRationale:
              rawCommand.payload
                .applicabilityRationale,

            evidenceStrategy:
              rawCommand.payload
                .evidenceStrategy,

            argosObjective:
              rawCommand.payload
                .argosObjective,

            tasks: sanitizeTaskInputs(
              rawCommand.payload.tasks
            ),
          },
        };

        break;
      }

      case "REGENERATE_CONTROL_CHECKLIST": {
        command = {
          action:
            "REGENERATE_CONTROL_CHECKLIST",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            controlObjective:
              rawCommand.payload
                .controlObjective,

            controlRisk:
              rawCommand.payload
                .controlRisk,

            applicabilityRationale:
              rawCommand.payload
                .applicabilityRationale,

            evidenceStrategy:
              rawCommand.payload
                .evidenceStrategy,

            argosObjective:
              rawCommand.payload
                .argosObjective,

            tasks:
              sanitizeTaskInputs(
                rawCommand.payload.tasks
              ) ?? [],
          },
        };

        break;
      }

      case "GENERATE_CONTEXTUAL_CHECKLISTS": {
        const contextualControls = (
          rawCommand.payload
            .contextualControls ?? []
        ).filter((control) =>
          isNonEmptyString(control?.control)
        );

        command = {
          action:
            "GENERATE_CONTEXTUAL_CHECKLISTS",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            controls: contextualControls.map(
              (control) => ({
                ...control,
                tasks:
                  sanitizeTaskInputs(
                    control.tasks
                  ) ?? [],
              })
            ),
          },
        };

        break;
      }

      case "UPDATE_HOMEWORK": {
        command = {
          action: "UPDATE_HOMEWORK",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            status:
              rawCommand.payload.status ??
              "Waiting",
          },
        };

        break;
      }

      case "UPDATE_CONTROL_WORK": {
        command = {
          action:
            "UPDATE_CONTROL_WORK",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            homeworkStatus:
              rawCommand.payload
                .homeworkStatus,

            stage:
              rawCommand.payload.stage,

            controlStatus:
              rawCommand.payload
                .controlStatus,

            note:
              rawCommand.payload.note,

            nextTasks: sanitizeTaskInputs(
              rawCommand.payload.nextTasks
            ),
          },
        };

        break;
      }

      case "UPDATE_ALL_CONTROLS": {
        command = {
          action:
            "UPDATE_ALL_CONTROLS",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            homeworkStatus:
              rawCommand.payload
                .homeworkStatus,

            stage:
              rawCommand.payload.stage,

            controlStatus:
              rawCommand.payload
                .controlStatus,

            noteMode:
              rawCommand.payload
                .noteMode,

            notes:
              rawCommand.payload.notes,

            checklistMode:
              rawCommand.payload
                .checklistMode,

            checklistStatus:
              rawCommand.payload
                .checklistStatus,

            tasks: sanitizeTaskInputs(
              rawCommand.payload.tasks
            ),

            maxItems:
              rawCommand.payload
                .maxItems,
          },
        };

        break;
      }

      case "UPDATE_NOTES": {
        command = {
          action: "UPDATE_NOTES",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            mode:
              rawCommand.payload
                .noteMode ?? "APPEND",

            notes:
              rawCommand.payload.notes ??
              [],
          },
        };

        break;
      }

      case "UPDATE_CHECKLIST": {
        command = {
          action: "UPDATE_CHECKLIST",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            mode:
              rawCommand.payload
                .checklistMode ??
              "APPEND",

            checklistStatus:
              rawCommand.payload
                .checklistStatus,

            tasks: sanitizeTaskInputs(
              rawCommand.payload.tasks
            ),

            maxItems:
              rawCommand.payload
                .maxItems,
          },
        };

        break;
      }

      case "UPDATE_TASK_NOTES": {
        command = {
          action: "UPDATE_TASK_NOTES",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            taskText:
              rawCommand.payload
                .taskText ?? "",

            note:
              rawCommand.payload.note ??
              "",

            addTasks: sanitizeTaskInputs(
              rawCommand.payload.addTasks
            ),

            markIrrelevantTaskTexts:
              Array.isArray(
                rawCommand.payload
                  .markIrrelevantTaskTexts
              )
                ? rawCommand.payload.markIrrelevantTaskTexts.filter(
                    isNonEmptyString
                  )
                : undefined,

            changeLogEntries: Array.isArray(
              rawCommand.payload
                .changeLogEntries
            )
              ? rawCommand.payload.changeLogEntries.filter(
                  (entry) =>
                    entry &&
                    isNonEmptyString(
                      entry.taskText
                    ) &&
                    isNonEmptyString(
                      entry.reason
                    ) &&
                    (entry.changeType ===
                      "ADDED" ||
                      entry.changeType ===
                        "MARKED_IRRELEVANT")
                )
              : undefined,

            progressSummary:
              rawCommand.payload
                .progressSummary,

            qaScore:
              rawCommand.payload.qaScore,

            qaScoreRationale:
              rawCommand.payload
                .qaScoreRationale,
          },
        };

        break;
      }

      case "UPDATE_CHECKLIST_STATUS": {
        command = {
          action:
            "UPDATE_CHECKLIST_STATUS",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            checklistStatus:
              rawCommand.payload
                .checklistStatus ??
              "Review Pending",
          },
        };

        break;
      }

      case "UPDATE_CONTROL_STATUS": {
        command = {
          action:
            "UPDATE_CONTROL_STATUS",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            control:
              rawCommand.payload.control ??
              "",

            controlStatus:
              rawCommand.payload
                .controlStatus ?? "New",
          },
        };

        break;
      }

      case "DELETE_APPLICATION": {
        command = {
          action:
            "DELETE_APPLICATION",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            confirmed:
              rawCommand.payload
                .confirmed === true,
          },
        };

        break;
      }

      case "DELETE_ALL_APPLICATIONS": {
        command = {
          action:
            "DELETE_ALL_APPLICATIONS",

          payload: {
            confirmed:
              rawCommand.payload
                .confirmed === true,
          },
        };

        break;
      }

      case "CLEAR_CHAT_HISTORY": {
        command = {
          action:
            "CLEAR_CHAT_HISTORY",

          payload: {},
        };

        break;
      }

      case "EXPORT_PROGRESS_REPORT": {
        command = {
          action:
            "EXPORT_PROGRESS_REPORT",

          payload: {
            message:
              rawCommand.payload.message,
          },
        };

        break;
      }

      case "EXPORT_MEETING_PREP_EMAIL": {
        const rawEmail =
          rawCommand.payload.email;

        const email: MeetingPrepEmail = {
          subject: isNonEmptyString(
            rawEmail?.subject
          )
            ? rawEmail!.subject
            : "Quick prep before our meeting",

          applicationSummary: String(
            rawEmail?.applicationSummary ?? ""
          ).trim(),

          applicationUse: String(
            rawEmail?.applicationUse ?? ""
          ).trim(),

          checklistHighlights: Array.isArray(
            rawEmail?.checklistHighlights
          )
            ? rawEmail!.checklistHighlights.filter(
                isNonEmptyString
              )
            : [],

          openQuestions: Array.isArray(
            rawEmail?.openQuestions
          )
            ? rawEmail!.openQuestions
                .filter(
                  (item) =>
                    item &&
                    isNonEmptyString(
                      item.question
                    )
                )
                .map((item) => ({
                  question: item.question,
                  exampleAnswer: String(
                    item.exampleAnswer ?? ""
                  ).trim(),
                  relatedControls:
                    Array.isArray(
                      item.relatedControls
                    )
                      ? item.relatedControls.filter(
                          isNonEmptyString
                        )
                      : [],
                }))
            : [],

          closingNote: String(
            rawEmail?.closingNote ?? ""
          ).trim(),
        };

        command = {
          action:
            "EXPORT_MEETING_PREP_EMAIL",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            email,

            message:
              rawCommand.payload.message,
          },
        };

        break;
      }

      case "PROCESS_MEETING_RESPONSE": {
        const controlUpdates: MeetingResponseControlUpdate[] =
          (
            rawCommand.payload
              .controlUpdates ?? []
          )
            .filter((update) =>
              isNonEmptyString(update?.control)
            )
            .map((update) => ({
              control: update.control,

              taskNotes: Array.isArray(
                update.taskNotes
              )
                ? update.taskNotes
                    .filter(
                      (item) =>
                        item &&
                        isNonEmptyString(
                          item.taskText
                        ) &&
                        isNonEmptyString(
                          item.note
                        )
                    )
                    .map((item) => ({
                      taskText: item.taskText,
                      note: item.note,
                    }))
                : [],

              addTasks: sanitizeTaskInputs(
                update.addTasks
              ),

              markIrrelevantTaskTexts:
                Array.isArray(
                  update.markIrrelevantTaskTexts
                )
                  ? update.markIrrelevantTaskTexts.filter(
                      isNonEmptyString
                    )
                  : undefined,

              changeLogEntries:
                Array.isArray(
                  update.changeLogEntries
                )
                  ? update.changeLogEntries.filter(
                      (entry) =>
                        entry &&
                        isNonEmptyString(
                          entry.taskText
                        ) &&
                        isNonEmptyString(
                          entry.reason
                        ) &&
                        (entry.changeType ===
                          "ADDED" ||
                          entry.changeType ===
                            "MARKED_IRRELEVANT")
                    )
                  : undefined,

              progressSummary:
                update.progressSummary,

              qaScore: update.qaScore,

              qaScoreRationale:
                update.qaScoreRationale,
            }));

        command = {
          action:
            "PROCESS_MEETING_RESPONSE",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            hosting:
              rawCommand.payload.hosting,

            context:
              rawCommand.payload.context,

            controlUpdates,

            unmatchedNotes: Array.isArray(
              rawCommand.payload
                .unmatchedNotes
            )
              ? rawCommand.payload.unmatchedNotes.filter(
                  isNonEmptyString
                )
              : undefined,

            message:
              rawCommand.payload.message,
          },
        };

        break;
      }

      case "BACKUP_APPLICATION_DATA": {
        command = {
          action:
            "BACKUP_APPLICATION_DATA",

          payload: {
            message:
              rawCommand.payload.message,
          },
        };

        break;
      }

      case "LIST_BACKUPS": {
        command = {
          action: "LIST_BACKUPS",

          payload: {
            message:
              rawCommand.payload.message,
          },
        };

        break;
      }

      case "ROLLBACK_BACKUP": {
        command = {
          action: "ROLLBACK_BACKUP",

          payload: {
            version:
              rawCommand.payload.version ??
              0,

            confirmed:
              rawCommand.payload
                .confirmed === true,
          },
        };

        break;
      }

      default: {
        command = {
          action: "RESPOND_ONLY",

          payload: {
            message:
              rawCommand.payload
                .message ??
              "I need more information before changing Work Governor.",
          },
        };
      }
    }

    return NextResponse.json({
      command,

      assistantMessage:
        rawCommand.payload.message,

      usage: {
        inputTokens:
          response.usage.input_tokens,

        outputTokens:
          response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error(
      "Work Governor API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      {
        status: 500,
      }
    );
  }
}
