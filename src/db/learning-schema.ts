import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const learnings = pgTable("learnings", {
  id: text("id").primaryKey(),

  content: text("content").notNull(),
  suggestedTaskText: text("suggested_task_text").notNull(),
  suggestedCategory: text("suggested_category").notNull(),

  framework: text("framework"),
  hosting: text("hosting"),

  status: text("status").notNull().default("pending"),

  sourceApplicationId: text("source_application_id").notNull(),
  sourceControlId: text("source_control_id").notNull(),
  sourceChangeType: text("source_change_type").notNull(),
  sourceTaskText: text("source_task_text").notNull(),
  sourceReason: text("source_reason").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const learningNotes = pgTable("learning_notes", {
  id: text("id").primaryKey(),
  learningId: text("learning_id")
    .notNull()
    .references(() => learnings.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A candidate addition to the fixed client control-code reference
// table (src/services/clientReference.ts), proposed only when the
// user's own chat message contained a code/description not already in
// that table (static entries or previously accepted rows here).
// Pending approval before it's usable for future matching.
export const clientReferenceLearnings = pgTable(
  "client_reference_learnings",
  {
    id: text("id").primaryKey(),

    code: text("code").notNull(),
    title: text("title").notNull(),

    status: text("status").notNull().default("pending"),

    sourceApplicationId: text("source_application_id").notNull(),
    sourceControlId: text("source_control_id").notNull(),
    sourceControlName: text("source_control_name").notNull(),
    // Verbatim snippet from the user's own message establishing the
    // code -- kept for audit, so acceptance is never based on a
    // fabricated-sounding match.
    sourceQuote: text("source_quote").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  }
);
