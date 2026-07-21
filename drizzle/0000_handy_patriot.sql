CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hosting" text DEFAULT '' NOT NULL,
	"application_purpose" text DEFAULT '' NOT NULL,
	"business_process" text DEFAULT '' NOT NULL,
	"application_owner" text DEFAULT '' NOT NULL,
	"technical_owner" text DEFAULT '' NOT NULL,
	"application_contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"identity_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hosting_details" text DEFAULT '' NOT NULL,
	"data_classification" text DEFAULT '' NOT NULL,
	"financial_relevance" text DEFAULT '' NOT NULL,
	"context_status" text DEFAULT 'Missing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controls" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"name" text NOT NULL,
	"framework" text NOT NULL,
	"homework_status" text DEFAULT 'Waiting' NOT NULL,
	"stage" text DEFAULT 'Homework' NOT NULL,
	"control_status" text DEFAULT 'New' NOT NULL,
	"checklist_status" text DEFAULT 'Review Pending' NOT NULL,
	"control_objective" text DEFAULT '' NOT NULL,
	"control_risk" text DEFAULT '' NOT NULL,
	"applicability_rationale" text DEFAULT '' NOT NULL,
	"evidence_strategy" text DEFAULT '' NOT NULL,
	"argos_objective" text DEFAULT '' NOT NULL,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checklist_change_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"progress_summary" text DEFAULT '' NOT NULL,
	"qa_score" text DEFAULT 'Not Started' NOT NULL,
	"qa_score_rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "controls" ADD CONSTRAINT "controls_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;