// ======================================================
// Route          : /guide
// Purpose        : Product guide for Control Governor -- a short,
//                  visual tour: the animated explainer, the six-step
//                  journey, what you can do (click a tile for the
//                  detail), where things live, and -- collapsed --
//                  the technical "under the hood" material.
//                  Reached from "Control Governor" in the Classic
//                  header, or "Take the tour" / Guide in the New UI.
// Author         : Manoj
//
// Colors are inline styles on purpose: globals.css remaps several
// light Tailwind text colors (text-white, text-slate-100..300,
// text-blue-50..300) for the light theme, which would wash out text
// on the dark sections here.
// ======================================================

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import ControlGovernorExplainer from "@/components/ControlGovernorExplainer";
import UiModePicker from "@/components/UiModePicker";

export const metadata: Metadata = {
  title: "Control Governor -- Guide",
  description:
    "How Control Governor works: from an application name to evidence checked against real data, approved learnings and locked monitoring rules.",
};

const C = {
  navy: "#0b1f33",
  ink: "#0f172a",
  body: "#475569",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  canvas: "#f5f7fa",
  teal: "#0f7d8c",
  mint: "#5eead4",
  onDark: "#e6f4f6",
  onDarkMuted: "#9cc3ca",
};

// ---------- icons ----------

const PATHS = {
  app: "M4 5h16v4H4zM4 11h16v4H4zM4 17h16v3H4z",
  plus: "M12 5v14M5 12h14",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  file: "M7 3h7l5 5v13H7zM14 3v5h5",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  rule: "M4 7h10M4 12h16M4 17h7M17 4l3 3-3 3",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  check: "M5 12l5 5 9-10",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3",
  mail: "M3 6h18v12H3zM3 7l9 7 9-7",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  plug: "M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0zM12 17v4",
  chat: "M4 5h16v11H8l-4 4z",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  stop: "M7 7h10v10H7z",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  report: "M6 3h9l4 4v14H6zM9 13h6M9 17h6M9 9h2",
  pause: "M8 5v14M16 5v14",
  hub: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  layers: "M12 3L3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5",
} as const;

function Glyph({ name, size = 18, color = "currentColor" }: { name: keyof typeof PATHS; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---------- content ----------

const JOURNEY: { icon: keyof typeof PATHS; title: string; line: string; where: string }[] = [
  { icon: "plus", title: "Onboard", line: "A name is enough", where: "+ New" },
  { icon: "list", title: "Checklist", line: "Built from control intent", where: "Controls" },
  { icon: "file", title: "Evidence", line: "What the team claims", where: "Upload evidence" },
  { icon: "db", title: "Real data", line: "What the system proves", where: "Upload testing data" },
  { icon: "rule", title: "Rule", line: "Built, approved, locked", where: "Rule logic" },
  { icon: "pulse", title: "Monitor", line: "Exceptions, automatically", where: "Argos" },
];

type Feature = { icon: keyof typeof PATHS; title: string; line: string; more: string };

const GROUPS: { name: string; tag: string; color: string; soft: string; features: Feature[] }[] = [
  {
    name: "Build",
    tag: "From name to checklist",
    color: "#2563eb",
    soft: "#eff5ff",
    features: [
      { icon: "plus", title: "Onboarding", line: "Paste it, confirm it", more: "Paste anything -- even straight from a compliance tool. The assistant checks it, asks questions, and saves nothing until you confirm the exact application, controls and context." },
      { icon: "list", title: "Smart checklists", line: "8 categories, from control intent", more: "Control intent first, refined by application context, vendor docs and approved learnings. Missing context becomes a task -- never a blank." },
      { icon: "book", title: "Vendor docs", line: "Official facts, every one linked", more: "Known products get facts from the vendor's official documentation only, each linked to a page actually read, and reused across applications. In-house apps skip it." },
      { icon: "mail", title: "Meeting prep", line: "One email, ranked questions", more: "A plain-language email for the application team with deduplicated open questions and example answers -- per control or per application." },
    ],
  },
  {
    name: "Prove",
    tag: "Claims vs. facts",
    color: "#0f8a5f",
    soft: "#ecf8f2",
    features: [
      { icon: "file", title: "Uploads", line: "Confirmed before they land", more: "Evidence and testing data -- docx, pptx, xlsx, pdf, csv, json, txt, md. Every upload shows the application, control and files first: Yes, upload or No, go back." },
      { icon: "search", title: "Readiness profile", line: "Verified · conflicts · next asks", more: "What the evidence claims, checked against the real data per population, configuration and access -- with the share verified and what to request next." },
      { icon: "spark", title: "Gap analysis", line: "Every gap becomes a task", more: "Where evidence and data agree or contradict, and what data is missing -- each gap turns into an Access or Evidence Collection item." },
      { icon: "plug", title: "Data collection", line: "Approved collectors pull it directly", more: "Save an encrypted connection, let the AI write a collector, review its security checks, approve it, run it. Output lands as testing data." },
    ],
  },
  {
    name: "Learn",
    tag: "Smarter every time",
    color: "#7c3aed",
    soft: "#f4f0fe",
    features: [
      { icon: "chat", title: "Adaptive notes", line: "Notes reshape the checklist", more: "Every note is analyzed at once: items are added or marked irrelevant, each change logged with why it serves the control's objective." },
      { icon: "bulb", title: "Learning pop-up", line: "Approve, deny or snooze", more: "One short card at a time: a headline, why it matters, what it adds. Snooze it, or move it to the Learning hub for later." },
      { icon: "hub", title: "Learning hub", line: "Everything learned, by status", more: "Sidebar → Learnings: waiting, approved and denied, with search. Revoke an approved learning or re-open a denied one." },
      { icon: "layers", title: "Control codes", line: "New codes need approval", more: "Client control codes mentioned in chat are proposed, never assumed, and only used once approved." },
    ],
  },
  {
    name: "Control",
    tag: "You stay in charge",
    color: "#0f7d8c",
    soft: "#e9f6f8",
    features: [
      { icon: "rule", title: "Rule logic", line: "Built from real data", more: "Each control's monitoring rule builds itself when testing data or a readiness profile arrives -- with readiness and a still-needed list. Nothing invented." },
      { icon: "chat", title: "Rule assistant", line: "Ask or change, right beside it", more: "Ask “which records would this flag today?” or tell it what to change. Changes save as a new version; approved and locked rules are only discussed." },
      { icon: "lock", title: "Approve & lock", line: "Developing → Approved → Locked", more: "Approved rules aren't overwritten -- rebuilds wait as an update to apply or dismiss. Locked rules are frozen until unlocked." },
      { icon: "stop", title: "Stop & roll back", line: "Cancel anything, restore anytime", more: "Stop any running request -- nothing changes. Numbered backups restore the whole workspace." },
    ],
  },
];

const CATEGORIES: [string, string, string][] = [
  ["Homework", "Prior evidence, gaps", "#b45309"],
  ["Discovery", "Purpose, owners, flows", "#2563eb"],
  ["Access", "Read-only access", "#7c3aed"],
  ["Evidence Collection", "Authoritative sources", "#0f8a5f"],
  ["Validation", "Complete & accurate", "#0891b2"],
  ["Approval", "Owner sign-off", "#be123c"],
  ["Argos Design", "Monitoring logic", "#4f46e5"],
  ["Next Steps", "Follow-ups", "#475569"],
];

const PRINCIPLES: [keyof typeof PATHS, string, string][] = [
  ["shield", "Intent first", "What risk the control exists for"],
  ["app", "Context refines", "Never replaces the intent"],
  ["bulb", "Approved learnings", "Nothing reused unreviewed"],
  ["list", "Never blank", "Missing context becomes a task"],
  ["db", "Data over screenshots", "Toward system-generated proof"],
];

const OBJECTIVES = [
  "Understand why each application exists.",
  "Understand the business process and financial relevance it supports.",
  "Understand why each SOX control applies to it.",
  "Understand the risk the control addresses.",
  "Challenge whether prior evidence is authoritative, complete, accurate, timely and sufficient.",
  "Prefer direct, system-generated, machine-readable evidence over screenshots.",
  "Identify the authoritative systems and the data, evidence and control owners.",
  "Obtain read-only access to applications, databases, APIs, identity sources, logs and tickets.",
  "Identify every relevant human and non-human identity.",
  "Translate the control into objective, repeatable Argos monitoring logic.",
];

const TABLES: [string, string][] = [
  ["applications", "Identity, context and hosting per application"],
  ["controls", "Statuses, checklist, change log, readiness profile, rule logic + lifecycle"],
  ["evidence_documents", "Every uploaded file and its extracted text"],
  ["chat_messages", "The assistant conversation"],
  ["backups", "Numbered, restorable snapshots"],
  ["app_connections", "Data-collection connections (secrets encrypted)"],
  ["collector_scripts / runs", "Collector versions, security checks, approvals, runs"],
  ["learnings · learning_notes", "Checklist learnings by status, with reviewer notes"],
  ["client_reference_learnings", "Proposed control codes awaiting approval"],
  ["platform_references", "Official vendor documentation per product"],
];

const NAV_MAP: [keyof typeof PATHS, string, string][] = [
  ["hub", "Dashboard", "The portfolio at a glance"],
  ["app", "Applications", "Cards, + New, View details"],
  ["list", "Controls", "The control matrix"],
  ["bulb", "Learnings", "The Learning hub"],
  ["report", "Executive summary", "The PDF for leadership"],
  ["chat", "Assistant", "Bottom left, or the floating button"],
];

// ---------- building blocks ----------

function SectionTitle({ kicker, title, line }: { kicker: string; title: string; line?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: C.teal }}>{kicker}</p>
      <h2 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[36px]" style={{ color: C.ink }}>{title}</h2>
      {line ? <p className="mt-2 text-[16px]" style={{ color: C.body }}>{line}</p> : null}
    </div>
  );
}

function Fold({ title, icon, children }: { title: string; icon: keyof typeof PATHS; children: ReactNode }) {
  return (
    <details className="gx-fold rounded-2xl border bg-white" style={{ borderColor: C.line }}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: C.canvas, color: C.teal }}>
          <Glyph name={icon} />
        </span>
        <span className="flex-1 text-[15px] font-semibold" style={{ color: C.ink }}>{title}</span>
        <span className="gx-chevron text-[18px]" style={{ color: C.faint }}>⌄</span>
      </summary>
      <div className="border-t px-5 py-5" style={{ borderColor: C.line }}>{children}</div>
    </details>
  );
}

// ---------- page ----------

export default function GuidePage() {
  return (
    <main className="h-screen overflow-y-auto scroll-smooth" style={{ background: C.canvas }}>
      {/* Hero */}
      <header className="guide-hero gx-hero relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: C.onDarkMuted }}>
              <span aria-hidden="true">←</span> Back to the app
            </Link>
            <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: C.onDarkMuted }}>
              Layout <UiModePicker onDark />
            </div>
          </div>

          <div className="gx-rise mt-16 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: "rgba(94,234,212,0.12)", color: C.mint, border: "1px solid rgba(94,234,212,0.3)" }}>
              <span className="gx-dot" /> SOX · PCI DSS · Argos-ready
            </span>
            <h1 className="mt-5 text-[48px] font-extrabold leading-[1.02] tracking-tight sm:text-[68px]" style={{ color: "#ffffff" }}>
              Control Governor
            </h1>
            <p className="mt-5 text-[20px] leading-8 sm:text-[22px]" style={{ color: C.onDark }}>
              From an application name to a <span style={{ color: C.mint, fontWeight: 700 }}>locked monitoring rule</span> -- with every claim checked against real data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#how" className="rounded-xl px-5 py-3 text-[14px] font-semibold shadow-lg" style={{ background: C.mint, color: C.navy }}>
                See how it works
              </a>
              <Link href="/" className="rounded-xl px-5 py-3 text-[14px] font-semibold" style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.28)" }}>
                Open the app
              </Link>
            </div>
          </div>

          <div className="gx-rise gx-delay-2 mt-14 grid gap-3 sm:grid-cols-3">
            {[
              ["spark", "Understand", "Context + control intent"],
              ["db", "Prove", "Evidence vs. real data"],
              ["lock", "Automate", "Rules you approve and lock"],
            ].map(([icon, title, line]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(94,234,212,0.14)", color: C.mint }}>
                  <Glyph name={icon as keyof typeof PATHS} size={20} />
                </span>
                <span>
                  <span className="block text-[15px] font-bold" style={{ color: "#ffffff" }}>{title}</span>
                  <span className="block text-[13px]" style={{ color: C.onDarkMuted }}>{line}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Animated explainer */}
      <section id="how" className="scroll-mt-4 px-6 py-14" style={{ background: "#070d19" }}>
        <div className="mx-auto max-w-7xl">
          <ControlGovernorExplainer />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-6 py-20">
        {/* Journey */}
        <section>
          <SectionTitle kicker="The journey" title="Six steps. One control." line="Follow any control from onboarding to automated monitoring." />
          <ol className="gx-journey grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {JOURNEY.map((step, index) => (
              <li key={step.title} className="gx-card gx-step relative rounded-2xl border bg-white p-5" style={{ borderColor: C.line, animationDelay: `${index * 70}ms` }}>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: C.faint }}>0{index + 1}</span>
                <span className="mt-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg,#0f7d8c,#16324a)", color: "#ffffff" }}>
                  <Glyph name={step.icon} size={22} />
                </span>
                <p className="mt-4 text-[17px] font-bold" style={{ color: C.ink }}>{step.title}</p>
                <p className="mt-1 text-[13.5px] leading-5" style={{ color: C.body }}>{step.line}</p>
                <span className="mt-3 inline-block rounded-md px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: C.canvas, color: C.teal }}>{step.where}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section>
          <SectionTitle kicker="What you can do" title="Everything, in one workspace." line="Click any tile for the detail." />
          <div className="grid gap-5 lg:grid-cols-2">
            {GROUPS.map((group) => (
              <div key={group.name} className="gx-card overflow-hidden rounded-3xl border bg-white" style={{ borderColor: C.line }}>
                <div className="flex items-baseline justify-between px-6 pb-3 pt-5" style={{ background: group.soft }}>
                  <h3 className="text-[22px] font-extrabold tracking-tight" style={{ color: group.color }}>{group.name}</h3>
                  <span className="text-[13px] font-medium" style={{ color: C.muted }}>{group.tag}</span>
                </div>
                <div className="grid sm:grid-cols-2">
                  {group.features.map((feature) => (
                    <details key={feature.title} className="gx-tile border-t sm:[&:nth-child(odd)]:border-r" style={{ borderColor: C.line }}>
                      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: group.soft, color: group.color }}>
                          <Glyph name={feature.icon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold" style={{ color: C.ink }}>{feature.title}</span>
                          <span className="block text-[13px]" style={{ color: C.muted }}>{feature.line}</span>
                        </span>
                        <span className="gx-plus mt-1 text-[16px] font-bold" style={{ color: group.color }}>+</span>
                      </summary>
                      <p className="px-5 pb-4 pl-[68px] text-[13.5px] leading-6" style={{ color: C.body }}>{feature.more}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Where things live */}
        <section>
          <SectionTitle kicker="Find your way" title="Where everything lives." line="Two layouts, one workspace -- switch any time." />
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="gx-card rounded-3xl border bg-white p-6" style={{ borderColor: C.line }}>
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold" style={{ color: C.ink }}>New UI <span className="ml-1 rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#e9f6f8", color: C.teal }}>recommended</span></h3>
                <span className="text-[12px]" style={{ color: C.muted }}>Sidebar</span>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {NAV_MAP.map(([icon, name, line]) => (
                  <li key={name} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: C.canvas }}>
                    <span style={{ color: C.teal }}><Glyph name={icon} /></span>
                    <span>
                      <span className="block text-[14px] font-semibold" style={{ color: C.ink }}>{name}</span>
                      <span className="block text-[12px]" style={{ color: C.muted }}>{line}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="gx-card flex flex-col justify-between rounded-3xl p-6" style={{ background: "linear-gradient(160deg,#0b1f33,#0f5f6e)" }}>
              <div>
                <h3 className="text-[17px] font-bold" style={{ color: "#ffffff" }}>Classic</h3>
                <p className="mt-2 text-[14px] leading-6" style={{ color: C.onDark }}>One flat control list with the assistant docked alongside.</p>
              </div>
              <div className="mt-6 space-y-2 text-[13px]" style={{ color: C.onDarkMuted }}>
                <p><span style={{ color: C.mint }}>Switch:</span> “Try new UI” / “Classic UI” at top right</p>
                <p><span style={{ color: C.mint }}>Share:</span> add <code style={{ color: "#ffffff" }}>?ui=hub</code> or <code style={{ color: "#ffffff" }}>?ui=classic</code></p>
                <p><span style={{ color: C.mint }}>Tour:</span> “Take the tour” in the top bar</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories + principles */}
        <section>
          <SectionTitle kicker="How it thinks" title="Five rules. Eight kinds of task." />
          <div className="grid gap-3 sm:grid-cols-5">
            {PRINCIPLES.map(([icon, title, line], index) => (
              <div key={title} className="gx-card rounded-2xl border bg-white p-4" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold" style={{ color: C.faint }}>{index + 1}</span>
                  <span style={{ color: C.teal }}><Glyph name={icon} /></span>
                </div>
                <p className="mt-3 text-[15px] font-bold" style={{ color: C.ink }}>{title}</p>
                <p className="mt-0.5 text-[12.5px] leading-5" style={{ color: C.muted }}>{line}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map(([name, hint, color]) => (
              <span key={name} className="inline-flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-4" style={{ borderColor: C.line }}>
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: color, color: "#ffffff" }}>{name}</span>
                <span className="text-[12.5px]" style={{ color: C.muted }}>{hint}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Under the hood */}
        <section>
          <SectionTitle kicker="Under the hood" title="For the curious." line="Collapsed by default -- open what you need." />
          <div className="space-y-3">
            <Fold title="Architecture" icon="layers">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                {["Browser", "Assistant (Claude)", "One structured command", "Command engine", "Postgres", "Exports"].map((step, index, all) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-lg px-3 py-1.5" style={{ background: C.canvas, color: C.ink }}>{step}</span>
                    {index < all.length - 1 ? <span style={{ color: C.faint }}><Glyph name="arrow" size={16} /></span> : null}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[13.5px] leading-6" style={{ color: C.body }}>
                The AI never writes data directly: it returns one structured command, and a deterministic engine applies it. A separate learning database holds learnings, control codes and vendor documentation.
              </p>
            </Fold>
            <Fold title="The 10 standing objectives" icon="shield">
              <ol className="grid gap-2 sm:grid-cols-2">
                {OBJECTIVES.map((item, index) => (
                  <li key={item} className="flex gap-3 text-[13.5px] leading-6" style={{ color: C.body }}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "#e9f6f8", color: C.teal }}>{index + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </Fold>
            <Fold title="Data model" icon="db">
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {TABLES.map(([table, purpose]) => (
                  <div key={table} className="flex gap-3 rounded-lg px-3 py-2" style={{ background: C.canvas }}>
                    <dt className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: C.ink }}>{table}</dt>
                    <dd className="text-[12.5px]" style={{ color: C.muted }}>{purpose}</dd>
                  </div>
                ))}
              </dl>
            </Fold>
          </div>
        </section>
      </div>

      <footer className="border-t py-8 text-center text-[12px]" style={{ borderColor: C.line, color: C.faint, background: "#ffffff" }}>
        Control Governor · Developed by Manoj
      </footer>

      <style>{`
        .gx-hero {
          background:
            radial-gradient(circle at 80% 10%, rgba(94,234,212,0.18), transparent 40%),
            radial-gradient(circle at 10% 90%, rgba(37,99,235,0.18), transparent 45%),
            linear-gradient(135deg, #0b1f33 0%, #0f3d4f 55%, #0f6f7d 100%);
        }
        .gx-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(to bottom, black 30%, transparent 100%);
        }
        .gx-dot {
          width: 7px; height: 7px; border-radius: 9999px; background: #5eead4;
          box-shadow: 0 0 0 0 rgba(94,234,212,0.7);
          animation: gx-ping 2s ease-out infinite;
        }
        @keyframes gx-ping { 0% { box-shadow: 0 0 0 0 rgba(94,234,212,0.6); } 100% { box-shadow: 0 0 0 10px rgba(94,234,212,0); } }
        .gx-rise { animation: gx-rise 700ms cubic-bezier(.2,.7,.2,1) both; }
        .gx-delay-2 { animation-delay: 180ms; }
        @keyframes gx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .gx-card { transition: transform 180ms ease, box-shadow 180ms ease; }
        .gx-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px -18px rgba(15,40,60,0.35); }
        .gx-step { animation: gx-rise 600ms cubic-bezier(.2,.7,.2,1) both; }
        @media (min-width: 1024px) {
          .gx-step:not(:last-child)::after {
            content: ""; position: absolute; top: 60px; right: -14px; width: 12px; height: 2px;
            background: linear-gradient(90deg, #0f7d8c, transparent);
          }
        }
        .gx-tile summary::-webkit-details-marker, .gx-fold summary::-webkit-details-marker { display: none; }
        .gx-tile summary:hover { background: #fafbfc; }
        .gx-tile[open] .gx-plus { transform: rotate(45deg); }
        .gx-plus, .gx-chevron { transition: transform 160ms ease; display: inline-block; }
        .gx-fold[open] .gx-chevron { transform: rotate(180deg); }
        @media (prefers-reduced-motion: reduce) {
          .gx-rise, .gx-step, .gx-dot { animation: none; }
          .gx-card:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}
