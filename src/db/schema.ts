import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  ChecklistChangeLogEntry,
  ChecklistTask,
} from "@/services/commandEngine";

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

  notes: jsonb("notes").$type<string[]>().notNull().default([]),

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

  notes: jsonb("notes").$type<string[]>().notNull().default([]),
  nextTasks: jsonb("next_tasks").$type<ChecklistTask[]>().notNull().default([]),
  checklistChangeLog: jsonb("checklist_change_log")
    .$type<ChecklistChangeLogEntry[]>()
    .notNull()
    .default([]),

  progressSummary: text("progress_summary").notNull().default(""),
  qaScore: text("qa_score").notNull().default("Not Started"),
  qaScoreRationale: text("qa_score_rationale").notNull().default(""),

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
  createdAt: timestamp("created_at", { withTimezone: true })
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
