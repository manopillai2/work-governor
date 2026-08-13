"use client";

import React, { useEffect, useMemo, useState } from "react";

type StageId =
  | "understand"
  | "control"
  | "checklist"
  | "evidence"
  | "adaptive"
  | "learning"
  | "argos";

type Stage = {
  id: StageId;
  number: string;
  short: string;
  title: string;
  subtitle: string;
};

const STAGES: Stage[] = [
  {
    id: "understand",
    number: "01",
    short: "Understand",
    title: "Understand the application",
    subtitle:
      "Purpose, business process, owners, hosting, identities, integrations, and financial relevance.",
  },
  {
    id: "control",
    number: "02",
    short: "Control",
    title: "Connect control intent to risk",
    subtitle:
      "Control Governor combines application context with the control objective and the risk it is meant to address.",
  },
  {
    id: "checklist",
    number: "03",
    short: "Build",
    title: "Generate a context-aware checklist",
    subtitle:
      "Control intent + application context + accepted learnings become concrete research and evidence tasks.",
  },
  {
    id: "evidence",
    number: "04",
    short: "Validate",
    title: "Compare evidence with real application data",
    subtitle:
      "Evidence and underlying data remain separate, attributable, and testable against each other.",
  },
  {
    id: "adaptive",
    number: "05",
    short: "Refine",
    title: "Adapt as new facts arrive",
    subtitle:
      "Notes and application-team responses refine the checklist with a reasoned, auditable change history.",
  },
  {
    id: "learning",
    number: "06",
    short: "Learn",
    title: "Reuse validated knowledge",
    subtitle:
      "Candidate learnings require human approval before they can influence future checklist generation.",
  },
  {
    id: "argos",
    number: "07",
    short: "Monitor",
    title: "Turn research into Argos monitoring",
    subtitle:
      "Authoritative data becomes repeatable logic, exception detection, ownership, and remediation.",
  },
];

const AUTO_ADVANCE_MS = 5400;

function Icon({
  name,
  size = 18,
}: {
  name:
    | "app"
    | "control"
    | "check"
    | "file"
    | "database"
    | "spark"
    | "learn"
    | "monitor"
    | "arrow"
    | "alert"
    | "user";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "app":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M3 9h18" />
          <path d="M8 14h3" />
          <path d="M8 17h7" />
        </svg>
      );
    case "control":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5c0 4.7 2.9 8.2 7 10 4.1-1.8 7-5.3 7-10V6l-7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-4" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5" />
          <path d="M10 13h5M10 17h5" />
        </svg>
      );
    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3 1.5 4.2L18 9l-4.5 1.8L12 15l-1.5-4.2L6 9l4.5-1.8z" />
          <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
        </svg>
      );
    case "learn":
      return (
        <svg {...common}>
          <path d="M4 5.5C6 4.5 8 4 10 4c1.4 0 2.4.4 3 1.2V20c-.6-.8-1.6-1.2-3-1.2-2 0-4 .5-6 1.5z" />
          <path d="M20 5.5C18 4.5 16 4 14 4c-1.4 0-2.4.4-3 1.2V20c.6-.8 1.6-1.2 3-1.2 2 0 4 .5 6 1.5z" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="m7 12 3-3 2 2 4-4 2 2" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m14 7 5 5-5 5" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 4 3.8 19h16.4z" />
          <path d="M12 9v4M12 16h.01" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
        </svg>
      );
  }
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
}) {
  return <span className={`cg-pill cg-pill--${tone}`}>{children}</span>;
}

function MiniCard({
  icon,
  title,
  children,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`cg-mini-card ${className}`}>
      <div className="cg-mini-card__title">
        {icon}
        <span>{title}</span>
      </div>
      {children && <div className="cg-mini-card__body">{children}</div>}
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="cg-flow-arrow" aria-hidden="true">
      {label && <span>{label}</span>}
      <div className="cg-flow-arrow__line">
        <div className="cg-flow-arrow__packet" />
        <Icon name="arrow" size={16} />
      </div>
    </div>
  );
}

function UnderstandStage() {
  const context = [
    "Business Process",
    "Financial Relevance",
    "Hosting",
    "Owners",
    "Identities",
    "Integrations",
  ];

  return (
    <div className="cg-scene cg-scene--understand">
      <div className="cg-context-orbit" aria-hidden="true">
        {context.map((item, index) => (
          <span
            key={item}
            className="cg-context-chip"
            style={{ "--i": index } as React.CSSProperties}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="cg-app-card cg-primary-card">
        <div className="cg-card-icon">
          <Icon name="app" />
        </div>
        <div>
          <div className="cg-eyebrow">Application</div>
          <h3>Salesforce</h3>
          <div className="cg-app-meta">
            <span>SOX</span>
            <span>Cloud</span>
            <span>Identity-aware</span>
          </div>
        </div>
      </div>

      <div className="cg-understand-result">
        <span className="cg-pulse-dot" />
        Application context becomes structured control knowledge
      </div>
    </div>
  );
}

function ControlStage() {
  return (
    <div className="cg-scene cg-scene--control">
      <MiniCard icon={<Icon name="app" />} title="Application Context">
        Salesforce · cloud · financial reporting
      </MiniCard>

      <div className="cg-control-merge">
        <FlowArrow />
        <div className="cg-primary-card cg-control-card">
          <div className="cg-card-icon">
            <Icon name="control" />
          </div>
          <div>
            <div className="cg-eyebrow">SOX Control</div>
            <h3>User Access Review</h3>
            <p>Is access appropriate, complete, and periodically reviewed?</p>
          </div>
        </div>
        <FlowArrow />
      </div>

      <div className="cg-risk-stack">
        <MiniCard title="Control Intent">
          Validate who has access and whether it remains appropriate.
        </MiniCard>
        <MiniCard title="Risk">
          Excess, stale, or privileged access could affect financial systems.
        </MiniCard>
      </div>

      <div className="cg-merge-result">
        <Icon name="spark" />
        <span>Context + Intent + Risk</span>
      </div>
    </div>
  );
}

function ChecklistStage() {
  const tasks = [
    ["Discovery", "Identify authoritative identity source"],
    ["Access", "Obtain read-only API access"],
    ["Evidence Collection", "Collect human & service accounts"],
    ["Validation", "Validate population completeness"],
    ["Argos Design", "Define exception logic"],
  ];

  return (
    <div className="cg-scene cg-scene--checklist">
      <div className="cg-input-row">
        <Pill tone="accent">Control Intent</Pill>
        <span>+</span>
        <Pill>Application Context</Pill>
        <span>+</span>
        <Pill>Accepted Learnings</Pill>
      </div>

      <FlowArrow label="generate" />

      <div className="cg-checklist-card">
        <div className="cg-checklist-card__header">
          <div>
            <div className="cg-eyebrow">Context-aware checklist</div>
            <h3>User Access Review</h3>
          </div>
          <Pill tone="accent">Adaptive</Pill>
        </div>

        <div className="cg-task-list">
          {tasks.map(([category, task], index) => (
            <div
              className="cg-task-row"
              key={task}
              style={{ "--i": index } as React.CSSProperties}
            >
              <span className="cg-task-check">
                <Icon name="check" size={15} />
              </span>
              <div>
                <span className="cg-task-category">{category}</span>
                <strong>{task}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceStage() {
  return (
    <div className="cg-scene cg-scene--evidence">
      <div className="cg-source-column">
        <div className="cg-source-heading">
          <Icon name="file" />
          <span>Evidence</span>
        </div>
        <MiniCard title="Screenshot">Quarterly access review</MiniCard>
        <MiniCard title="PDF / Workpaper">Reviewer sign-off</MiniCard>
        <MiniCard title="Policy">Access governance standard</MiniCard>
      </div>

      <div className="cg-analysis-core">
        <div className="cg-analysis-ring">
          <Icon name="spark" size={24} />
        </div>
        <strong>Gap Analysis</strong>
        <span>Compare claims with authoritative data</span>

        <div className="cg-outcomes">
          <Pill tone="good">✓ Match</Pill>
          <Pill tone="warn">! Gap</Pill>
          <Pill tone="bad">× Contradiction</Pill>
        </div>
      </div>

      <div className="cg-source-column">
        <div className="cg-source-heading">
          <Icon name="database" />
          <span>Application Data</span>
        </div>
        <MiniCard title="API">Users · roles · permissions</MiniCard>
        <MiniCard title="Identity Source">Entra ID / SSO</MiniCard>
        <MiniCard title="Logs / Config">Sign-ins · settings · history</MiniCard>
      </div>

      <div className="cg-data-path cg-data-path--left" aria-hidden="true">
        <span />
      </div>
      <div className="cg-data-path cg-data-path--right" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

function AdaptiveStage() {
  return (
    <div className="cg-scene cg-scene--adaptive">
      <div className="cg-chat-bubble">
        <div className="cg-chat-avatar">
          <Icon name="user" size={16} />
        </div>
        <div>
          <span>Application team</span>
          <strong>“Accounts are authenticated through Entra ID.”</strong>
        </div>
      </div>

      <FlowArrow label="analyze" />

      <div className="cg-adaptive-grid">
        <div className="cg-change-panel">
          <div className="cg-change-panel__title">
            <Icon name="spark" />
            New information detected
          </div>

          <div className="cg-change-row cg-change-row--old">
            <span>Before</span>
            <strong>Identify authentication method</strong>
          </div>

          <div className="cg-change-row cg-change-row--done">
            <span>Resolved</span>
            <strong>Authentication source = Entra ID</strong>
          </div>

          <div className="cg-change-row cg-change-row--new">
            <span>Added</span>
            <strong>Obtain Entra ID sign-in & identity data</strong>
          </div>
        </div>

        <div className="cg-audit-panel">
          <span className="cg-audit-dot" />
          <div>
            <div className="cg-eyebrow">Auditable adaptation</div>
            <strong>Checklist refined</strong>
            <p>Reason recorded · source attributed · progress refreshed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LearningStage() {
  const apps = ["Salesforce", "SAP", "Workday", "ServiceNow"];

  return (
    <div className="cg-scene cg-scene--learning">
      <div className="cg-learning-source">
        <MiniCard icon={<Icon name="control" />} title="Researched control">
          Validated finding from a completed control
        </MiniCard>
        <FlowArrow />
        <MiniCard icon={<Icon name="learn" />} title="Candidate Learning">
          Prefer authoritative IdP data for account population validation.
        </MiniCard>
      </div>

      <div className="cg-human-review">
        <div className="cg-eyebrow">Human review required</div>
        <div className="cg-review-actions">
          <button type="button" tabIndex={-1}>
            Reject
          </button>
          <button type="button" className="cg-review-accept" tabIndex={-1}>
            <Icon name="check" size={14} />
            Accept
          </button>
        </div>
      </div>

      <div className="cg-learning-engine">
        <div className="cg-learning-engine__core">
          <Icon name="learn" size={24} />
          <strong>Learning Engine</strong>
          <span>Validated knowledge reused</span>
        </div>

        <div className="cg-app-fan">
          {apps.map((app, index) => (
            <div
              key={app}
              className="cg-app-node"
              style={{ "--i": index } as React.CSSProperties}
            >
              <Icon name="app" size={15} />
              <span>{app}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArgosStage() {
  const records = [
    "Users",
    "Roles",
    "Permissions",
    "Configurations",
    "Logs",
  ];

  return (
    <div className="cg-scene cg-scene--argos">
      <div className="cg-argos-pipeline">
        <div className="cg-argos-source">
          <Icon name="database" size={22} />
          <span>Authoritative Data</span>
          <div className="cg-record-stream">
            {records.map((record, index) => (
              <span
                key={record}
                style={{ "--i": index } as React.CSSProperties}
              >
                {record}
              </span>
            ))}
          </div>
        </div>

        <FlowArrow />

        <div className="cg-rule-card">
          <div className="cg-eyebrow">Monitoring Logic</div>
          <strong>Detect</strong>
          <p>Inactive account with privileged access</p>
          <div className="cg-rule-status">
            <Pill tone="good">✓ Normal</Pill>
            <Pill tone="warn">⚠ Exception</Pill>
          </div>
        </div>

        <FlowArrow />

        <div className="cg-argos-core">
          <div className="cg-argos-logo">
            <Icon name="monitor" size={26} />
          </div>
          <strong>Argos</strong>
          <span>Continuous monitoring</span>
        </div>
      </div>

      <div className="cg-remediation-flow">
        <span>Exception</span>
        <Icon name="arrow" size={14} />
        <span>Owner</span>
        <Icon name="arrow" size={14} />
        <span>Remediation</span>
      </div>

      <div className="cg-finale">
        <div className="cg-finale__eyebrow">CONTROL GOVERNOR</div>
        <h3>From control understanding to continuous assurance.</h3>
        <p>Understand. Validate. Learn. Automate.</p>
      </div>
    </div>
  );
}

function StageScene({ stage }: { stage: StageId }) {
  switch (stage) {
    case "understand":
      return <UnderstandStage />;
    case "control":
      return <ControlStage />;
    case "checklist":
      return <ChecklistStage />;
    case "evidence":
      return <EvidenceStage />;
    case "adaptive":
      return <AdaptiveStage />;
    case "learning":
      return <LearningStage />;
    case "argos":
      return <ArgosStage />;
  }
}

export default function ControlGovernorExplainer({
  autoPlay = true,
  className = "",
}: {
  autoPlay?: boolean;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const activeStage = STAGES[activeIndex];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!autoPlay || paused || reducedMotion) return;

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % STAGES.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
  }, [autoPlay, paused, reducedMotion]);

  const progress = useMemo(
    () => ((activeIndex + 1) / STAGES.length) * 100,
    [activeIndex]
  );

  return (
    <section
      className={`cg-explainer ${className}`}
      aria-label="How Control Governor works"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="cg-shell">
        <div className="cg-header">
          <div>
            <div className="cg-kicker">
              <span className="cg-kicker__dot" />
              How Control Governor Works
            </div>
            <h2>Follow a control from discovery to continuous monitoring.</h2>
            <p>
              Control Governor turns application context, control intent, evidence,
              real data, and validated learnings into repeatable Argos monitoring.
            </p>
          </div>

          <div className="cg-stage-counter" aria-label="Current stage">
            <span>{activeStage.number}</span>
            <span>/</span>
            <span>07</span>
          </div>
        </div>

        <div className="cg-progress" aria-hidden="true">
          <div
            className="cg-progress__bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="cg-workspace">
          <div className="cg-stage-copy" key={`copy-${activeStage.id}`}>
            <div className="cg-stage-copy__number">{activeStage.number}</div>
            <div>
              <div className="cg-eyebrow">{activeStage.short}</div>
              <h3>{activeStage.title}</h3>
              <p>{activeStage.subtitle}</p>
            </div>
          </div>

          <div
            className={`cg-visual ${
              reducedMotion ? "cg-visual--reduced" : ""
            }`}
            key={`scene-${activeStage.id}`}
          >
            <StageScene stage={activeStage.id} />
          </div>
        </div>

        <div className="cg-stage-nav" aria-label="Explainer stages">
          {STAGES.map((stage, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={stage.id}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => setActiveIndex(index)}
                aria-pressed={active}
                aria-label={`${stage.number} ${stage.short}: ${stage.title}`}
              >
                <span className="cg-stage-nav__number">{stage.number}</span>
                <span className="cg-stage-nav__label">{stage.short}</span>
              </button>
            );
          })}
        </div>

        <div className="cg-footer-note">
          <span className="cg-footer-note__line" />
          <span>
            Application context → Control intent → Checklist → Evidence & data →
            Validated learning → Argos
          </span>
          <span className="cg-footer-note__line" />
        </div>
      </div>

      <style>{`
        .cg-explainer {
          --cg-bg: var(--background, #0b1020);
          --cg-panel: color-mix(in srgb, var(--card, #151b2d) 94%, transparent);
          --cg-panel-2: color-mix(in srgb, var(--muted, #1b2338) 86%, transparent);
          --cg-border: color-mix(in srgb, var(--border, #536079) 36%, transparent);
          --cg-text: var(--foreground, #f7f8fb);
          --cg-muted: color-mix(in srgb, var(--foreground, #f7f8fb) 64%, transparent);
          --cg-faint: color-mix(in srgb, var(--foreground, #f7f8fb) 38%, transparent);
          --cg-accent: var(--primary, #8aa4ff);
          --cg-accent-strong: color-mix(in srgb, var(--primary, #8aa4ff) 82%, white);
          --cg-good: #4cc38a;
          --cg-warn: #e0ad4c;
          --cg-bad: #e47777;
          --cg-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
          width: 100%;
          color: var(--cg-text);
        }

        .cg-explainer * {
          box-sizing: border-box;
        }

        .cg-shell {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--cg-border);
          border-radius: 28px;
          background:
            radial-gradient(circle at 86% 8%, color-mix(in srgb, var(--cg-accent) 12%, transparent), transparent 34%),
            linear-gradient(180deg, color-mix(in srgb, var(--cg-bg) 96%, white 4%), var(--cg-bg));
          box-shadow: var(--cg-shadow);
          padding: clamp(22px, 3vw, 38px);
          isolation: isolate;
        }

        .cg-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: 0.18;
          background-image:
            linear-gradient(var(--cg-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--cg-border) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 78%);
        }

        .cg-header {
          display: flex;
          gap: 28px;
          align-items: flex-start;
          justify-content: space-between;
        }

        .cg-header > div:first-child {
          max-width: 800px;
        }

        .cg-kicker,
        .cg-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 750;
          color: var(--cg-accent-strong);
        }

        .cg-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .cg-kicker__dot,
        .cg-pulse-dot,
        .cg-audit-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--cg-accent);
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--cg-accent) 12%, transparent);
        }

        .cg-header h2 {
          margin: 0;
          font-size: clamp(24px, 3.2vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.035em;
          font-weight: 760;
          max-width: 900px;
        }

        .cg-header p {
          margin: 14px 0 0;
          color: var(--cg-muted);
          line-height: 1.6;
          max-width: 780px;
          font-size: 14px;
        }

        .cg-stage-counter {
          display: flex;
          align-items: baseline;
          gap: 6px;
          border: 1px solid var(--cg-border);
          border-radius: 999px;
          padding: 9px 13px;
          color: var(--cg-faint);
          background: color-mix(in srgb, var(--cg-panel) 72%, transparent);
          font-variant-numeric: tabular-nums;
        }

        .cg-stage-counter span:first-child {
          color: var(--cg-text);
          font-size: 18px;
          font-weight: 700;
        }

        .cg-progress {
          height: 2px;
          margin: 26px 0 24px;
          background: var(--cg-border);
          overflow: hidden;
          border-radius: 999px;
        }

        .cg-progress__bar {
          height: 100%;
          background: var(--cg-accent);
          transition: width 450ms ease;
          box-shadow: 0 0 16px color-mix(in srgb, var(--cg-accent) 68%, transparent);
        }

        .cg-workspace {
          display: grid;
          grid-template-columns: minmax(220px, 0.72fr) minmax(0, 2fr);
          gap: clamp(24px, 4vw, 54px);
          align-items: stretch;
          min-height: 460px;
        }

        .cg-stage-copy {
          display: flex;
          gap: 18px;
          align-items: flex-start;
          padding-top: 30px;
          animation: cg-copy-in 520ms ease both;
        }

        .cg-stage-copy__number {
          color: var(--cg-faint);
          font-variant-numeric: tabular-nums;
          font-size: 13px;
          margin-top: 1px;
        }

        .cg-stage-copy h3 {
          margin: 9px 0 11px;
          font-size: clamp(21px, 2vw, 30px);
          line-height: 1.12;
          letter-spacing: -0.025em;
        }

        .cg-stage-copy p {
          margin: 0;
          color: var(--cg-muted);
          line-height: 1.62;
          font-size: 14px;
        }

        .cg-visual {
          position: relative;
          min-width: 0;
          border: 1px solid var(--cg-border);
          border-radius: 24px;
          min-height: 460px;
          background:
            radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--cg-accent) 9%, transparent), transparent 38%),
            color-mix(in srgb, var(--cg-panel) 82%, transparent);
          overflow: hidden;
          animation: cg-scene-in 600ms cubic-bezier(.2,.75,.25,1) both;
        }

        .cg-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,.025), transparent);
          transform: translateX(-70%);
          animation: cg-sheen 5s ease-in-out infinite;
        }

        .cg-scene {
          min-height: 458px;
          height: 100%;
          width: 100%;
          position: relative;
          padding: clamp(20px, 3vw, 34px);
        }

        .cg-primary-card,
        .cg-mini-card,
        .cg-checklist-card,
        .cg-change-panel,
        .cg-audit-panel,
        .cg-rule-card,
        .cg-argos-core,
        .cg-chat-bubble {
          border: 1px solid var(--cg-border);
          background: color-mix(in srgb, var(--cg-panel) 95%, transparent);
          box-shadow: 0 12px 30px rgba(0,0,0,.12);
          backdrop-filter: blur(10px);
        }

        .cg-primary-card {
          border-radius: 20px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .cg-card-icon,
        .cg-argos-logo {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 13px;
          color: var(--cg-accent-strong);
          background: color-mix(in srgb, var(--cg-accent) 13%, transparent);
          border: 1px solid color-mix(in srgb, var(--cg-accent) 25%, transparent);
        }

        .cg-primary-card h3,
        .cg-checklist-card h3 {
          margin: 3px 0 0;
          font-size: 20px;
          letter-spacing: -0.02em;
        }

        .cg-primary-card p {
          margin: 7px 0 0;
          color: var(--cg-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .cg-mini-card {
          border-radius: 15px;
          padding: 13px 14px;
          min-width: 0;
        }

        .cg-mini-card__title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--cg-text);
          font-size: 12px;
          font-weight: 700;
        }

        .cg-mini-card__title svg {
          color: var(--cg-accent-strong);
        }

        .cg-mini-card__body {
          margin-top: 6px;
          color: var(--cg-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .cg-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
          border: 1px solid var(--cg-border);
          border-radius: 999px;
          padding: 4px 9px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          color: var(--cg-muted);
          background: color-mix(in srgb, var(--cg-panel-2) 74%, transparent);
        }

        .cg-pill--accent {
          color: var(--cg-accent-strong);
          border-color: color-mix(in srgb, var(--cg-accent) 35%, transparent);
          background: color-mix(in srgb, var(--cg-accent) 10%, transparent);
        }

        .cg-pill--good {
          color: var(--cg-good);
          border-color: color-mix(in srgb, var(--cg-good) 30%, transparent);
          background: color-mix(in srgb, var(--cg-good) 8%, transparent);
        }

        .cg-pill--warn {
          color: var(--cg-warn);
          border-color: color-mix(in srgb, var(--cg-warn) 30%, transparent);
          background: color-mix(in srgb, var(--cg-warn) 8%, transparent);
        }

        .cg-pill--bad {
          color: var(--cg-bad);
          border-color: color-mix(in srgb, var(--cg-bad) 30%, transparent);
          background: color-mix(in srgb, var(--cg-bad) 8%, transparent);
        }

        .cg-flow-arrow {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          color: var(--cg-faint);
          min-width: 52px;
        }

        .cg-flow-arrow > span {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .cg-flow-arrow__line {
          width: 100%;
          display: flex;
          align-items: center;
          position: relative;
        }

        .cg-flow-arrow__line::before {
          content: "";
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, var(--cg-border), var(--cg-accent));
        }

        .cg-flow-arrow__packet {
          position: absolute;
          left: 3px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--cg-accent);
          box-shadow: 0 0 10px var(--cg-accent);
          animation: cg-packet 2s linear infinite;
        }

        .cg-scene--understand {
          display: grid;
          place-items: center;
        }

        .cg-app-card {
          position: relative;
          z-index: 4;
          min-width: min(330px, 82%);
          animation: cg-card-float 4s ease-in-out infinite;
        }

        .cg-app-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .cg-app-meta span {
          border: 1px solid var(--cg-border);
          border-radius: 999px;
          padding: 4px 7px;
          color: var(--cg-muted);
          font-size: 9px;
        }

        .cg-context-orbit {
          position: absolute;
          inset: 22px;
          z-index: 2;
        }

        .cg-context-chip {
          position: absolute;
          top: calc(10% + (var(--i) * 13%));
          left: calc(3% + ((var(--i) % 2) * 72%));
          border: 1px solid var(--cg-border);
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 10px;
          color: var(--cg-muted);
          background: var(--cg-panel);
          animation:
            cg-context-in 700ms calc(var(--i) * 120ms) ease both,
            cg-context-pulse 3.6s calc(var(--i) * 300ms) ease-in-out infinite;
        }

        .cg-context-chip:nth-child(2),
        .cg-context-chip:nth-child(5) {
          left: auto;
          right: 4%;
        }

        .cg-context-chip:nth-child(3) {
          left: 8%;
        }

        .cg-context-chip:nth-child(4) {
          left: auto;
          right: 8%;
        }

        .cg-understand-result {
          position: absolute;
          left: 50%;
          bottom: 34px;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          align-items: center;
          white-space: nowrap;
          font-size: 11px;
          color: var(--cg-muted);
        }

        .cg-pulse-dot {
          animation: cg-dot-pulse 1.8s ease-in-out infinite;
        }

        .cg-scene--control {
          display: grid;
          grid-template-columns: 1fr;
          align-content: center;
          gap: 22px;
        }

        .cg-scene--control > .cg-mini-card {
          max-width: 250px;
          justify-self: start;
          animation: cg-slide-right 600ms ease both;
        }

        .cg-control-merge {
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr) 70px;
          align-items: center;
          gap: 8px;
        }

        .cg-control-card {
          animation: cg-pop 620ms 100ms ease both;
        }

        .cg-risk-stack {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-left: auto;
          width: min(560px, 86%);
        }

        .cg-risk-stack .cg-mini-card {
          animation: cg-rise 640ms ease both;
        }

        .cg-risk-stack .cg-mini-card:nth-child(2) {
          animation-delay: 120ms;
        }

        .cg-merge-result {
          justify-self: center;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--cg-accent-strong);
          font-size: 11px;
          font-weight: 700;
          border: 1px solid color-mix(in srgb, var(--cg-accent) 30%, transparent);
          background: color-mix(in srgb, var(--cg-accent) 8%, transparent);
          border-radius: 999px;
          padding: 8px 12px;
          animation: cg-pop 600ms 450ms ease both;
        }

        .cg-scene--checklist {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 17px;
        }

        .cg-input-row {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          color: var(--cg-faint);
          animation: cg-rise 550ms ease both;
        }

        .cg-scene--checklist > .cg-flow-arrow {
          transform: rotate(90deg);
          width: 56px;
          margin: -8px 0;
        }

        .cg-checklist-card {
          width: min(580px, 100%);
          border-radius: 19px;
          padding: 18px;
          animation: cg-pop 600ms 120ms ease both;
        }

        .cg-checklist-card__header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--cg-border);
        }

        .cg-task-list {
          display: grid;
          gap: 3px;
          padding-top: 10px;
        }

        .cg-task-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 7px;
          border-radius: 10px;
          opacity: 0;
          transform: translateY(7px);
          animation: cg-task-in 420ms calc(260ms + var(--i) * 150ms) ease forwards;
        }

        .cg-task-row:hover {
          background: color-mix(in srgb, var(--cg-accent) 5%, transparent);
        }

        .cg-task-check {
          width: 23px;
          height: 23px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 7px;
          color: var(--cg-good);
          border: 1px solid color-mix(in srgb, var(--cg-good) 28%, transparent);
          background: color-mix(in srgb, var(--cg-good) 8%, transparent);
        }

        .cg-task-row > div {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .cg-task-row strong {
          font-size: 11px;
          font-weight: 650;
          color: var(--cg-text);
        }

        .cg-task-category {
          color: var(--cg-faint);
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: 8px;
        }

        .cg-scene--evidence {
          display: grid;
          grid-template-columns: 1fr 160px 1fr;
          align-items: center;
          gap: 18px;
        }

        .cg-source-column {
          display: grid;
          gap: 10px;
          position: relative;
          z-index: 2;
        }

        .cg-source-column:first-child .cg-mini-card {
          animation: cg-slide-right 520ms ease both;
        }

        .cg-source-column:last-of-type .cg-mini-card {
          animation: cg-slide-left 520ms ease both;
        }

        .cg-source-column .cg-mini-card:nth-child(2) { animation-delay: 80ms; }
        .cg-source-column .cg-mini-card:nth-child(3) { animation-delay: 160ms; }
        .cg-source-column .cg-mini-card:nth-child(4) { animation-delay: 240ms; }

        .cg-source-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--cg-text);
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .cg-source-heading svg {
          color: var(--cg-accent-strong);
        }

        .cg-analysis-core {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 7px;
          animation: cg-pop 580ms 240ms ease both;
        }

        .cg-analysis-core strong {
          font-size: 13px;
        }

        .cg-analysis-core > span {
          color: var(--cg-muted);
          font-size: 9px;
          line-height: 1.4;
        }

        .cg-analysis-ring {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border: 1px solid color-mix(in srgb, var(--cg-accent) 45%, transparent);
          border-radius: 50%;
          color: var(--cg-accent-strong);
          background: color-mix(in srgb, var(--cg-accent) 10%, transparent);
          box-shadow:
            0 0 0 9px color-mix(in srgb, var(--cg-accent) 5%, transparent),
            0 0 34px color-mix(in srgb, var(--cg-accent) 20%, transparent);
          animation: cg-analysis 3s ease-in-out infinite;
        }

        .cg-outcomes {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 5px;
          margin-top: 6px;
        }

        .cg-data-path {
          position: absolute;
          top: 50%;
          height: 1px;
          width: 28%;
          background: linear-gradient(90deg, transparent, var(--cg-accent), transparent);
          opacity: .5;
        }

        .cg-data-path span {
          position: absolute;
          width: 6px;
          height: 6px;
          top: -2.5px;
          border-radius: 50%;
          background: var(--cg-accent);
          box-shadow: 0 0 10px var(--cg-accent);
          animation: cg-path-packet 1.8s linear infinite;
        }

        .cg-data-path--left {
          left: 21%;
        }

        .cg-data-path--right {
          right: 21%;
          transform: scaleX(-1);
        }

        .cg-scene--adaptive {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
        }

        .cg-chat-bubble {
          width: min(520px, 94%);
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 17px;
          padding: 14px 16px;
          animation: cg-rise 550ms ease both;
        }

        .cg-chat-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: color-mix(in srgb, var(--cg-accent) 11%, transparent);
          color: var(--cg-accent-strong);
          flex: 0 0 auto;
        }

        .cg-chat-bubble > div:last-child {
          display: grid;
          gap: 4px;
        }

        .cg-chat-bubble span {
          font-size: 9px;
          color: var(--cg-faint);
          text-transform: uppercase;
          letter-spacing: .09em;
        }

        .cg-chat-bubble strong {
          font-size: 12px;
          font-weight: 650;
        }

        .cg-scene--adaptive > .cg-flow-arrow {
          transform: rotate(90deg);
          width: 56px;
          margin: -8px 0;
        }

        .cg-adaptive-grid {
          display: grid;
          grid-template-columns: 1.4fr .8fr;
          gap: 12px;
          width: min(650px, 100%);
        }

        .cg-change-panel,
        .cg-audit-panel {
          border-radius: 18px;
          padding: 16px;
        }

        .cg-change-panel {
          animation: cg-slide-right 580ms 120ms ease both;
        }

        .cg-change-panel__title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 11px;
          color: var(--cg-accent-strong);
          font-size: 11px;
          font-weight: 700;
        }

        .cg-change-row {
          display: grid;
          gap: 3px;
          padding: 9px 10px;
          border-radius: 10px;
          margin-top: 6px;
          border: 1px solid transparent;
        }

        .cg-change-row span {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: var(--cg-faint);
        }

        .cg-change-row strong {
          font-size: 10px;
          font-weight: 650;
        }

        .cg-change-row--old {
          opacity: .48;
          text-decoration: line-through;
          background: color-mix(in srgb, var(--cg-panel-2) 64%, transparent);
        }

        .cg-change-row--done {
          border-color: color-mix(in srgb, var(--cg-good) 24%, transparent);
          background: color-mix(in srgb, var(--cg-good) 6%, transparent);
        }

        .cg-change-row--new {
          border-color: color-mix(in srgb, var(--cg-accent) 24%, transparent);
          background: color-mix(in srgb, var(--cg-accent) 6%, transparent);
        }

        .cg-audit-panel {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          align-self: stretch;
          animation: cg-slide-left 580ms 220ms ease both;
        }

        .cg-audit-dot {
          margin-top: 4px;
          flex: 0 0 auto;
          animation: cg-dot-pulse 1.8s ease-in-out infinite;
        }

        .cg-audit-panel strong {
          display: block;
          margin-top: 6px;
          font-size: 13px;
        }

        .cg-audit-panel p {
          margin: 6px 0 0;
          color: var(--cg-muted);
          font-size: 9px;
          line-height: 1.5;
        }

        .cg-scene--learning {
          display: grid;
          grid-template-columns: 1fr;
          align-content: center;
          gap: 20px;
        }

        .cg-learning-source {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 70px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
        }

        .cg-learning-source .cg-mini-card:first-child {
          animation: cg-slide-right 550ms ease both;
        }

        .cg-learning-source .cg-mini-card:last-child {
          animation: cg-slide-left 550ms 100ms ease both;
        }

        .cg-human-review {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid var(--cg-border);
          border-radius: 14px;
          padding: 9px 11px;
          background: color-mix(in srgb, var(--cg-panel-2) 78%, transparent);
          animation: cg-pop 550ms 220ms ease both;
        }

        .cg-review-actions {
          display: flex;
          gap: 6px;
        }

        .cg-review-actions button {
          pointer-events: none;
          border: 1px solid var(--cg-border);
          border-radius: 8px;
          background: transparent;
          color: var(--cg-muted);
          padding: 6px 8px;
          font: inherit;
          font-size: 9px;
        }

        .cg-review-actions .cg-review-accept {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--cg-good);
          border-color: color-mix(in srgb, var(--cg-good) 32%, transparent);
          background: color-mix(in srgb, var(--cg-good) 8%, transparent);
          animation: cg-accept 1.2s 650ms ease both;
        }

        .cg-learning-engine {
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          align-items: center;
          gap: 24px;
        }

        .cg-learning-engine__core {
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          text-align: center;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--cg-accent) 35%, transparent);
          color: var(--cg-accent-strong);
          background: radial-gradient(circle, color-mix(in srgb, var(--cg-accent) 14%, transparent), transparent 72%);
          box-shadow: 0 0 38px color-mix(in srgb, var(--cg-accent) 13%, transparent);
          animation: cg-analysis 3s ease-in-out infinite;
        }

        .cg-learning-engine__core strong {
          font-size: 12px;
        }

        .cg-learning-engine__core span {
          color: var(--cg-muted);
          font-size: 8px;
        }

        .cg-app-fan {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .cg-app-node {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--cg-border);
          border-radius: 11px;
          padding: 9px 10px;
          background: var(--cg-panel);
          color: var(--cg-muted);
          font-size: 10px;
          opacity: 0;
          transform: translateX(-8px);
          animation: cg-node-in 420ms calc(720ms + var(--i) * 150ms) ease forwards;
        }

        .cg-app-node svg {
          color: var(--cg-accent-strong);
        }

        .cg-scene--argos {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
        }

        .cg-argos-pipeline {
          display: grid;
          grid-template-columns: 1fr 60px 1.15fr 60px .78fr;
          align-items: center;
          gap: 8px;
        }

        .cg-argos-source,
        .cg-rule-card,
        .cg-argos-core {
          min-width: 0;
        }

        .cg-argos-source {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          border: 1px solid var(--cg-border);
          border-radius: 17px;
          padding: 15px;
          background: var(--cg-panel);
          animation: cg-slide-right 560ms ease both;
        }

        .cg-argos-source > svg {
          color: var(--cg-accent-strong);
        }

        .cg-argos-source > span {
          font-size: 11px;
          font-weight: 700;
        }

        .cg-record-stream {
          width: 100%;
          display: grid;
          gap: 5px;
        }

        .cg-record-stream span {
          display: block;
          width: max-content;
          max-width: 100%;
          padding: 5px 8px;
          border-radius: 7px;
          color: var(--cg-muted);
          background: color-mix(in srgb, var(--cg-panel-2) 78%, transparent);
          font-size: 8px;
          opacity: 0;
          animation: cg-record 2.2s calc(var(--i) * 260ms) ease-in-out infinite;
        }

        .cg-rule-card {
          border-radius: 17px;
          padding: 16px;
          animation: cg-pop 560ms 150ms ease both;
        }

        .cg-rule-card strong {
          display: block;
          margin-top: 8px;
          font-size: 14px;
        }

        .cg-rule-card p {
          margin: 5px 0 10px;
          color: var(--cg-muted);
          font-size: 10px;
          line-height: 1.45;
        }

        .cg-rule-status {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .cg-argos-core {
          min-height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 20px;
          animation: cg-slide-left 560ms 260ms ease both;
        }

        .cg-argos-core strong {
          margin-top: 9px;
          font-size: 16px;
        }

        .cg-argos-core > span {
          margin-top: 4px;
          color: var(--cg-muted);
          font-size: 9px;
        }

        .cg-remediation-flow {
          align-self: center;
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--cg-faint);
          font-size: 9px;
          animation: cg-rise 520ms 500ms ease both;
        }

        .cg-finale {
          text-align: center;
          padding-top: 8px;
          animation: cg-rise 620ms 700ms ease both;
        }

        .cg-finale__eyebrow {
          color: var(--cg-accent-strong);
          font-size: 9px;
          letter-spacing: .2em;
          font-weight: 800;
        }

        .cg-finale h3 {
          margin: 7px auto 0;
          max-width: 560px;
          font-size: clamp(20px, 2.4vw, 30px);
          letter-spacing: -0.03em;
        }

        .cg-finale p {
          margin: 7px 0 0;
          color: var(--cg-muted);
          font-size: 10px;
        }

        .cg-stage-nav {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 7px;
          margin-top: 18px;
        }

        .cg-stage-nav button {
          min-width: 0;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: var(--cg-faint);
          padding: 9px 8px;
          cursor: pointer;
          text-align: left;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .cg-stage-nav button:hover {
          color: var(--cg-muted);
          border-color: var(--cg-border);
          transform: translateY(-1px);
        }

        .cg-stage-nav button.is-active {
          color: var(--cg-text);
          border-color: color-mix(in srgb, var(--cg-accent) 28%, transparent);
          background: color-mix(in srgb, var(--cg-accent) 7%, transparent);
        }

        .cg-stage-nav__number {
          display: block;
          font-size: 8px;
          color: var(--cg-accent-strong);
          font-variant-numeric: tabular-nums;
          margin-bottom: 3px;
        }

        .cg-stage-nav__label {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 650;
        }

        .cg-footer-note {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 18px;
          color: var(--cg-faint);
          font-size: 9px;
          text-align: center;
        }

        .cg-footer-note__line {
          height: 1px;
          background: var(--cg-border);
          flex: 1;
        }

        @keyframes cg-copy-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes cg-scene-in {
          from { opacity: 0; transform: scale(.988); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes cg-sheen {
          0%, 65% { transform: translateX(-70%); }
          100% { transform: translateX(70%); }
        }

        @keyframes cg-card-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes cg-context-in {
          from { opacity: 0; transform: translateY(10px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cg-context-pulse {
          0%, 100% { border-color: var(--cg-border); }
          50% { border-color: color-mix(in srgb, var(--cg-accent) 34%, transparent); }
        }

        @keyframes cg-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--cg-accent) 10%, transparent); }
          50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--cg-accent) 2%, transparent); }
        }

        @keyframes cg-slide-right {
          from { opacity: 0; transform: translateX(-14px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes cg-slide-left {
          from { opacity: 0; transform: translateX(14px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes cg-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cg-pop {
          from { opacity: 0; transform: scale(.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes cg-packet {
          from { left: 2px; opacity: 0; }
          20% { opacity: 1; }
          85% { opacity: 1; }
          to { left: calc(100% - 18px); opacity: 0; }
        }

        @keyframes cg-task-in {
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cg-analysis {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }

        @keyframes cg-path-packet {
          from { left: 0; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          to { left: calc(100% - 6px); opacity: 0; }
        }

        @keyframes cg-accept {
          0% { transform: scale(1); }
          35% { transform: scale(1.08); box-shadow: 0 0 18px color-mix(in srgb, var(--cg-good) 26%, transparent); }
          100% { transform: scale(1); }
        }

        @keyframes cg-node-in {
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes cg-record {
          0% { opacity: 0; transform: translateX(-8px); }
          30%, 70% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(8px); }
        }

        @media (max-width: 980px) {
          .cg-workspace {
            grid-template-columns: 1fr;
            min-height: 0;
          }

          .cg-stage-copy {
            padding-top: 0;
            max-width: 720px;
          }

          .cg-stage-nav {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .cg-shell {
            border-radius: 20px;
            padding: 18px;
          }

          .cg-header {
            display: block;
          }

          .cg-stage-counter {
            width: max-content;
            margin-top: 16px;
          }

          .cg-visual,
          .cg-scene {
            min-height: 520px;
          }

          .cg-context-chip {
            left: 4% !important;
            right: auto !important;
          }

          .cg-context-chip:nth-child(even) {
            left: auto !important;
            right: 4% !important;
          }

          .cg-understand-result {
            white-space: normal;
            width: 90%;
            justify-content: center;
            text-align: center;
          }

          .cg-control-merge {
            grid-template-columns: 32px minmax(0, 1fr) 32px;
          }

          .cg-risk-stack {
            width: 100%;
          }

          .cg-scene--evidence {
            grid-template-columns: 1fr 1fr;
            align-content: center;
          }

          .cg-analysis-core {
            grid-column: 1 / -1;
            grid-row: 2;
            padding: 10px 0;
          }

          .cg-data-path {
            display: none;
          }

          .cg-adaptive-grid {
            grid-template-columns: 1fr;
          }

          .cg-learning-engine {
            grid-template-columns: 1fr;
          }

          .cg-learning-engine__core {
            width: 150px;
            justify-self: center;
          }

          .cg-argos-pipeline {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .cg-argos-pipeline > .cg-flow-arrow {
            transform: rotate(90deg);
            width: 48px;
            justify-self: center;
            margin: -10px 0;
          }

          .cg-argos-core {
            min-height: 110px;
          }

          .cg-stage-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cg-footer-note {
            display: none;
          }
        }

        @media (max-width: 520px) {
          .cg-visual,
          .cg-scene {
            min-height: 560px;
          }

          .cg-risk-stack {
            grid-template-columns: 1fr;
          }

          .cg-learning-source {
            grid-template-columns: 1fr;
          }

          .cg-learning-source > .cg-flow-arrow {
            transform: rotate(90deg);
            width: 50px;
            justify-self: center;
            margin: -6px 0;
          }

          .cg-human-review {
            width: 100%;
            justify-content: space-between;
          }

          .cg-app-fan {
            grid-template-columns: 1fr;
          }

          .cg-input-row {
            gap: 5px;
          }

          .cg-scene--evidence {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .cg-analysis-core {
            grid-column: auto;
            grid-row: auto;
          }

          .cg-source-column {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .cg-source-heading {
            grid-column: 1 / -1;
          }

          .cg-mini-card__body {
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cg-explainer *,
          .cg-explainer *::before,
          .cg-explainer *::after {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 1ms !important;
            scroll-behavior: auto !important;
          }

          .cg-task-row,
          .cg-app-node {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
