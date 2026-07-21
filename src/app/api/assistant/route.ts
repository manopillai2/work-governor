import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

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
    removeTaskTexts?: string[];

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

                      return `${index + 1}. [${
                        task.completed
                          ? "Complete"
                          : "Open"
                      }] [${task.category}] ${
                        task.required
                          ? "[Required]"
                          : "[Optional]"
                      } ${task.text}\n   Notes against this item:\n${taskNotes}`;
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

    const response =
      await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 6000,

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

If the user requests common SOX controls, select suitable controls such as:

- User Access Control;
- Privileged Access Management;
- User Provisioning and Deprovisioning;
- Segregation of Duties;
- Change Management;
- System Monitoring and Logging;
- Configuration Management;
- Backup and Recovery.

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
  further to track, or turns out not applicable, remove it by
  listing its exact existing text in removeTaskTexts.
- Only change the checklist when the notes give real evidence for
  it. Do not add or remove items speculatively.
- Every addition and every removal must have a matching entry in
  changeLogEntries with a specific reason grounded in what the notes
  actually said. Never add or remove a checklist item without a
  logged reason.
- Do not ask for confirmation before adding or removing checklist
  items this way. The change happens immediately, is visible on the
  checklist right away, and is permanently recorded in the checklist
  change log for later reference.

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

QUESTIONS AND FEEDBACK

Use RESPOND_ONLY for explanations, questions, feedback, and clarification.

Do not modify data when the user asks why something happened.

Return exactly one execute_work_governor_command tool call.

Do not return ordinary prose outside the tool call.
`,

        messages: [
          {
            role: "user",
            content: `
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

                    removeTaskTexts: {
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
                              "REMOVED",
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

    const rawCommand =
      toolCall.input as ClaudeCommandInput;

    let command: Command;

    switch (rawCommand.action) {
      case "CREATE_APPLICATION": {
        const controls =
          rawCommand.payload.controls ?? [];

        command = {
          action: "CREATE_APPLICATION",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            hosting:
              rawCommand.payload.hosting ??
              "Unknown",

            framework:
              controls[0]?.framework ??
              "SOX",

            controls: controls.map(
              (control) =>
                control.name
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

            tasks:
              rawCommand.payload.tasks,
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
              rawCommand.payload.tasks ??
              [],
          },
        };

        break;
      }

      case "GENERATE_CONTEXTUAL_CHECKLISTS": {
        command = {
          action:
            "GENERATE_CONTEXTUAL_CHECKLISTS",

          payload: {
            application:
              rawCommand.payload
                .application ?? "",

            controls:
              rawCommand.payload
                .contextualControls ?? [],
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

            nextTasks:
              rawCommand.payload
                .nextTasks,
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

            tasks:
              rawCommand.payload.tasks,

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

            tasks:
              rawCommand.payload.tasks,

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

            addTasks:
              rawCommand.payload.addTasks,

            removeTaskTexts:
              rawCommand.payload
                .removeTaskTexts,

            changeLogEntries:
              rawCommand.payload
                .changeLogEntries,

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
