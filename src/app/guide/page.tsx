// ======================================================
// Route          : /guide
// Purpose        : Standalone product guide for Work
//                  Governor -- architecture, objectives,
//                  and every function/action it exposes.
//                  Reached by clicking the "Control Governor"
//                  title in the app header.
// Author         : Manoj
// ======================================================

import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import RainToggle from "@/components/RainToggle";
import ControlGovernorExplainer from "@/components/ControlGovernorExplainer";

export const metadata: Metadata = {
  title: "Control Governor -- Guide",
  description:
    "Architecture, objectives, and functions of the Control Governor compliance workspace.",
};

type Tone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "indigo"
  | "slate";

const TONE_CARD: Record<Tone, string> = {
  blue: "border-blue-200 bg-blue-50",
  violet: "border-violet-200 bg-violet-50",
  emerald: "border-emerald-200 bg-emerald-50",
  amber: "border-amber-200 bg-amber-50",
  rose: "border-rose-200 bg-rose-50",
  cyan: "border-cyan-200 bg-cyan-50",
  indigo: "border-indigo-200 bg-indigo-50",
  slate: "border-slate-200 bg-slate-50",
};

const TONE_BADGE: Record<Tone, string> = {
  blue: "bg-blue-600",
  violet: "bg-violet-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-600",
  rose: "bg-rose-600",
  cyan: "bg-cyan-600",
  indigo: "bg-indigo-600",
  slate: "bg-slate-600",
};

const TONE_TEXT: Record<Tone, string> = {
  blue: "text-blue-700",
  violet: "text-violet-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  cyan: "text-cyan-700",
  indigo: "text-indigo-700",
  slate: "text-slate-700",
};

function SectionHeading({
  index,
  title,
  subtitle,
  tone = "blue",
}: {
  index: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${TONE_BADGE[tone]}`}
      >
        {index}
      </span>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function FlowBox({
  title,
  lines,
  tone,
  icon,
}: {
  title: string;
  lines: string[];
  tone: Tone;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border ${TONE_CARD[tone]} px-4 py-3 text-center shadow-sm`}
    >
      <div
        className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-white ${TONE_BADGE[tone]}`}
      >
        {icon}
      </div>
      <p className={`text-sm font-bold ${TONE_TEXT[tone]}`}>{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 text-xs text-slate-600">
          {line}
        </p>
      ))}
    </div>
  );
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBrowser() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="6" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11.2" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path
        d="M18.5 3.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3L3 8l9 5 9-5-9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6.5 18a3.5 3.5 0 010-7 5 5 0 019.7-1.7A3.5 3.5 0 0117.5 18h-11z" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg {...ICON_PROPS}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function IconFunnel() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 4h16l-6.5 8v6l-3 1.5v-7.5z" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="9" r="5" />
      <path d="M9.5 18.5h5" />
      <path d="M10 21h4" />
      <path d="M12 14v2.5" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <div className="relative flex justify-center py-1">
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <path
          d="M10 0V18M10 18L3 11M10 18L17 11"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="guide-flow-dot guide-flow-dot-y" />
    </div>
  );
}

function ArrowRight() {
  return (
    <div className="relative hidden items-center justify-center px-1 sm:flex">
      <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
        <path
          d="M0 10H18M18 10L11 3M18 10L11 17"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="guide-flow-dot guide-flow-dot-x" />
    </div>
  );
}

function FunctionCard({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div
      className={`rounded-2xl border ${TONE_CARD[tone]} p-5 shadow-sm transition hover:shadow-md`}
    >
      <h3 className={`text-base font-bold ${TONE_TEXT[tone]}`}>{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
    </div>
  );
}

function CategoryChip({
  name,
  description,
  tone,
}: {
  name: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${TONE_BADGE[tone]}`}
      >
        {name}
      </span>
      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}

const QA_LEVELS: { level: string; description: string; tone: Tone }[] = [
  {
    level: "Not Started",
    description: "No meaningful notes have been recorded yet.",
    tone: "slate",
  },
  {
    level: "Surface Level",
    description:
      "A few generic notes exist, but the checklist is still essentially the default one.",
    tone: "amber",
  },
  {
    level: "Developing",
    description:
      "Notes contain real specifics (named systems, owners, identities) and have prompted a refinement.",
    tone: "cyan",
  },
  {
    level: "Well Researched",
    description:
      "The checklist has been meaningfully reshaped; sources, owners, and access methods are concrete.",
    tone: "blue",
  },
  {
    level: "Argos Ready",
    description:
      "Evidence strategy and Argos objective are concrete enough to implement monitoring logic directly.",
    tone: "emerald",
  },
];

export default function GuidePage() {
  return (
    <main className="h-screen snap-y snap-proximity overflow-y-auto scroll-smooth bg-slate-50">
      {/* Hero */}
      <div className="snap-start bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-100 transition hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 13L5 8L10 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to the app
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <RainToggle />
            </div>
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Control Governor
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-blue-50">
            An AI-powered compliance workspace that turns plain-language
            application context into framework-aware SOX and PCI DSS
            checklists, adapts them from real findings with a fully
            auditable change history, and -- through the Learning Engine --
            carries validated knowledge across every application, driving
            toward authoritative, system-generated evidence and continuous
            Argos monitoring.
          </p>

          <p className="mt-3 max-w-2xl text-base leading-7 text-blue-50">
            It now also ingests the underlying evidence and real
            application data behind every control, tracks the two
            separately with full attribution, and actively surfaces where
            they diverge -- driving the shift from screenshot-style
            evidence to authoritative, system-generated data.
          </p>

          <p className="mt-3 max-w-2xl text-base leading-7 text-blue-50">
            Day-to-day work happens on a flat Controls list -- every
            control tagged with its application, client context ID, and
            control type, so filtering and cross-application summaries
            stay effortless even as more applications are added.
            Application-level context, evidence-vs-data summaries, and
            bulk actions (across every control on an application) live on
            a separate Applications page, one click away via the toggle
            button next to each view&apos;s heading.
          </p>

          <p className="mt-4 text-xs font-medium text-blue-200">
            Developed by Manoj &middot; Workspace: CORE &middot; Framework:
            SOX / PCI DSS
          </p>
        </div>
      </div>

      <section className="snap-start bg-slate-950 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <ControlGovernorExplainer />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-14">
        {/* 1. Architecture */}
        <section id="architecture" className="snap-start scroll-mt-4">
          <SectionHeading
            index="1"
            title="Architecture"
            subtitle="Every chat message is summarized together with full application state, chat history, and accepted learnings, then sent to Claude with a fixed tool schema. Claude returns exactly one structured command; commandEngine.ts is the only place that ever mutates application state."
            tone="blue"
          />

          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <FlowBox
                title="Browser UI"
                lines={["ChatPanel, ControlCard,", "ApplicationDetail"]}
                tone="blue"
                icon={<IconBrowser />}
              />
              <ArrowRight />
              <FlowBox
                title="/api/assistant"
                lines={["Claude (Anthropic API)", "command interpreter"]}
                tone="violet"
                icon={<IconSparkle />}
              />
              <ArrowRight />
              <FlowBox
                title="commandEngine.ts"
                lines={["deterministic state", "reducer"]}
                tone="emerald"
                icon={<IconLayers />}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <div />
              <div />
              <ArrowDown />
              <div />
              <ArrowDown />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <FlowBox
                title="/api/state"
                lines={["load / save snapshot"]}
                tone="blue"
                icon={<IconCloud />}
              />
              <ArrowRight />
              <FlowBox
                title="Postgres (core)"
                lines={[
                  "applications, controls,",
                  "chat_messages, backups,",
                  "evidence_documents",
                ]}
                tone="slate"
                icon={<IconDatabase />}
              />
              <ArrowRight />
              <FlowBox
                title="Export services"
                lines={["exportReport.ts", "meetingPrepEmail.ts"]}
                tone="rose"
                icon={<IconDocument />}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <div />
              <div />
              <div />
              <div />
              <ArrowDown />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <FlowBox
                title="/api/learnings/*"
                lines={["capture + human review"]}
                tone="blue"
                icon={<IconFunnel />}
              />
              <ArrowRight />
              <FlowBox
                title="Postgres (learning)"
                lines={[
                  "learnings, learning_notes,",
                  "client_reference_learnings",
                ]}
                tone="slate"
                icon={<IconDatabase />}
              />
              <ArrowRight />
              <FlowBox
                title="Learning Engine"
                lines={["reapplied on every", "regeneration"]}
                tone="emerald"
                icon={<IconBulb />}
              />
            </div>
          </div>
        </section>

        {/* 2. Objectives */}
        <section id="objectives" className="snap-start scroll-mt-4">
          <SectionHeading
            index="2"
            title="Permanent Assignment Objective"
            subtitle="This objective is permanent and guides every application, control, checklist, question, response, and recommendation Control Governor produces."
            tone="violet"
          />

          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Understand why each application exists.",
              "Understand the business process and financial relevance supported by the application.",
              "Understand why each SOX control applies to the application.",
              "Understand the risk that the control is intended to address.",
              "Challenge whether prior-season evidence is authoritative, complete, accurate, timely, and sufficient.",
              "Prefer direct, system-generated, machine-readable evidence instead of manually captured screenshots.",
              "Identify the authoritative systems, data owners, evidence owners, and control owners.",
              "Obtain appropriate read-only access to applications, servers, databases, APIs, identity sources, logs, configuration records, ticketing systems, cloud platforms, and reports.",
              "Identify every relevant human and non-human identity.",
              "Translate the control into objective, repeatable Argos monitoring logic.",
            ].map((item, index) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-700">
                  {item}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. Checklist generation priority */}
        <section id="priority" className="snap-start scroll-mt-4">
          <SectionHeading
            index="3"
            title="Checklist Generation Priority"
            subtitle="Applies to every checklist Control Governor produces -- creating, adding, or regenerating a control."
            tone="cyan"
          />

          <div className="space-y-3">
            {[
              {
                title: "Ground it in control intent",
                body: "What risk this specific control exists to address, and what it requires regardless of any particular application -- the foundation, even when nothing else is known yet.",
              },
              {
                title: "Refine with application context",
                body: "Purpose, business process, hosting, integrations, identity types, and financial relevance sharpen the foundation -- they never replace the control's intent.",
              },
              {
                title: "Weave in accepted learnings",
                body: "Any accepted learning matching this control's framework and this application's hosting is folded in.",
              },
              {
                title: "Never a bare placeholder",
                body: "If context is missing or incomplete, still produce a control-intent-grounded checklist -- while clearly flagging the gap and adding a required task to close it.",
              },
              {
                title: "Everything drives toward evidence and Argos",
                body: "Every task exists to find and collect valid, reliable evidence directly from the application -- prioritizing APIs, logs, and identity sources over screenshots -- and to progress toward repeatable Argos monitoring rule logic.",
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-cyan-800">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Task categories */}
        <section id="categories" className="snap-start scroll-mt-4">
          <SectionHeading
            index="4"
            title="Checklist Task Categories"
            subtitle="Every checklist task belongs to exactly one of these eight categories."
            tone="amber"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CategoryChip
              name="Homework"
              description="Prior-season evidence, control description, application documentation, known audit questions, missing context."
              tone="amber"
            />
            <CategoryChip
              name="Discovery"
              description="Application purpose, process, architecture, owners, integrations, environments, identity types, control operation."
              tone="blue"
            />
            <CategoryChip
              name="Access"
              description="Read-only application, server, database, cloud, API, log, identity-source, ticketing, and configuration access."
              tone="violet"
            />
            <CategoryChip
              name="Evidence Collection"
              description="Authoritative source, required fields, population, logs, reports, configuration, identities, extraction method."
              tone="emerald"
            />
            <CategoryChip
              name="Validation"
              description="Completeness, accuracy, frequency, retention, reconciliation, stale/orphaned identities, unresolved exceptions."
              tone="cyan"
            />
            <CategoryChip
              name="Approval"
              description="Application-owner, control-owner, evidence-owner confirmation, reviewer approval, sign-off."
              tone="rose"
            />
            <CategoryChip
              name="Argos Design"
              description="Data-source mapping, fields, monitoring logic and frequency, exception criteria, alert owner, remediation workflow."
              tone="indigo"
            />
            <CategoryChip
              name="Next Steps"
              description="Meetings, follow-ups, dependencies, missing access or contacts, open questions, action owners."
              tone="slate"
            />
          </div>
        </section>

        {/* 5. Functions */}
        <section id="functions" className="snap-start scroll-mt-4">
          <SectionHeading
            index="5"
            title="Functions &amp; Actions"
            subtitle="Every capability the chat command interpreter can trigger, in one turn, from a plain-language request."
            tone="emerald"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FunctionCard
              tone="blue"
              title="Create / rename applications"
              description="Registers a new application (with hosting and any known context) or renames an existing one, from a plain-language request."
            />
            <FunctionCard
              tone="blue"
              title="Update application context"
              description="Records purpose, business process, owners, contacts, hosting, integrations, identity types, data classification, and financial relevance as they're learned."
            />
            <FunctionCard
              tone="violet"
              title="Add controls"
              description="Attaches a named SOX or PCI DSS control to an application, with an initial checklist generated from the control's intent and any known context."
            />
            <FunctionCard
              tone="violet"
              title="Generate / regenerate checklists"
              description="Rebuilds one control's checklist, or every control's checklist for an application, from scratch -- combining control intent, current context, every recorded note, and accepted learnings."
            />
            <FunctionCard
              tone="emerald"
              title="Adaptive note analysis"
              description="Every note against a checklist item or control is analyzed immediately: it can add a new item or mark one irrelevant, and refreshes the progress summary and QA score -- always with a logged reason."
            />
            <FunctionCard
              tone="emerald"
              title="Application-team reply ingestion"
              description="Parses a pasted reply from an application team, distributes each answer to the right context field or checklist item across multiple controls at once, and files the rest as open notes."
            />
            <FunctionCard
              tone="amber"
              title="Meeting-prep email export"
              description="Drafts a plain-language email for the application team ahead of a compliance meeting -- what's known, plus a ranked, deduplicated list of open questions grouped by topic with example answers. Available per control and per application, as a chat command or a one-click button."
            />
            <FunctionCard
              tone="amber"
              title="Open questions view"
              description="The same underlying question set as the prep email, shown as a plain numbered list (no table) with a copy button -- for pasting straight into an email or ticket."
            />
            <FunctionCard
              tone="amber"
              title="Executive progress report (PDF)"
              description="Generates a formatted PDF: executive summary, control-status breakdown, per-application progress, QA scores, attention-required items, and every item marked irrelevant with its reason."
            />
            <FunctionCard
              tone="rose"
              title="Full data backup / rollback"
              description="Saves a restorable, numbered snapshot of every application, control, checklist, and the chat history; rolls back to any prior snapshot with confirmation."
            />
            <FunctionCard
              tone="rose"
              title="Learning Engine"
              description="Captures notable checklist changes as candidate learnings scoped by framework and hosting, and candidate Client Control Reference codes spotted in conversation -- both held for human approval before they're checked against any future checklist generation or applied to a control."
            />
            <FunctionCard
              tone="indigo"
              title="Checklist review status"
              description="Tracks Review Pending / Approved / Needs Revision / Completed per control, separate from the control's own workflow status."
            />
            <FunctionCard
              tone="indigo"
              title="Control workflow stage"
              description="Tracks each control through Homework, Discovery, Evidence Collection, Testing, Review, and Completed."
            />
            <FunctionCard
              tone="cyan"
              title="Client Control Reference codes"
              description="Maps each control to a fixed internal code table (e.g. IS02 - User provisioning). New codes mentioned in conversation are proposed, never assumed, and only take effect once approved through the Learning Engine."
            />
            <FunctionCard
              tone="emerald"
              title="Evidence & data attachments"
              description="Attach evidence documents (workpapers, policies, screenshots) or real application data (exports, configs) from the chat -- multiple files at once, any of docx/pptx/xlsx/pdf/csv/json/txt/md, no size limit. Full text is stored for future Q&A, and every note it produces is tagged with its source kind, filename, and a unique note ID."
            />
            <FunctionCard
              tone="emerald"
              title="Attachments manager"
              description="Per application: every uploaded file with its document ID, kind, upload date, and the note IDs it produced, filterable by Evidence / Data / All. Deleting a file strikes through the notes it produced instead of removing them, and flags the affected control for manual checklist regeneration."
            />
            <FunctionCard
              tone="emerald"
              title="Evidence vs. Data Gap Analysis"
              description="Per control: a structured breakdown of what each evidence document and data file claims, where they agree or contradict, and specifically what real data is still missing to independently back up each piece of evidence -- the throughline toward retiring screenshot-style evidence. A high-level version rolls up at the application level. Refreshes automatically after an upload, or on demand."
            />
          </div>
        </section>

        {/* 6. QA rubric */}
        <section id="qa-rubric" className="snap-start scroll-mt-4">
          <SectionHeading
            index="6"
            title="QA Score Rubric"
            subtitle="Reflects how deep the research is and how strongly the user's own notes have shaped the checklist toward solid, Argos-ready evidence -- not a pass/fail control status."
            tone="indigo"
          />

          <div className="space-y-2">
            {QA_LEVELS.map((item) => (
              <div
                key={item.level}
                className={`flex flex-col gap-1 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4 ${TONE_CARD[item.tone]}`}
              >
                <span
                  className={`inline-flex w-40 shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs font-bold text-white ${TONE_BADGE[item.tone]}`}
                >
                  {item.level}
                </span>
                <span className="text-sm leading-6 text-slate-700">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Data model */}
        <section id="data-model" className="snap-start scroll-mt-4">
          <SectionHeading
            index="7"
            title="Data Model"
            subtitle="Two Postgres databases back the app: the core workspace database, and a separate learning database."
            tone="slate"
          />

          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-3 font-semibold">Table</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "applications",
                    "One row per application: identity, hosting, context fields, notes, evidence-vs-data summary, and context-completeness status.",
                  ],
                  [
                    "controls",
                    "One row per control on an application: framework, statuses, objective/risk/evidence fields, evidence-vs-data gap analysis, checklist, change log, progress summary, and QA score.",
                  ],
                  [
                    "evidence_documents",
                    "One row per uploaded evidence or data file: application, filename, kind (evidence/data), extracted text, and upload metadata. Notes reference these by ID to know which document they came from.",
                  ],
                  [
                    "chat_messages",
                    "Persisted conversation history (role, content, and any attachment such as a meeting-prep email).",
                  ],
                  [
                    "backups",
                    "Numbered, restorable JSON snapshots of the full application/control/chat state.",
                  ],
                  [
                    "learnings",
                    "Candidate and accepted checklist-change learnings: content, suggested checklist item and category, framework/hosting scope, and the source change that produced them.",
                  ],
                  [
                    "learning_notes",
                    "Free-form notes attached to a learning during human review.",
                  ],
                  [
                    "client_reference_learnings",
                    "Candidate Client Control Reference codes spotted in conversation, held for human approval before they're usable.",
                  ],
                ].map(([table, purpose], index) => (
                  <tr
                    key={table}
                    className={
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                      {table}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        Control Governor &middot; Developed by Manoj
      </footer>
    </main>
  );
}
