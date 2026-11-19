"use client";

// One control's readiness profile (services/readiness.ts), laid out for
// everyone: where it stands, how the team does it today, then per
// population / configuration layer / access what the evidence says vs.
// what the real data shows, whether the data is sufficient, and what to
// request next. Build / rebuild and copy-as-text live in the header.

import { useState } from "react";

import { useAppState } from "@/components/AppStateProvider";
import type { Application, ComplianceControl } from "@/services/commandEngine";
import {
  READINESS_STATUSES,
  STATUS_LABEL,
  blueprintFor,
  readinessCounts,
  readinessMarkdown,
  readinessPercent,
  type ReadinessItem,
  type ReadinessProfile,
  type ReadinessStatus,
} from "@/services/readiness";
import { I, Icon, T } from "./hubUi";

// "<Headline> — <point>; <point>" entries (sufficiency missing /
// conflicts): the short headline in bold with its points as
// sub-bullets, so the list scans. Entries written before this format
// (no separator, or a long first part) show as plain text.
function HeadlineText({ text }: { text: string }) {
  const m = text.match(/^(.{2,60}?)\s+(?:—|--|–)\s+([\s\S]+)$/);
  if (!m || m[1].trim().split(/\s+/).length > 8) return <>{text}</>;
  const points = m[2]
    .split(/;\s*/)
    .map((p) => p.trim().replace(/\.$/, ""))
    .filter(Boolean);
  return (
    <>
      <b style={{ color: T.text }}>{m[1].trim()}</b>
      <ul className="mt-0.5 list-[circle] space-y-0 pl-4 text-[12px]" style={{ color: T.muted }}>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </>
  );
}

export const STATUS_COLOR: Record<ReadinessStatus, { fg: string; bg: string }> = {
  verified: { fg: T.green, bg: T.greenSoft },
  conflict: { fg: T.red, bg: T.redSoft },
  evidence_only: { fg: T.orange, bg: T.orangeSoft },
  data_only: { fg: T.blue, bg: "#e8f1fa" },
  missing: { fg: "#5b6573", bg: "#eceff3" },
  not_applicable: { fg: T.faint, bg: "#f4f6f8" },
};

const VERDICT: Record<ReadinessProfile["sufficiency"]["verdict"], { label: string; fg: string; bg: string }> = {
  sufficient: { label: "Data sufficient", fg: T.green, bg: T.greenSoft },
  partial: { label: "Data partially sufficient", fg: T.orange, bg: T.orangeSoft },
  insufficient: { label: "Data not yet sufficient", fg: T.red, bg: T.redSoft },
};

const PRIORITY: Record<string, { fg: string; bg: string }> = {
  high: { fg: T.red, bg: T.redSoft },
  medium: { fg: T.orange, bg: T.orangeSoft },
  low: { fg: "#5b6573", bg: "#eceff3" },
};

function Chip({ fg, bg, children }: { fg: string; bg: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-[1px] text-[10.5px] font-semibold" style={{ color: fg, background: bg }}>
      {children}
    </span>
  );
}

// Segmented bar of item statuses.
export function ReadinessBar({ profile, height = 6 }: { profile: ReadinessProfile; height?: number }) {
  const c = readinessCounts(profile);
  const total = READINESS_STATUSES.reduce((n, s) => n + c[s], 0);
  return (
    <span className="flex w-full overflow-hidden rounded-full" style={{ height, background: T.divider }}>
      {total > 0
        ? READINESS_STATUSES.filter((s) => s !== "not_applicable" && c[s] > 0).map((s) => (
            <span key={s} title={`${STATUS_LABEL[s]}: ${c[s]}`} style={{ width: `${(c[s] / total) * 100}%`, background: STATUS_COLOR[s].fg }} />
          ))
        : null}
    </span>
  );
}

export function ReadinessLegend() {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: T.muted }}>
      {READINESS_STATUSES.filter((s) => s !== "not_applicable").map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s].fg }} /> {STATUS_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

// Filenames as text; official documentation URLs as links.
function SourcesDetail({ sources }: { sources: string[] }) {
  if (!sources.length) return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 text-[12px] leading-5">
      <span style={{ color: T.muted }}>Sources</span>
      <span className="min-w-0 break-words" style={{ color: T.text }}>
        {sources.map((src, i) => (
          <span key={src}>
            {i > 0 ? ", " : null}
            {/^https?:\/\//i.test(src) ? (
              <a href={src} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: T.teal }}>
                {docLabel(src)}
              </a>
            ) : (
              src
            )}
          </span>
        ))}
      </span>
    </div>
  );
}

function docLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.length > 1 ? u.pathname : ""}`.slice(0, 80);
  } catch {
    return url;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 text-[12px] leading-5">
      <span style={{ color: T.muted }}>{label}</span>
      <span className="min-w-0 whitespace-pre-wrap break-words" style={{ color: T.text }}>{value}</span>
    </div>
  );
}

// Compact by default: one line (status, name, what the data shows) and
// the gap when there is one; click to see evidence vs. data side by
// side and the retrieval / monitoring logic.
function ItemRow({ item }: { item: ReadinessItem }) {
  const [open, setOpen] = useState(false);
  const tone = STATUS_COLOR[item.status];
  const showGap = item.gap && item.status !== "verified" && item.status !== "not_applicable";
  return (
    <div className="border-t first:border-t-0" style={{ borderColor: T.divider }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#f7f9fb]"
      >
        <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: tone.fg }} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[13px] font-semibold" style={{ color: T.text }}>{item.name}</span>
            <Chip fg={tone.fg} bg={tone.bg}>{STATUS_LABEL[item.status]}</Chip>
            {item.accessNeeded ? <Chip fg={T.orange} bg={T.orangeSoft}>Access needed</Chip> : null}
          </span>
          {item.dataShows ? (
            <span className={`mt-0.5 block text-[12px] leading-5 ${open ? "" : "line-clamp-2"}`} style={{ color: T.body }}>
              {item.dataShows}
            </span>
          ) : null}
          {showGap ? (
            <span className={`mt-0.5 block text-[12px] leading-5 ${open ? "" : "line-clamp-2"}`} style={{ color: item.status === "conflict" ? T.red : "#7a4a1a" }}>
              <b>Gap:</b> {item.gap}
            </span>
          ) : null}
        </span>
        <span className="mt-1 shrink-0 text-[11px]" style={{ color: T.faint }}>{open ? "Less" : "More"}</span>
      </button>
      {open ? (
        <div className="space-y-1 px-7 pb-3">
          <div className="space-y-1 rounded-md p-2.5" style={{ background: "#f7f9fb" }}>
            <Detail label="Evidence says" value={item.evidenceSays || "Not covered in the evidence"} />
            <Detail label="Data shows" value={item.dataShows || "Not in the data yet"} />
            <Detail label="Retrieve with" value={item.retrieval} />
            <Detail label="Monitoring check" value={item.validationRule} />
            <Detail label="Access needed" value={item.accessNeeded} />
            <SourcesDetail sources={item.sources} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white" style={{ borderColor: T.border }}>
      <header className="border-b px-3 py-2" style={{ borderColor: T.divider, background: "#fafbfc" }}>
        <h4 className="text-[13px] font-semibold" style={{ color: T.text }}>{title}</h4>
        {subtitle ? <p className="text-[11.5px]" style={{ color: T.muted }}>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export default function ReadinessView({ application, control }: { application: Application; control: ComplianceControl }) {
  const { buildReadinessProfile } = useAppState();
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const profile = control.readinessProfile ?? null;
  const blueprint = blueprintFor(control.clientContext);

  async function build() {
    setBuilding(true);
    setError("");
    const result = await buildReadinessProfile(application.id, control.id);
    setBuilding(false);
    if (!result.ok) setError(result.error);
  }

  async function copy() {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(readinessMarkdown(profile, application.name, control.name));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  }

  const buildButton = (
    <button
      type="button"
      onClick={build}
      disabled={building}
      className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
      style={{ background: T.teal }}
      title="Reads this control's evidence and the full testing data files, then rebuilds the profile (keeps what was already learned)"
    >
      {building ? "Working on it…" : profile ? "Rebuild with latest data" : "Build readiness profile"}
    </button>
  );

  const status = building ? (
    <p className="flex items-center gap-2 text-[12.5px]" style={{ color: T.muted }}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: T.orange }} />
      Reading the evidence and profiling the full testing data files — large exports can take a minute the first time.
    </p>
  ) : error ? (
    <p className="text-[12.5px]" style={{ color: T.red }}>{error}</p>
  ) : null;

  if (!profile) {
    return (
      <div className="rounded-lg border border-dashed p-4" style={{ borderColor: T.border, background: "#fff" }}>
        <p className="text-[13px] font-semibold" style={{ color: T.text }}>Readiness profile · {blueprint.label}</p>
        <p className="mt-1 text-[12.5px] leading-5" style={{ color: T.muted }}>
          Builds a clear picture of this control from the evidence (how the team does it today) checked against the real testing data (facts):{" "}
          {blueprint.population.title.toLowerCase()}, {blueprint.configuration.title.toLowerCase()}, {blueprint.access.title.toLowerCase()}, whether the data is sufficient, and what to request next.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {buildButton}
          {status}
        </div>
      </div>
    );
  }

  const c = readinessCounts(profile);
  const verdict = VERDICT[profile.sufficiency.verdict];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-lg border bg-white p-3.5" style={{ borderColor: T.border }}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: T.text }}>Readiness · {profile.controlType}</span>
              <Chip fg={verdict.fg} bg={verdict.bg}>{verdict.label}</Chip>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[22px] font-semibold leading-none" style={{ color: T.text }}>{readinessPercent(profile)}%</span>
              <div className="min-w-[160px] flex-1">
                <ReadinessBar profile={profile} />
                <span className="mt-1 block text-[11.5px]" style={{ color: T.muted }}>
                  {c.verified} of {c.applicable} items verified by real data · {c.conflict} conflict{c.conflict === 1 ? "" : "s"} · updated {new Date(profile.generatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: T.border, color: T.body, background: "#fff" }} title="Copy as text for email, tickets or docs">
              {copied ? "Copied" : "Copy as text"}
            </button>
            {buildButton}
          </div>
        </div>
        {control.readinessStale && !building ? (
          <p className="mt-2.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]" style={{ background: T.orangeSoft, color: "#7a4a1a" }}>
            <Icon d={I.warn} size={13} color={T.orange} /> New evidence or testing data was uploaded since this was built — rebuild to include it.
          </p>
        ) : null}
        {status ? <div className="mt-2.5">{status}</div> : null}
        {profile.summary ? <p className="mt-3 text-[13px] leading-6" style={{ color: T.body }}>{profile.summary}</p> : null}
        {profile.keyFindings?.length ? (
          <div className="mt-3 rounded-lg border-l-[3px] p-3" style={{ borderColor: T.teal, background: T.tealSoft }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: T.teal }}>Key findings</p>
            <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-5" style={{ color: T.text }}>
              {profile.keyFindings.map((k) => <li key={k}>{k}</li>)}
            </ol>
          </div>
        ) : null}
        <div className="mt-2.5"><ReadinessLegend /></div>
      </div>

      {profile.changesSinceLast.length ? (
        <Block title="What changed with the latest data">
          <ul className="list-disc space-y-1 px-8 py-2.5 text-[12.5px] leading-5" style={{ color: T.body }}>
            {profile.changesSinceLast.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Block>
      ) : null}

      <Block title="How the team does it today" subtitle="From the evidence — context for understanding the control, not proof">
        <p className="whitespace-pre-wrap px-3 py-2.5 text-[12.5px] leading-6" style={{ color: profile.howDoneToday ? T.body : T.faint }}>
          {profile.howDoneToday || "Not described in the evidence yet."}
        </p>
      </Block>

      {profile.sections.map((section, i) => (
        <Block key={section.key} title={`${i + 1}. ${section.title}`} subtitle={blueprint[section.key].cover}>
          {section.items.length ? section.items.map((item) => <ItemRow key={item.name} item={item} />) : (
            <p className="px-3 py-2.5 text-[12.5px]" style={{ color: T.faint }}>Nothing captured yet.</p>
          )}
        </Block>
      ))}

      <Block title={`${profile.sections.length + 1}. Is the data sufficient?`} subtitle="Built from the real data — what's proven, what isn't, and what's missing">
        <div className="space-y-2.5 px-3 py-2.5 text-[12.5px] leading-5">
          <div className="flex items-center gap-2">
            <Chip fg={verdict.fg} bg={verdict.bg}>{verdict.label}</Chip>
          </div>
          {profile.sufficiency.explanation ? <p style={{ color: T.body }}>{profile.sufficiency.explanation}</p> : null}
          {profile.sufficiency.conflicts.length ? (
            <div>
              <p className="font-semibold" style={{ color: T.red }}>Conflicts between evidence and data</p>
              <ul className="mt-1 list-disc space-y-1 pl-5" style={{ color: T.body }}>{profile.sufficiency.conflicts.map((x) => <li key={x}><HeadlineText text={x} /></li>)}</ul>
            </div>
          ) : null}
          {profile.sufficiency.missing.length ? (
            <div>
              <p className="font-semibold" style={{ color: T.text }}>Missing</p>
              <ul className="mt-1 list-disc space-y-1 pl-5" style={{ color: T.body }}>{profile.sufficiency.missing.map((x) => <li key={x}><HeadlineText text={x} /></li>)}</ul>
            </div>
          ) : null}
        </div>
      </Block>

      {profile.nextDataRequests.length ? (
        <Block title="Next data & access to request" subtitle="Highest value first — pull these with the monitoring service account and upload them as testing data">
          <ol className="divide-y" style={{ borderColor: T.divider }}>
            {profile.nextDataRequests.map((q, i) => (
              <li key={q.request} className="flex gap-3 px-3 py-2.5 text-[12.5px] leading-5">
                <span className="w-4 shrink-0 text-right" style={{ color: T.faint }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold" style={{ color: T.text }}>{q.request}</span>
                    <Chip fg={PRIORITY[q.priority].fg} bg={PRIORITY[q.priority].bg}>{q.priority}</Chip>
                  </div>
                  {q.reason ? <p style={{ color: T.body }}>{q.reason}</p> : null}
                  {q.accessNeeded ? <p style={{ color: "#7a4a1a" }}><b>Access:</b> {q.accessNeeded}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Block>
      ) : null}

      <details className="rounded-lg border bg-white px-3 py-2 text-[12px]" style={{ borderColor: T.border, color: T.muted }}>
        <summary className="cursor-pointer font-medium" style={{ color: T.body }}>
          Built from {profile.sourcesUsed.evidence.length} evidence document{profile.sourcesUsed.evidence.length === 1 ? "" : "s"} and {profile.sourcesUsed.data.length} testing data file{profile.sourcesUsed.data.length === 1 ? "" : "s"}
        </summary>
        <p className="mt-2"><b>Evidence:</b> {profile.sourcesUsed.evidence.join(", ") || "none"}</p>
        <p className="mt-1"><b>Testing data:</b> {profile.sourcesUsed.data.join(", ") || "none"}</p>
        {profile.sourcesUsed.documentation?.length ? (
          <div className="mt-1">
            <b>Official documentation{profile.sourcesUsed.documentationProduct ? ` (${profile.sourcesUsed.documentationProduct})` : ""}:</b>
            <ul className="ml-4 list-disc">
              {profile.sourcesUsed.documentation.map((d) => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: T.teal }}>
                    {d.title || docLabel(d.url)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-1">Counts and exceptions come from the full testing data files (computed by the app, not estimated). Re-uploads of the same file are counted once — the newest.</p>
      </details>
    </div>
  );
}
