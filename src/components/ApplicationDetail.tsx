"use client";

// One application's detail view ("View details" on an application
// tile): a header with the application-wide actions, then tiles --
// Application context first, then Work progress, Access requests, Rule
// logic and Evidence vs testing data. Each tile shows a short preview;
// clicking it opens the full content in a pop-out.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import UploadIndicators from "@/components/UploadIndicators";
import ReadinessView, { ReadinessBar, ReadinessLegend } from "@/components/hub/ReadinessView";
import DataCollectionPopout from "@/components/hub/DataCollectionPopout";
import PlatformDocsPanel from "@/components/hub/PlatformDocsPanel";
import { readinessCounts, readinessPercent } from "@/services/readiness";
import { ControlPopout, STATUS_TONE, isTopmostDialog } from "@/components/hub/controlViews";
import { useHubChat } from "@/components/hub/HubShell";
import { I, Icon, SegBar, T, clientCode, taskParts, taskStats } from "@/components/hub/hubUi";
import { splitApplicationName } from "@/services/applicationName";
import type { Application, ApplicationContextInput, ComplianceControl } from "@/services/commandEngine";
import { generateApplicationSummaryPdf } from "@/services/exportReport";
import { noteSourceLabel } from "@/services/notes";
import { controlUploadState } from "@/services/uploads";

const MARKDOWN: Components = {
  h2: ({ children }) => <h5 className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0f7d8c] first:mt-0">{children}</h5>,
  h3: ({ children }) => <h6 className="mb-1 mt-2 text-[13px] font-semibold text-[#1b2430]">{children}</h6>,
  p: ({ children }) => <p className="mb-2 leading-6 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#1b2430]">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-[#eef1f4] px-1 py-0.5 font-mono text-[11.5px]">{children}</code>,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#f7f9fb]">{children}</thead>,
  th: ({ children }) => <th className="border border-[#dfe4ea] px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-[#dfe4ea] px-2 py-1 align-top">{children}</td>,
};

type ApplicationDetailProps = {
  application: Application;
  isProcessing: boolean;
  onSaveContext: (context: ApplicationContextInput) => void;
  onRegenerateAllChecklists: () => void;
  onRefreshEvidenceDataGapAnalysis?: () => void;
  onPrepEmail: () => void;
  onShowQuestions: () => void;
  onOpenAttachments: () => void;
  // New UI only: upload straight from the detail view.
  onUploadEvidence?: () => void;
  onUploadData?: () => void;
};

type TileKey = "context" | "progress" | "access" | "rules" | "evidence";

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const CONTEXT_FIELDS: { key: keyof ApplicationContextInput; label: string }[] = [
  { key: "applicationPurpose", label: "Purpose" },
  { key: "businessProcess", label: "Business process" },
  { key: "applicationOwner", label: "Application owner" },
  { key: "technicalOwner", label: "Technical owner" },
  { key: "applicationContacts", label: "Contacts" },
  { key: "hostingDetails", label: "Hosting & architecture" },
  { key: "integrations", label: "Integrations" },
  { key: "identityTypes", label: "Identity types" },
  { key: "dataClassification", label: "Data classification" },
  { key: "financialRelevance", label: "Financial relevance" },
];

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim().length > 0);

// Access-category checklist items across the application: what to ask
// the application team for, and which control each one serves.
function accessRequests(controls: ComplianceControl[]) {
  return controls.flatMap((control) =>
    control.nextTasks
      .filter((task) => task.category === "Access" && !task.irrelevant)
      .map((task) => ({ control, task }))
  );
}

// ---------- shared pieces ----------
function Pill({ children, fg, bg }: { children: ReactNode; fg: string; bg: string }) {
  return <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-[1px] text-[10.5px] font-medium" style={{ color: fg, background: bg }}>{children}</span>;
}

function CodeTag({ control }: { control: ComplianceControl }) {
  const code = clientCode(control);
  return code === "—" ? null : (
    <span className="shrink-0 rounded-md px-1.5 py-[1px] font-mono text-[10.5px] font-semibold" style={{ background: T.tealSoft, color: T.teal }}>{code}</span>
  );
}

function Tile({ title, subtitle, onOpen, children, accent = T.teal, className = "" }: { title: string; subtitle: string; onOpen: () => void; children: ReactNode; accent?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex flex-col rounded-[10px] border border-l-[3px] bg-white p-4 text-left transition hover:shadow-[0_4px_16px_rgba(15,40,60,0.08)] ${className}`}
      style={{ borderColor: T.border, borderLeftColor: accent }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold" style={{ color: T.text }}>{title}</span>
        <span className="flex items-center gap-1 text-[11.5px] font-medium opacity-70 group-hover:opacity-100" style={{ color: T.teal }}>
          Open <Icon d={I.arrow} size={12} />
        </span>
      </span>
      <span className="mt-0.5 text-[11.5px]" style={{ color: T.muted }}>{subtitle}</span>
      <span className="mt-3 block min-w-0 flex-1">{children}</span>
    </button>
  );
}

// Full-detail pop-out for a tile. Esc closes it only when it is the
// top-most dialog (not while e.g. the regenerate warning is open on it).
function DetailPopout({ title, subtitle, actions, onClose, children }: { title: string; subtitle?: string; actions?: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!isTopmostDialog(ref.current)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[44] flex items-start justify-center overflow-y-auto bg-[rgba(15,30,45,0.45)] p-4 sm:p-8" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl rounded-xl border bg-white shadow-2xl" style={{ borderColor: T.border }}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: T.divider }}>
          <div className="min-w-0">
            <h4 className="text-[17px] font-semibold" style={{ color: T.text }}>{title}</h4>
            {subtitle ? <p className="mt-0.5 text-[12.5px]" style={{ color: T.muted }}>{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button type="button" onClick={onClose} aria-label="Close" title="Close (Esc)" className="rounded-md p-1.5 hover:bg-[#eef1f4]" style={{ color: T.muted }}>
              <Icon d={I.close} size={16} />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-5 py-4 text-[13px]" style={{ color: T.body }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

const headerButton = "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition";

// ---------- main ----------
export default function ApplicationDetail({
  application,
  isProcessing,
  onSaveContext,
  onRegenerateAllChecklists,
  onRefreshEvidenceDataGapAnalysis,
  onPrepEmail,
  onShowQuestions,
  onOpenAttachments,
  onUploadEvidence,
  onUploadData,
}: ApplicationDetailProps) {
  const { controls, contextStatus, hosting, evidenceDataGapSummary = "", evidenceDataGapSummaryStale = false } = application;
  const { appName, context } = splitApplicationName(application.name);
  const [openTile, setOpenTile] = useState<TileKey | null>(null);
  const [openControlId, setOpenControlId] = useState<string | null>(null);
  // Work progress: which control's readiness profile is expanded.
  const [readinessOpenId, setReadinessOpenId] = useState<string | null>(null);
  const [dataCollectionOpen, setDataCollectionOpen] = useState(false);

  const s = taskStats(controls);
  const done = controls.filter((c) => c.controlStatus === "Completed").length;
  const uploads = controls.map(controlUploadState);
  const withEvidence = uploads.filter((u) => u.evidence.uploaded).length;
  const withTesting = uploads.filter((u) => u.testing.uploaded).length;
  const requests = accessRequests(controls);
  const openRequests = requests.filter((r) => !r.task.completed);
  const rulesDefined = controls.filter((c) => c.argosObjective.trim()).length;
  const contextFilled = CONTEXT_FIELDS.filter((f) => filled(application[f.key as keyof Application])).length;
  const missingFields = CONTEXT_FIELDS.filter((f) => !filled(application[f.key as keyof Application])).map((f) => f.label);
  const ctxTone = contextStatus === "Complete" ? { fg: T.green, bg: T.greenSoft } : contextStatus === "Partial" ? { fg: T.orange, bg: T.orangeSoft } : { fg: T.red, bg: T.redSoft };

  const openControl = controls.find((c) => c.id === openControlId);
  const close = () => setOpenTile(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[10px] border bg-white p-4" style={{ borderColor: T.border }}>
        <div className="min-w-0 flex-1">
          <h3 className="text-[20px] font-semibold tracking-tight" style={{ color: T.text }}>
            {appName}
            {context ? <span className="ml-2 text-[15px] font-normal" style={{ color: T.muted }}>({context})</span> : null}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill fg={T.body} bg="#eef1f4">Hosting: {hosting}</Pill>
            <Pill fg={T.teal} bg={T.tealSoft}>{controls.length} control{controls.length === 1 ? "" : "s"}</Pill>
            <Pill fg={ctxTone.fg} bg={ctxTone.bg}>Context {contextStatus.toLowerCase()}</Pill>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={onPrepEmail} title="Draft an email-ready summary and open questions covering every control on this application" className={headerButton} style={{ borderColor: T.teal, color: T.teal, background: T.tealSoft }}>
            Prep email (all)
          </button>
          <button type="button" onClick={onShowQuestions} title="Show just the open questions across every control on this application" className={headerButton} style={{ borderColor: T.teal, color: T.teal, background: T.tealSoft }}>
            Open questions (all)
          </button>
          <button
            type="button"
            onClick={() => setDataCollectionOpen(true)}
            title="Connect to the application with a service account and pull the testing data directly"
            className={headerButton}
            style={{ borderColor: T.teal, color: "#fff", background: T.teal }}
          >
            Data collection
          </button>
          {onUploadEvidence ? (
            <button type="button" onClick={onUploadEvidence} disabled={isProcessing} title="Upload evidence documents for this application (Word, Excel, PowerPoint, PDF, CSV, JSON, text)" className={`${headerButton} disabled:cursor-not-allowed disabled:opacity-50`} style={{ borderColor: T.border, color: T.body, background: "#fff" }}>
              Upload evidence
            </button>
          ) : null}
          {onUploadData ? (
            <button type="button" onClick={onUploadData} disabled={isProcessing} title="Upload testing data files for this application" className={`${headerButton} disabled:cursor-not-allowed disabled:opacity-50`} style={{ borderColor: T.border, color: T.body, background: "#fff" }}>
              Upload testing data
            </button>
          ) : null}
          <button type="button" onClick={onOpenAttachments} title="See every evidence and testing data file attached to this application, and delete any that are no longer valid" className={headerButton} style={{ borderColor: T.border, color: T.body, background: "#fff" }}>
            Attachments
          </button>
          <button type="button" onClick={() => generateApplicationSummaryPdf(application)} title="Download a complete PDF summary of this application" className={headerButton} style={{ borderColor: T.border, color: T.body, background: "#fff" }}>
            Export summary
          </button>
        </div>
      </div>

      {/* Application context -- first, full width */}
      <Tile
        title="Application context"
        subtitle="What the application is, who owns it and how it runs -- used for every control's checklist."
        onOpen={() => setOpenTile("context")}
        accent={ctxTone.fg}
        className="w-full"
      >
        <span className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
          <span>
            <b style={{ color: T.text }}>{contextFilled}</b>
            <span style={{ color: T.muted }}> of {CONTEXT_FIELDS.length} fields captured</span>
          </span>
          <span className="min-w-0 truncate" style={{ color: T.body }}>
            <span style={{ color: T.muted }}>Owner: </span>
            {application.applicationOwner || <span style={{ color: T.faint }}>not captured</span>}
          </span>
          <span className="min-w-0 truncate" style={{ color: T.body }}>
            <span style={{ color: T.muted }}>Purpose: </span>
            {application.applicationPurpose || <span style={{ color: T.faint }}>not captured</span>}
          </span>
        </span>
        {missingFields.length ? (
          <span className="mt-2 block truncate text-[11.5px]" style={{ color: T.orange }}>Missing: {missingFields.join(", ")}</span>
        ) : null}
      </Tile>

      <PlatformDocsPanel application={application} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile title="Work progress" subtitle="Each control's readiness: evidence checked against the real data." onOpen={() => setOpenTile("progress")} accent={T.green}>
          <span className="flex items-center gap-2">
            <SegBar parts={taskParts(s)} height={5} />
            <span className="shrink-0 text-[11.5px]" style={{ color: T.muted }}>{s.done}/{s.total} tasks</span>
          </span>
          <span className="mt-2 block text-[12.5px]" style={{ color: T.body }}>
            <b style={{ color: T.text }}>{done}</b> of {controls.length} controls completed
          </span>
        </Tile>

        <Tile title="Access requests" subtitle="Access the application team needs to grant, per control." onOpen={() => setOpenTile("access")} accent={T.orange}>
          <span className="block text-[12.5px]" style={{ color: T.body }}>
            <b style={{ color: openRequests.length ? T.orange : T.text }}>{openRequests.length}</b> open · {requests.length - openRequests.length} granted
          </span>
          <span className="mt-1 block text-[11.5px]" style={{ color: T.muted }}>
            across {new Set(requests.map((r) => r.control.id)).size} of {controls.length} controls
          </span>
        </Tile>

        <Tile title="Rule logic" subtitle="How each control will be monitored automatically." onOpen={() => setOpenTile("rules")} accent={T.blue}>
          <span className="block text-[12.5px]" style={{ color: T.body }}>
            <b style={{ color: T.text }}>{rulesDefined}</b> of {controls.length} controls defined
          </span>
          <span className="mt-2 block h-[5px] overflow-hidden rounded-full" style={{ background: T.divider }}>
            <span className="block h-full rounded-full" style={{ width: `${controls.length ? (rulesDefined / controls.length) * 100 : 0}%`, background: T.blue }} />
          </span>
        </Tile>

        <Tile title="Evidence vs testing data" subtitle="Whether testing data backs up the evidence." onOpen={() => setOpenTile("evidence")} accent={T.teal}>
          <span className="block text-[12.5px]" style={{ color: T.body }}>
            Evidence <b style={{ color: T.text }}>{withEvidence}/{controls.length}</b> · Testing data <b style={{ color: T.text }}>{withTesting}/{controls.length}</b>
          </span>
          <span className="mt-1 block text-[11.5px]" style={{ color: evidenceDataGapSummaryStale ? T.orange : T.muted }}>
            {evidenceDataGapSummary ? (evidenceDataGapSummaryStale ? "Summary possibly outdated" : "Summary available") : "Not analyzed yet"}
          </span>
        </Tile>
      </div>

      {/* ---------- pop-outs ---------- */}
      {openTile === "context" ? (
        <ContextPopout application={application} isProcessing={isProcessing} onSave={onSaveContext} onRegenerateAll={onRegenerateAllChecklists} onClose={close} />
      ) : null}

      {openTile === "progress" ? (
        <DetailPopout
          title="Work progress"
          subtitle={`${done} of ${controls.length} controls completed · ${s.done}/${s.total} checklist tasks done · ${controls.filter((c) => c.readinessProfile).length} of ${controls.length} readiness profiles built`}
          onClose={close}
        >
          {controls.length > 0 ? (
            <div className="mb-3">
              <ReadinessLegend />
            </div>
          ) : null}
          {controls.length === 0 ? (
            <p style={{ color: T.faint }}>No controls have been added yet.</p>
          ) : (
            <div className="space-y-2.5">
              {controls.map((c) => {
                const cs = taskStats([c]);
                const tone = STATUS_TONE[c.controlStatus];
                return (
                  <div key={c.id} className="rounded-lg border p-3" style={{ borderColor: T.border }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <CodeTag control={c} />
                      <span className="min-w-0 flex-1 truncate font-semibold" style={{ color: T.text }}>{c.name}</span>
                      <Pill fg={tone.fg} bg={tone.bg}>{c.controlStatus}</Pill>
                      <UploadIndicators control={c} mini />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <SegBar parts={taskParts(cs)} height={4} />
                      <span className="shrink-0 text-[11px]" style={{ color: T.muted }}>{cs.done}/{cs.total} tasks · {c.stage}</span>
                    </div>
                    {c.readinessProfile ? (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="w-[74px] shrink-0 text-[11px] font-semibold" style={{ color: T.text }}>
                          Readiness {readinessPercent(c.readinessProfile)}%
                        </span>
                        <ReadinessBar profile={c.readinessProfile} height={5} />
                        <span className="shrink-0 text-[11px]" style={{ color: T.muted }}>
                          {readinessCounts(c.readinessProfile).verified}/{readinessCounts(c.readinessProfile).applicable} verified by data
                          {c.readinessStale ? <span style={{ color: T.orange }}> · new uploads</span> : null}
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-2 leading-6" style={{ color: c.readinessProfile?.summary || c.progressSummary ? T.body : T.faint }}>
                      {c.readinessProfile?.summary || c.progressSummary || "No work notes captured yet."}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setReadinessOpenId((id) => (id === c.id ? null : c.id))}
                        aria-expanded={readinessOpenId === c.id}
                        className="flex items-center gap-1 text-[12px] font-medium"
                        style={{ color: T.teal }}
                      >
                        {readinessOpenId === c.id ? "Hide readiness" : c.readinessProfile ? "Readiness details" : "Build readiness profile"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          setOpenControlId(c.id);
                        }}
                        className="flex items-center gap-1 text-[12px] font-medium"
                        style={{ color: T.teal }}
                      >
                        Open control <Icon d={I.arrow} size={12} />
                      </button>
                    </div>
                    {readinessOpenId === c.id ? (
                      <div className="mt-3 rounded-lg p-3" style={{ background: T.canvas }}>
                        <ReadinessView application={application} control={c} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DetailPopout>
      ) : null}

      {dataCollectionOpen ? <DataCollectionPopout application={application} onClose={() => setDataCollectionOpen(false)} /> : null}

      {openTile === "access" ? <AccessRequestsPopout controls={controls} onClose={close} /> : null}

      {openTile === "rules" ? (
        <DetailPopout title="Rule logic" subtitle={`How each control will be monitored · ${rulesDefined} of ${controls.length} defined`} onClose={close}>
          {controls.length === 0 ? (
            <p style={{ color: T.faint }}>No controls have been added yet.</p>
          ) : (
            <div className="space-y-2.5">
              {controls.map((c) => (
                <div key={c.id} className="rounded-lg border p-3" style={{ borderColor: T.border }}>
                  <div className="flex items-center gap-2">
                    <CodeTag control={c} />
                    <span className="min-w-0 flex-1 truncate font-semibold" style={{ color: T.text }}>{c.name}</span>
                    {c.argosObjective.trim() ? null : <Pill fg={T.muted} bg="#eef1f4">Not defined yet</Pill>}
                  </div>
                  {c.argosObjective.trim() ? (
                    <div className="mt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>{c.argosObjective}</ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DetailPopout>
      ) : null}

      {openTile === "evidence" ? (
        <DetailPopout
          title="Evidence vs testing data"
          subtitle="Whether uploaded testing data independently backs up the evidence, across every control."
          onClose={close}
          actions={
            onRefreshEvidenceDataGapAnalysis ? (
              <button type="button" onClick={onRefreshEvidenceDataGapAnalysis} className={headerButton} style={{ borderColor: T.teal, color: T.teal, background: T.tealSoft }}>
                Refresh
              </button>
            ) : null
          }
        >
          {evidenceDataGapSummaryStale && evidenceDataGapSummary ? (
            <p className="mb-3 rounded-md border px-3 py-2 text-[12px] font-medium" style={{ borderColor: "#f4c48f", background: T.orangeSoft, color: T.orange }}>
              A source document behind this summary was deleted -- it may no longer be accurate. Click Refresh to update it.
            </p>
          ) : null}
          {evidenceDataGapSummary ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>{evidenceDataGapSummary}</ReactMarkdown>
          ) : (
            <p style={{ color: T.muted }}>Not yet analyzed. This fills in once at least one control has both evidence and testing data attached, or click Refresh to check now.</p>
          )}
          <h5 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: T.muted }}>Per control</h5>
          <div className="divide-y rounded-lg border" style={{ borderColor: T.border }}>
            {controls.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2" style={{ borderColor: T.divider }}>
                <CodeTag control={c} />
                <span className="min-w-0 flex-1 truncate" style={{ color: T.text }}>{c.name}</span>
                <UploadIndicators control={c} compact />
              </div>
            ))}
          </div>
        </DetailPopout>
      ) : null}

      <ControlPopout entry={openControl ? { application, control: openControl } : undefined} onClose={() => setOpenControlId(null)} />
    </div>
  );
}

// ---------- Access requests ----------
function AccessRequestsPopout({ controls, onClose }: { controls: ComplianceControl[]; onClose: () => void }) {
  const [show, setShow] = useState<"open" | "all" | "granted">("open");
  const [copied, setCopied] = useState(false);
  const all = accessRequests(controls);
  const list = all.filter((r) => (show === "all" ? true : show === "open" ? !r.task.completed : r.task.completed));
  const openCount = all.filter((r) => !r.task.completed).length;

  function copyOpen() {
    const text = all
      .filter((r) => !r.task.completed)
      .map((r) => {
        const code = clientCode(r.control);
        return `- ${r.task.text} (for ${code !== "—" ? `${code} ` : ""}${r.control.name})`;
      })
      .join("\n");
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  const tab = (key: typeof show, label: string, n: number) => (
    <button
      type="button"
      onClick={() => setShow(key)}
      aria-pressed={show === key}
      className="rounded-full border px-2.5 py-[3px] text-[12px] font-medium"
      style={show === key ? { background: T.tealActive, borderColor: T.teal, color: T.teal } : { borderColor: T.border, color: T.body }}
    >
      {label} <span className="ml-1 text-[11px] opacity-70">{n}</span>
    </button>
  );

  return (
    <DetailPopout
      title="Access requests"
      subtitle="Every access or credential the controls need from the application team -- and which control each one is for. Aim: one shared, read-only credential that covers them all."
      onClose={onClose}
      actions={
        openCount ? (
          <button type="button" onClick={copyOpen} title="Copy the open requests as a list, ready for an email" className={headerButton} style={{ borderColor: T.teal, color: T.teal, background: T.tealSoft }}>
            {copied ? "Copied" : `Copy ${openCount} open`}
          </button>
        ) : null
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tab("open", "Open", openCount)}
        {tab("granted", "Granted", all.length - openCount)}
        {tab("all", "All", all.length)}
      </div>
      {all.length === 0 ? (
        <p style={{ color: T.faint }}>No access or credential requests have come up yet for this application&apos;s controls.</p>
      ) : list.length === 0 ? (
        <p style={{ color: T.faint }}>Nothing in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: T.border }}>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.05em]" style={{ background: "#f7f9fb", color: T.muted }}>
                <th className="px-3 py-2">Request</th>
                <th className="px-3 py-2">For control</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Latest note</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ control, task }) => {
                const note = task.notes[task.notes.length - 1];
                return (
                  <tr key={task.id} className="border-t align-top" style={{ borderColor: T.divider }}>
                    <td className="px-3 py-2.5" style={{ color: task.completed ? T.muted : T.text }}>
                      {task.text}
                      {task.required ? null : <span className="ml-1.5 text-[10.5px]" style={{ color: T.faint }}>(optional)</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <CodeTag control={control} />
                        <span style={{ color: T.body }}>{control.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {task.completed ? <Pill fg={T.green} bg={T.greenSoft}>Granted</Pill> : <Pill fg={T.orange} bg={T.orangeSoft}>Open</Pill>}
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5 text-[12px]" style={{ color: T.muted }}>
                      {note ? (
                        <>
                          <span className="line-clamp-3" style={{ color: T.body }}>{note.text}</span>
                          {noteSourceLabel(note) ? <span className="mt-0.5 block text-[11px]">{noteSourceLabel(note)}</span> : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DetailPopout>
  );
}

// ---------- Application context ----------
// The form is created fresh each time the pop-out opens, from the
// application as it is now -- so it never shows stale values.
function ContextPopout({
  application,
  isProcessing,
  onSave,
  onRegenerateAll,
  onClose,
}: {
  application: Application;
  isProcessing: boolean;
  onSave: (context: ApplicationContextInput) => void;
  onRegenerateAll: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => ({
    applicationPurpose: application.applicationPurpose,
    businessProcess: application.businessProcess,
    applicationOwner: application.applicationOwner,
    technicalOwner: application.technicalOwner,
    applicationContacts: application.applicationContacts.join("\n"),
    hostingDetails: application.hostingDetails,
    integrations: application.integrations.join("\n"),
    identityTypes: application.identityTypes.join("\n"),
    dataClassification: application.dataClassification,
    financialRelevance: application.financialRelevance,
  }));
  const [saved, setSaved] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  function save() {
    onSave({
      ...form,
      applicationContacts: splitList(form.applicationContacts),
      integrations: splitList(form.integrations),
      identityTypes: splitList(form.identityTypes),
    });
    setSaved(true);
  }

  return (
    <DetailPopout
      title="Application context"
      subtitle="Combined with the assignment objective and each control's objective whenever a checklist is generated."
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            onClick={() => setConfirmRegenerate(true)}
            disabled={application.controls.length === 0 || isProcessing}
            className={`${headerButton} disabled:cursor-not-allowed disabled:opacity-40`}
            style={{ borderColor: T.orange, color: T.orange, background: "#fff" }}
          >
            Regenerate all checklists
          </button>
          <button type="button" onClick={save} className={headerButton} style={{ borderColor: T.teal, color: "#fff", background: T.teal }}>
            {saved ? "Saved" : "Save context"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Application purpose" value={form.applicationPurpose} onChange={set("applicationPurpose")} placeholder="What the application does and why the business uses it." multiline />
        <Field label="Business process" value={form.businessProcess} onChange={set("businessProcess")} placeholder="e.g. vendor onboarding, payment processing, journal entries, financial reporting." multiline />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Application owner" value={form.applicationOwner} onChange={set("applicationOwner")} placeholder="Business or control owner" />
          <Field label="Technical owner" value={form.technicalOwner} onChange={set("technicalOwner")} placeholder="Technical or support owner" />
        </div>
        <Field label="Application contacts" value={form.applicationContacts} onChange={set("applicationContacts")} placeholder="One name, team, or email per line." multiline />
        <Field label="Hosting and architecture details" value={form.hostingDetails} onChange={set("hostingDetails")} placeholder="Servers, cloud platforms, databases, operating systems, tenants, and environments." multiline />
        <Field label="Integrations" value={form.integrations} onChange={set("integrations")} placeholder="APIs, file transfers, banks, identity providers, upstream and downstream systems." multiline />
        <Field label="Known identity types" value={form.identityTypes} onChange={set("identityTypes")} placeholder="Users, groups, administrators, shared accounts, service accounts, API keys, certificates, tokens, vendors." multiline />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Data classification" value={form.dataClassification} onChange={set("dataClassification")} placeholder="e.g. financial, confidential, restricted" />
          <Field label="Financial relevance" value={form.financialRelevance} onChange={set("financialRelevance")} placeholder="How the application may affect financial reporting." multiline />
        </div>
        <p className="rounded-lg border px-3 py-2 text-[12.5px] leading-6" style={{ borderColor: "#cfe6ea", background: "#f1f8f9", color: T.body }}>
          Saving context doesn&apos;t change existing checklists. To apply it, regenerate a single control&apos;s checklist from that control, or use <b>Regenerate all checklists</b> above.
        </p>
      </div>

      {confirmRegenerate ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,30,45,0.45)] p-4" onClick={() => setConfirmRegenerate(false)}>
          <div role="dialog" aria-modal="true" aria-label="Regenerate every checklist" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border bg-white p-5 shadow-2xl" style={{ borderColor: T.border }}>
            <h4 className="text-[16px] font-semibold" style={{ color: T.orange }}>Regenerate checklists for every control?</h4>
            <p className="mt-2 text-[13px] leading-6" style={{ color: T.body }}>Your existing notes are not deleted, but every control&apos;s checklist resets to &ldquo;Review Pending&rdquo; -- even controls this context change didn&apos;t affect -- and an old item whose wording no longer matches stays alongside the new one.</p>
            <p className="mt-2 text-[13px] leading-6" style={{ color: T.body }}>If the change only affects one control, regenerate that control&apos;s checklist on its own instead.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmRegenerate(false)} className={headerButton} style={{ borderColor: T.border, color: T.body, background: "#fff" }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmRegenerate(false);
                  onRegenerateAll();
                }}
                className={headerButton}
                style={{ borderColor: T.orange, color: "#fff", background: T.orange }}
              >
                Regenerate all checklists
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DetailPopout>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) {
  const cls = "w-full rounded-lg border bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#0f7d8c]";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: T.text }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} resize-y leading-6`} style={{ borderColor: T.border, color: T.text }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} style={{ borderColor: T.border, color: T.text }} />
      )}
    </label>
  );
}

// "View details" in the New UI: the whole application detail as a large
// pop-out over the application tiles. Tile pop-outs and the control
// pop-out stack above it; Esc closes the top-most one first. Prep email
// / open questions / gap analysis / regenerate / uploads run in the
// assistant result pop-up on top of this one (not the chat drawer).
export function ApplicationDetailPopout({ onClose, ...props }: ApplicationDetailProps & { onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { runTask } = useHubChat();
  const applicationId = props.application.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!isTopmostDialog(ref.current)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);


  return createPortal(
    <div className="fixed inset-0 z-[42] flex items-start justify-center overflow-y-auto bg-[rgba(15,30,45,0.45)] p-3 sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`${props.application.name} details`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl rounded-2xl p-4 shadow-2xl sm:p-5"
        style={{ background: T.canvas }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-md hover:bg-[#eef1f4]"
          style={{ borderColor: T.border, color: T.body }}
        >
          <Icon d={I.close} size={16} />
        </button>
        <ApplicationDetail
          {...props}
          {...(runTask
            ? {
                onPrepEmail: () => runTask({ kind: "prepEmail", applicationId }),
                onShowQuestions: () => runTask({ kind: "openQuestions", applicationId }),
                onRefreshEvidenceDataGapAnalysis: () => runTask({ kind: "gapAnalysis", applicationId }),
                onRegenerateAllChecklists: () => runTask({ kind: "regenerateAll", applicationId }),
                onUploadEvidence: () => runTask({ kind: "uploadEvidence", applicationId }),
                onUploadData: () => runTask({ kind: "uploadData", applicationId }),
              }
            : {})}
        />
      </div>
    </div>,
    document.body
  );
}
