"use client";

import { useEffect, useState } from "react";
import ReactMarkdown, {
  type Components,
} from "react-markdown";
import remarkGfm from "remark-gfm";

import CollapsibleSection from "@/components/CollapsibleSection";
import ContextStatusBadge from "@/components/ContextStatusBadge";
import { noteSourceLabel } from "@/services/notes";
import { splitApplicationName } from "@/services/applicationName";
import { generateApplicationSummaryPdf } from "@/services/exportReport";
import type {
  Application,
  ApplicationContextInput,
  ComplianceControl,
  QaScoreLevel,
} from "@/services/commandEngine";

const ARGOS_MARKDOWN_COMPONENTS: Components = {
  h2: ({ children }) => (
    <h5 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-300 first:mt-0">
      {children}
    </h5>
  ),
  h3: ({ children }) => (
    <h6 className="mb-1 mt-2 text-sm font-semibold text-slate-200">
      {children}
    </h6>
  ),
  p: ({ children }) => (
    <p className="mb-2 leading-6 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-6">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-100">
      {children}
    </strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-950/70 px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-800">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="border border-slate-700 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-700 px-2 py-1 align-top">
      {children}
    </td>
  ),
};

type ApplicationDetailProps = {
  application: Application;
  isProcessing: boolean;
  onSaveContext: (
    context: ApplicationContextInput
  ) => void;
  onRegenerateAllChecklists: () => void;
  onAddNote: (note: string) => void;
  onRefreshEvidenceDataGapAnalysis?: () => void;
  onPrepEmail: () => void;
  onShowQuestions: () => void;
  onOpenAttachments: () => void;
};

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ApplicationDetail({
  application,
  isProcessing,
  onSaveContext,
  onRegenerateAllChecklists,
  onAddNote,
  onRefreshEvidenceDataGapAnalysis,
  onPrepEmail,
  onShowQuestions,
  onOpenAttachments,
}: ApplicationDetailProps) {
  const {
    hosting,
    contextStatus,
    applicationPurpose,
    businessProcess,
    applicationOwner,
    technicalOwner,
    applicationContacts,
    integrations,
    identityTypes,
    hostingDetails,
    dataClassification,
    financialRelevance,
    controls,
    evidenceDataGapSummary = "",
    evidenceDataGapSummaryStale = false,
    notes,
  } = application;

  const { appName, context } =
    splitApplicationName(application.name);

  const [draftNote, setDraftNote] = useState("");

  const [
    showRegenerateWarning,
    setShowRegenerateWarning,
  ] = useState(false);

  function handleSubmitNote() {
    const trimmedNote = draftNote.trim();

    if (!trimmedNote) {
      return;
    }

    onAddNote(trimmedNote);
    setDraftNote("");
  }

  const [purpose, setPurpose] = useState(
    applicationPurpose
  );

  const [process, setProcess] = useState(
    businessProcess
  );

  const [owner, setOwner] = useState(
    applicationOwner
  );

  const [technical, setTechnical] = useState(
    technicalOwner
  );

  const [contacts, setContacts] = useState(
    applicationContacts.join("\n")
  );

  const [integrationText, setIntegrationText] =
    useState(integrations.join("\n"));

  const [identityText, setIdentityText] =
    useState(identityTypes.join("\n"));

  const [hostingContext, setHostingContext] =
    useState(hostingDetails);

  const [classification, setClassification] =
    useState(dataClassification);

  const [financialContext, setFinancialContext] =
    useState(financialRelevance);

  useEffect(() => {
    setPurpose(applicationPurpose);
    setProcess(businessProcess);
    setOwner(applicationOwner);
    setTechnical(technicalOwner);
    setContacts(applicationContacts.join("\n"));
    setIntegrationText(integrations.join("\n"));
    setIdentityText(identityTypes.join("\n"));
    setHostingContext(hostingDetails);
    setClassification(dataClassification);
    setFinancialContext(financialRelevance);
  }, [
    applicationPurpose,
    businessProcess,
    applicationOwner,
    technicalOwner,
    applicationContacts,
    integrations,
    identityTypes,
    hostingDetails,
    dataClassification,
    financialRelevance,
  ]);

  function handleSaveContext() {
    onSaveContext({
      applicationPurpose: purpose,
      businessProcess: process,
      applicationOwner: owner,
      technicalOwner: technical,
      applicationContacts:
        splitList(contacts),
      integrations:
        splitList(integrationText),
      identityTypes:
        splitList(identityText),
      hostingDetails: hostingContext,
      dataClassification: classification,
      financialRelevance:
        financialContext,
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex w-full flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold text-white">
            {appName}
            {context ? (
              <span className="ml-2 text-base font-normal text-slate-400">
                ({context})
              </span>
            ) : null}
          </h3>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              Hosting: {hosting}
            </span>

            <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-medium text-blue-300">
              {controls.length} control
              {controls.length === 1 ? "" : "s"}
            </span>

            <ContextStatusBadge
              status={contextStatus}
            />
          </div>

          {contextStatus !== "Complete" ? (
            <p className="mt-3 text-sm text-amber-300">
              Application context is{" "}
              {contextStatus.toLowerCase()}.
              Current control checklists may be
              preliminary.
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-300">
              Application context is available for
              contextual control analysis.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPrepEmail}
            title="Draft an email-ready summary and open questions covering every control on this application"
            className="rounded-lg border border-blue-700 bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-900"
          >
            Prep Email (All)
          </button>

          <button
            type="button"
            onClick={onShowQuestions}
            title="Show just the open questions across every control on this application"
            className="rounded-lg border border-blue-700 bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-900"
          >
            Show Questions (All)
          </button>

          <button
            type="button"
            onClick={onOpenAttachments}
            title="See every evidence and data file attached to this application, and delete any that are no longer valid"
            className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Attachments
          </button>

          <button
            type="button"
            onClick={() =>
              generateApplicationSummaryPdf(application)
            }
            title="Download a complete PDF summary of this application — context, evidence-vs-data, work progress, Argos logic, notes, and every control's full detail"
            className="rounded-lg border border-emerald-700 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900"
          >
            Export Summary
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-700 p-4">
        <CollapsibleSection
          title="Work Progress Summary"
          description="Your read on each control, built from the notes you add against its checklist items — refreshed automatically every time you add one."
          theme="dark"
          tint="accent"
        >
          <WorkProgressSummaryPanel
            controls={controls}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Argos Rule Logic"
          description="Every control's monitoring objective for this application, in one place."
          theme="dark"
          tint="accent"
        >
          <ArgosRuleLogicPanel
            controls={controls}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Evidence vs. Data Summary"
          description="A high-level read across every control -- see each control's own section for the detail behind it."
          theme="dark"
          tint="accent"
          badge={
            evidenceDataGapSummaryStale &&
            evidenceDataGapSummary ? (
              <span className="rounded-full bg-amber-950 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                Possibly outdated
              </span>
            ) : undefined
          }
          headerActions={
            onRefreshEvidenceDataGapAnalysis ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRefreshEvidenceDataGapAnalysis();
                }}
                className="rounded-md border border-indigo-700 bg-indigo-950/60 px-2 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-900"
              >
                Refresh
              </button>
            ) : undefined
          }
        >
          {evidenceDataGapSummaryStale &&
          evidenceDataGapSummary ? (
            <p className="mb-3 rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs font-medium text-amber-300">
              A source document behind this
              summary was deleted -- it may no
              longer be accurate. Click Refresh
              to update it.
            </p>
          ) : null}

          {evidenceDataGapSummary ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={
                ARGOS_MARKDOWN_COMPONENTS
              }
            >
              {evidenceDataGapSummary}
            </ReactMarkdown>
          ) : (
            <p className="text-sm leading-6 text-slate-300">
              Not yet analyzed. This fills in
              once at least one control has
              both evidence and real data
              attached, or click Refresh to
              check now.
            </p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Application Context"
          description="This context is combined with the assignment objective and each SOX control objective."
          theme="dark"
          badge={
            <ContextStatusBadge
              status={contextStatus}
            />
          }
        >
          <div className="space-y-4">
              <ContextField
                label="Application purpose"
                value={purpose}
                onChange={setPurpose}
                placeholder="Explain what the application does and why the business uses it."
                multiline
              />

              <ContextField
                label="Business process"
                value={process}
                onChange={setProcess}
                placeholder="Examples: vendor onboarding, payment processing, journal entries, financial reporting."
                multiline
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ContextField
                  label="Application owner"
                  value={owner}
                  onChange={setOwner}
                  placeholder="Business or control owner"
                />

                <ContextField
                  label="Technical owner"
                  value={technical}
                  onChange={setTechnical}
                  placeholder="Technical or support owner"
                />
              </div>

              <ContextField
                label="Application contacts"
                value={contacts}
                onChange={setContacts}
                placeholder="Enter one name, team, or email per line."
                multiline
              />

              <ContextField
                label="Hosting and architecture details"
                value={hostingContext}
                onChange={setHostingContext}
                placeholder="Describe servers, cloud platforms, databases, operating systems, tenants, and environments."
                multiline
              />

              <ContextField
                label="Integrations"
                value={integrationText}
                onChange={setIntegrationText}
                placeholder="Enter APIs, file transfers, banks, identity providers, upstream systems, and downstream systems."
                multiline
              />

              <ContextField
                label="Known identity types"
                value={identityText}
                onChange={setIdentityText}
                placeholder="Users, groups, administrators, shared accounts, service accounts, service principals, API keys, certificates, tokens, vendors."
                multiline
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ContextField
                  label="Data classification"
                  value={classification}
                  onChange={setClassification}
                  placeholder="Examples: financial, confidential, restricted"
                />

                <ContextField
                  label="Financial relevance"
                  value={financialContext}
                  onChange={setFinancialContext}
                  placeholder="Explain how the application may affect financial reporting."
                  multiline
                />
              </div>

              <div className="rounded-lg border border-blue-900 bg-blue-950/40 p-3 text-sm leading-6 text-blue-200">
                Saving context does not automatically
                approve or complete a checklist. After
                saving, use the chat command:
                <span className="mt-2 block font-semibold">
                  Regenerate contextual checklists for{" "}
                  {application.id}.
                </span>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowRegenerateWarning(true)
                  }
                  disabled={
                    controls.length === 0 ||
                    isProcessing
                  }
                  className="rounded-lg border border-amber-600 px-5 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Regenerate Checklist for All
                  Controls
                </button>

                <button
                  type="button"
                  onClick={handleSaveContext}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Save Application Context
                </button>
              </div>
          </div>
        </CollapsibleSection>

        {showRegenerateWarning ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() =>
              setShowRegenerateWarning(false)
            }
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) =>
                event.stopPropagation()
              }
              className="w-full max-w-md rounded-xl border border-amber-700/60 bg-slate-900 p-6 shadow-2xl"
            >
              <h4 className="text-base font-semibold text-amber-300">
                Regenerate checklists for every
                control?
              </h4>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                You&rsquo;re about to regenerate the
                checklist for every control on this
                application. Your existing notes are
                not deleted by this.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                But every control&rsquo;s checklist gets
                reset to &ldquo;Review Pending,&rdquo;
                even controls this context change had
                nothing to do with -- and if the
                regenerated wording doesn&rsquo;t match
                an existing item closely, the old item
                (with your note) stays alongside a new,
                differently-worded one instead of
                cleanly replacing it.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                If you believe this context change only
                affects one control, regenerate that
                control&rsquo;s checklist individually
                instead. Regenerating everything is
                safest right after an application is
                first added, while every checklist is
                still new.
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowRegenerateWarning(false)
                  }
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowRegenerateWarning(false);
                    onRegenerateAllChecklists();
                  }}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  Regenerate All Checklists
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <CollapsibleSection
          title="Application Notes"
          description="General observations about this application. Considered every time a checklist is generated or regenerated for any of its controls."
          theme="dark"
          badge={
            notes.length > 0 ? (
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                {notes.length}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">
                No application-level notes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <p className="mb-1 font-mono text-[10px] text-slate-600">
                      {note.id}
                    </p>

                    <p
                      className={
                        note.documentDeleted
                          ? "text-sm leading-6 text-slate-500 line-through decoration-slate-600"
                          : "text-sm leading-6 text-slate-300"
                      }
                    >
                      {note.text}
                    </p>

                    {note.documentDeleted ? (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        Source document deleted
                      </p>
                    ) : noteSourceLabel(note) ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {noteSourceLabel(note)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div>
              <textarea
                value={draftNote}
                onChange={(event) =>
                  setDraftNote(event.target.value)
                }
                placeholder="Add a general note about this application, e.g. a correction to earlier assumptions or something worth remembering across every control."
                rows={2}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitNote}
                  disabled={!draftNote.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function ContextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </span>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      )}
    </label>
  );
}

const QA_SCORE_BADGE_CLASSES: Record<
  QaScoreLevel,
  string
> = {
  "Not Started":
    "bg-slate-800 text-slate-300",
  "Surface Level":
    "bg-amber-950 text-amber-300",
  Developing:
    "bg-blue-950 text-blue-300",
  "Well Researched":
    "bg-indigo-950 text-indigo-300",
  "Argos Ready":
    "bg-emerald-950 text-emerald-300",
};

function WorkProgressSummaryPanel({
  controls,
}: {
  controls: ComplianceControl[];
}) {
  if (controls.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No controls have been added yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {controls.map((control) => (
        <div
          key={control.id}
          className="rounded-lg border border-slate-800 bg-slate-900 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-100">
              {control.name}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                QA_SCORE_BADGE_CLASSES[
                  control.qaScore
                ]
              }`}
            >
              QA: {control.qaScore}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {control.progressSummary ||
              "No work notes captured yet."}
          </p>
        </div>
      ))}
    </div>
  );
}

function ArgosRuleLogicPanel({
  controls,
}: {
  controls: ComplianceControl[];
}) {
  if (controls.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No controls have been added yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {controls.map((control) => (
        <div
          key={control.id}
          className="rounded-lg border border-slate-800 bg-slate-900 p-3"
        >
          <span className="font-medium text-slate-100">
            {control.name}
          </span>

          {control.argosObjective ? (
            <div className="mt-2 text-sm text-slate-300">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={
                  ARGOS_MARKDOWN_COMPONENTS
                }
              >
                {control.argosObjective}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Not yet defined.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
