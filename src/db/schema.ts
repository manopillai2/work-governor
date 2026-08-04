import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  ChecklistChangeLogEntry,
  ChecklistTask,
  Note,
} from "@/services/commandEngine";
import type { ChatMessageAttachment } from "@/components/ChatPanel";

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hosting: text("hosting").notNull().default(""),

  applicationPurpose: text("application_purpose").notNull().default(""),
  businessProcess: text("business_process").notNull().default(""),
  applicationOwner: text("application_owner").notNull().default(""),
  technicalOwner: text("technical_owner").notNull().default(""),
  applicationContacts: jsonb("application_contacts")
    .$type<string[]>()
    .notNull()
    .default([]),
  integrations: jsonb("integrations").$type<string[]>().notNull().default([]),
  identityTypes: jsonb("identity_types")
    .$type<string[]>()
    .notNull()
    .default([]),
  hostingDetails: text("hosting_details").notNull().default(""),
  dataClassification: text("data_classification").notNull().default(""),
  financialRelevance: text("financial_relevance").notNull().default(""),

  contextStatus: text("context_status").notNull().default("Missing"),

  // Short, high-level AI-written summary of how evidence and real data
  // differ across this application's controls -- see the matching field
  // on controls for the per-control detail.
  evidenceDataGapSummary: text("evidence_data_gap_summary").notNull().default(""),

  notes: jsonb("notes").$type<Note[]>().notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const controls = pgTable("controls", {
  id: text("id").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  framework: text("framework").notNull(),

  homeworkStatus: text("homework_status").notNull().default("Waiting"),
  stage: text("stage").notNull().default("Homework"),

  controlStatus: text("control_status").notNull().default("New"),
  checklistStatus: text("checklist_status").notNull().default("Review Pending"),

  controlObjective: text("control_objective").notNull().default(""),
  controlRisk: text("control_risk").notNull().default(""),
  applicabilityRationale: text("applicability_rationale").notNull().default(""),
  evidenceStrategy: text("evidence_strategy").notNull().default(""),
  argosObjective: text("argos_objective").notNull().default(""),

  // The globally recognized standard control name/number (e.g. an ITGC
  // domain under SOX) that this org's locally-named control maps to.
  // Analyzed once, at control-creation time, and left untouched by
  // checklist regeneration since it describes what kind of control this
  // is, not the checklist content.
  globalControlReference: text("global_control_reference").notNull().default(""),

  // The matching entry from the fixed client control-code reference
  // table (e.g. "IS02 - User provisioning"), set only when the user's
  // own chat message actually referenced it. Never inferred/guessed.
  clientContext: text("client_context").notNull().default(""),

  // AI-written comparison of this control's evidence-sourced notes
  // against its data-sourced notes -- see commandEngine.ts's
  // ComplianceControl.evidenceDataGapAnalysis for the full contract.
  evidenceDataGapAnalysis: text("evidence_data_gap_analysis")
    .notNull()
    .default(""),

  notes: jsonb("notes").$type<Note[]>().notNull().default([]),
  nextTasks: jsonb("next_tasks").$type<ChecklistTask[]>().notNull().default([]),
  checklistChangeLog: jsonb("checklist_change_log")
    .$type<ChecklistChangeLogEntry[]>()
    .notNull()
    .default([]),

  progressSummary: text("progress_summary").notNull().default(""),
  qaScore: text("qa_score").notNull().default("Not Started"),
  qaScoreRationale: text("qa_score_rationale").notNull().default(""),

  lastRegeneratedSignature: text("last_regenerated_signature")
    .notNull()
    .default(""),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  attachment: jsonb("attachment").$type<ChatMessageAttachment>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const evidenceDocuments = pgTable("evidence_documents", {
  id: text("id").primaryKey(),
  // Deliberately NOT a foreign key. /api/state's autosave does a full
  // delete-and-reinsert of every `applications` row on every single
  // state change (not just real deletions) -- with a references()
  // here, ON DELETE CASCADE fired on that delete every time, wiping
  // every evidence/data document the moment the app next autosaved,
  // even though the same application was about to be reinserted in
  // the same transaction. That silently emptied this table shortly
  // after every upload. Plain text column avoids that entirely; a
  // truly deleted application just leaves harmless orphaned rows here
  // (never surfaced, since every read is scoped to a live application
  // id from the UI).
  applicationId: text("application_id").notNull(),

  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  storagePath: text("storage_path").notNull(),

  // "evidence" (audit workpapers, policy docs, screenshots) vs
  // "data" (real collected application data -- exports, configs).
  // Purely a labeling/UI distinction; both flow through the same
  // upload, parsing, and note-distribution pipeline.
  kind: text("kind").notNull().default("evidence"),

  // "all" means the upload was applied against every control on the
  // application at the time it was processed; controlNames is only
  // populated when scope is "selected".
  scope: text("scope").notNull().default("all"),
  controlNames: jsonb("control_names")
    .$type<string[]>()
    .notNull()
    .default([]),

  extractedText: text("extracted_text").notNull().default(""),
  // True when extractedText was cut short at the storage cap --
  // surfaced in the evidence archive context so the assistant knows
  // not to treat it as necessarily complete.
  truncated: boolean("truncated").notNull().default(false),

  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const backups = pgTable("backups", {
  id: text("id").primaryKey(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
