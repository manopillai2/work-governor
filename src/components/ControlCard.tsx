"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, {
  type Components,
} from "react-markdown";
import remarkGfm from "remark-gfm";

import CollapsibleSection from "@/components/CollapsibleSection";
import { noteSourceLabel } from "@/services/notes";
import { generateControlSummaryPdf } from "@/services/exportReport";
import type {
  ChecklistChangeLogEntry,
  ChecklistChangeType,
  ChecklistStatus,
  ChecklistTask,
  ControlStatus,
  Framework,
  Note,
  QaScoreLevel,
  TaskCategory,
  WorkflowStage,
} from "@/services/commandEngine";

// Light-themed (this section sits on a white/indigo-tinted card, not
// the dark chat/Argos panels elsewhere) markdown renderer for the
// structured Evidence vs. Data Gap Analysis text -- headings and
// bullets, no tables or code blocks expected from that content.
const GAP_ANALYSIS_MARKDOWN_COMPONENTS: Components =
  {
    h2: ({ children }) => (
      <h6 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-900 first:mt-0">
        {children}
      </h6>
    ),
    p: ({ children }) => (
      <p className="mb-2 text-sm leading-6 text-indigo-800 last:mb-0">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-indigo-800 last:mb-0">
        {children}
      </ul>
    ),
    li: ({ children }) => (
      <li className="leading-6">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-indigo-950">
        {children}
      </strong>
    ),
  };

const CHANGE_TYPE_BADGE_CLASSES: Record<
  ChecklistChangeType,
  string
> = {
  ADDED: "bg-green-100 text-green-700",
  MARKED_IRRELEVANT: "bg-red-100 text-red-700",
  RESTORED: "bg-blue-100 text-blue-700",
};

type ControlCardProps = {
  controlName: string;
  globalControlReference?: string;
  clientContext?: string;
  framework: Framework;

  applicationTag?: {
    appName: string;
    context: string | null;
  };

  stage: WorkflowStage;

  controlStatus: ControlStatus;
  checklistStatus: ChecklistStatus;

  controlObjective: string;
  controlRisk: string;
  applicabilityRationale: string;
  evidenceStrategy: string;
  evidenceDataGapAnalysis?: string;
  evidenceDataGapAnalysisStale?: boolean;

  qaScore?: QaScoreLevel;
  qaScoreRationale?: string;
  checklistChangeLog?: ChecklistChangeLogEntry[];

  nextTasks?: ChecklistTask[];
  notes?: Note[];

  onToggleTask: (
    taskId: string
  ) => void;

  onAddTaskNote?: (
    taskText: string,
    note: string
  ) => void;

  onMarkTaskIrrelevant: (
    taskId: string,
    reason: string
  ) => void;

  onRestoreTask: (taskId: string) => void;

  onRegenerateChecklist: () => void;
  onPrepEmail: () => void;
  onShowQuestions: () => void;
  onRefreshEvidenceDataGapAnalysis?: () => void;

  onApproveChecklist: () => void;
  onRequestChecklistRevision: () => void;
  onCompleteControl: () => void;
};

const CATEGORY_ORDER: TaskCategory[] = [
  "Homework",
  "Discovery",
  "Access",
  "Evidence Collection",
  "Validation",
  "Approval",
  "Argos Design",
  "Next Steps",
];

export default function ControlCard({
  controlName,
  globalControlReference = "",
  clientContext = "",
  framework,

  applicationTag,

  stage,

  controlStatus,
  checklistStatus,

  controlObjective,
  controlRisk,
  applicabilityRationale,
  evidenceStrategy,
  evidenceDataGapAnalysis = "",
  evidenceDataGapAnalysisStale = false,

  qaScore = "Not Started",
  qaScoreRationale = "",
  checklistChangeLog = [],

  nextTasks = [],
  notes = [],

  onToggleTask,
  onAddTaskNote,
  onMarkTaskIrrelevant,
  onRestoreTask,
  onRegenerateChecklist,
  onPrepEmail,
  onShowQuestions,
  onRefreshEvidenceDataGapAnalysis,
  onApproveChecklist,
  onRequestChecklistRevision,
  onCompleteControl,
}: ControlCardProps) {
  const [expanded, setExpanded] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const menuButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const [menuPosition, setMenuPosition] =
    useState<{
      top?: number;
      bottom?: number;
      right: number;
    } | null>(null);

  function openMenu() {
    const rect =
      menuButtonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    // The menu is a fixed-position portal, so it never gets pushed
    // back into view by page scrolling -- if there isn't room below
    // the button (e.g. a control near the bottom of a short window),
    // anchor it to open upward from the button instead of clipping
    // off the bottom of the viewport.
    const ESTIMATED_MENU_HEIGHT = 260;
    const spaceBelow =
      window.innerHeight - rect.bottom;
    const openUpward =
      spaceBelow < ESTIMATED_MENU_HEIGHT &&
      rect.top > ESTIMATED_MENU_HEIGHT;

    setMenuPosition(
      openUpward
        ? {
            bottom:
              window.innerHeight - rect.top + 4,
            right:
              window.innerWidth - rect.right,
          }
        : {
            top: rect.bottom + 4,
            right:
              window.innerWidth - rect.right,
          }
    );

    setMenuOpen(true);
  }

  function handleExportSummary() {
    const applicationName = applicationTag
      ? `${applicationTag.appName}${
          applicationTag.context
            ? ` (${applicationTag.context})`
            : ""
        }`
      : "Application";

    generateControlSummaryPdf(applicationName, {
      name: controlName,
      framework,
      stage,
      controlStatus,
      checklistStatus,
      globalControlReference,
      clientContext,
      controlObjective,
      controlRisk,
      applicabilityRationale,
      evidenceStrategy,
      evidenceDataGapAnalysis,
      evidenceDataGapAnalysisStale,
      qaScore,
      qaScoreRationale,
      notes,
      nextTasks,
      checklistChangeLog,
    });
  }

  // Rendered via a portal (position: fixed, escapes every
  // overflow-hidden/scrolling ancestor -- the card, the application
  // card, and the scrollable controls list all clip a normally
  // positioned dropdown), so close it on scroll/resize instead of
  // trying to keep it glued to the button.
  //
  // The listeners attach after a short delay rather than immediately:
  // opening the menu focuses the trigger button, and the browser's own
  // focus-scroll-into-view (plus the portal insertion itself) can fire
  // a burst of scroll events on the very same tick, which would
  // otherwise close the menu the instant it opens.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeMenu() {
      setMenuOpen(false);
    }

    const attachTimer = setTimeout(() => {
      window.addEventListener(
        "scroll",
        closeMenu,
        true
      );
      window.addEventListener(
        "resize",
        closeMenu
      );
    }, 500);

    return () => {
      clearTimeout(attachTimer);
      window.removeEventListener(
        "scroll",
        closeMenu,
        true
      );
      window.removeEventListener(
        "resize",
        closeMenu
      );
    };
  }, [menuOpen]);

  // Accordion within this control only: opening one section closes
  // whichever other one was open. Each ControlCard instance owns its
  // own key, so this never affects other controls or ApplicationCard.
  const [openSectionKey, setOpenSectionKey] =
    useState<string | null>(null);

  function toggleSection(key: string) {
    setOpenSectionKey((current) =>
      current === key ? null : key
    );
  }

  const relevantTasks = nextTasks.filter(
    (task) => !task.irrelevant
  );

  const completedTasks = relevantTasks.filter(
    (task) => task.completed
  ).length;

  const totalTasks = relevantTasks.length;

  const groupedTasks = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      tasks: nextTasks.filter(
        (task) => task.category === category
      ),
    })).filter(
      (group) => group.tasks.length > 0
    );
  }, [nextTasks]);

  const currentFocus = useMemo(() => {
    const firstIncompleteTask = relevantTasks.find(
      (task) => !task.completed
    );

    if (firstIncompleteTask) {
      return firstIncompleteTask.category;
    }

    if (relevantTasks.length > 0) {
      return "Review";
    }

    return "Not Started";
  }, [relevantTasks]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex w-full items-start justify-between gap-4 p-4 transition hover:bg-slate-50">
        <button
          type="button"
          onClick={() =>
            setExpanded(
              (current) => !current
            )
          }
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          {applicationTag ? (
            <span className="mb-1 inline-flex w-fit items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
              {applicationTag.appName}
              {applicationTag.context
                ? ` (${applicationTag.context})`
                : ""}
            </span>
          ) : null}

          <h4 className="font-semibold text-slate-900">
            {controlName}
          </h4>

          {globalControlReference ||
          clientContext ? (
            <div className="mt-0.5 flex w-full min-w-0 items-center justify-between gap-2">
              {globalControlReference ? (
                <span className="min-w-0 truncate text-xs text-slate-500">
                  {applicationTag
                    ? `${applicationTag.appName}${applicationTag.context ? ` - ${applicationTag.context}` : ""} - ${globalControlReference}`
                    : globalControlReference}
                </span>
              ) : (
                <span />
              )}

              {clientContext ? (
                <span className="min-w-0 shrink-0 truncate text-xs text-blue-600">
                  Client Context:{" "}
                  {clientContext}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 text-xs text-slate-500">
            {completedTasks} of {totalTasks} tasks
            completed · Current focus:{" "}
            {currentFocus}
          </div>
        </button>

        <div className="relative flex shrink-0 items-center gap-2 self-center">
          <button
            type="button"
            onClick={() =>
              setExpanded(
                (current) => !current
              )
            }
            aria-expanded={expanded}
            aria-label={
              expanded
                ? "Collapse control"
                : "Expand control"
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-lg text-slate-500 hover:bg-slate-100"
          >
            {expanded ? "−" : "+"}
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() =>
              menuOpen
                ? setMenuOpen(false)
                : openMenu()
            }
            aria-expanded={menuOpen}
            aria-label="Control actions"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100"
          >
            ☰
          </button>

          {menuOpen && menuPosition
            ? createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  />

                  <div
                    style={{
                      position: "fixed",
                      top: menuPosition.top,
                      bottom: menuPosition.bottom,
                      right:
                        menuPosition.right,
                    }}
                    className="z-50 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    <div className="px-3 py-1.5">
                      <div className="text-xs font-medium text-slate-500">
                        Stage: {stage}
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                          {framework}
                        </span>

                        <ControlStatusBadge
                          status={
                            controlStatus
                          }
                        />

                        <ChecklistStatusBadge
                          status={
                            checklistStatus
                          }
                        />

                        <QaScoreBadge
                          score={qaScore}
                        />
                      </div>
                    </div>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onRegenerateChecklist();
                      }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Regenerate Checklist
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onPrepEmail();
                      }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-blue-700 hover:bg-slate-100"
                    >
                      Prep Email
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onShowQuestions();
                      }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-blue-700 hover:bg-slate-100"
                    >
                      Show Questions
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onCompleteControl();
                      }}
                      disabled={
                        controlStatus !==
                          "Ready for Review" &&
                        controlStatus !==
                          "Completed"
                      }
                      className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      {controlStatus ===
                      "Completed"
                        ? "Control Completed"
                        : "Mark Control Completed"}
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleExportSummary();
                      }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-emerald-700 hover:bg-slate-100"
                    >
                      Export Summary
                    </button>
                  </div>
                </>,
                document.body
              )
            : null}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-slate-200 p-3">
          <CollapsibleSection
            title="QA Assessment"
            description="Why the QA badge above is what it is right now."
            tint="accent"
            open={openSectionKey === "qa"}
            onToggle={() =>
              toggleSection("qa")
            }
          >
            <p className="text-sm leading-6 text-indigo-800">
              {qaScoreRationale ||
                "No work notes captured yet. Add a note against a checklist item below to get started."}
            </p>
          </CollapsibleSection>

          <CollapsibleSection
            title="Control Details"
            open={
              openSectionKey === "details"
            }
            onToggle={() =>
              toggleSection("details")
            }
          >
            <div className="grid gap-3 xl:grid-cols-2">
              <ControlContextBox
                title="Control Objective"
                content={controlObjective}
              />

              <ControlContextBox
                title="Risk Addressed"
                content={controlRisk}
              />

              <ControlContextBox
                title="Why This Control Applies"
                content={applicabilityRationale}
              />

              <ControlContextBox
                title="Evidence Strategy"
                content={evidenceStrategy}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Evidence vs. Data Gap Analysis"
            description="Where attached evidence and real collected data agree, and what data is still missing to independently back up the evidence."
            tint="accent"
            open={
              openSectionKey ===
              "evidenceDataGap"
            }
            onToggle={() =>
              toggleSection(
                "evidenceDataGap"
              )
            }
            badge={
              evidenceDataGapAnalysisStale &&
              evidenceDataGapAnalysis ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
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
                  className="rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100"
                >
                  Refresh
                </button>
              ) : undefined
            }
          >
            {evidenceDataGapAnalysisStale &&
            evidenceDataGapAnalysis ? (
              <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                A source document behind this
                analysis was deleted -- it may no
                longer be accurate. Click Refresh
                to update it.
              </p>
            ) : null}

            {evidenceDataGapAnalysis ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={
                  GAP_ANALYSIS_MARKDOWN_COMPONENTS
                }
              >
                {evidenceDataGapAnalysis}
              </ReactMarkdown>
            ) : (
              <p className="text-sm leading-6 text-indigo-800">
                Not yet analyzed. This fills in
                once the control has both an
                attached evidence document and a
                real data file, or click Refresh
                to check now.
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Contextual Checklist"
            description={`${completedTasks} of ${totalTasks} tasks completed · Current focus: ${currentFocus}`}
            open={
              openSectionKey === "checklist"
            }
            onToggle={() =>
              toggleSection("checklist")
            }
            headerActions={
              <div className="flex shrink-0 items-center gap-1.5">
                {checklistStatus !==
                  "Approved" &&
                  checklistStatus !==
                    "Completed" && (
                    <button
                      type="button"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();
                        onApproveChecklist();
                      }}
                      className="rounded-md bg-green-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-green-500"
                    >
                      Approve
                    </button>
                  )}

                {checklistStatus !==
                  "Completed" && (
                  <button
                    type="button"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();
                      onRequestChecklistRevision();
                    }}
                    className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Needs Revision
                  </button>
                )}
              </div>
            }
          >
            {groupedTasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No checklist tasks have been created.
              </p>
            ) : (
              <div className="space-y-5">
                {groupedTasks.map((group) => (
                  <div key={group.category}>
                    <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.category}
                    </h6>

                    <div className="space-y-2">
                      {group.tasks.map((task) => (
                        <ChecklistTaskRow
                          key={task.id}
                          task={task}
                          onToggleTask={onToggleTask}
                          onAddTaskNote={onAddTaskNote}
                          onMarkTaskIrrelevant={
                            onMarkTaskIrrelevant
                          }
                          onRestoreTask={onRestoreTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Checklist Change Log"
            description="Every item added or marked irrelevant, whether by the assistant or by you, is recorded here permanently, with the reason why."
            open={
              openSectionKey === "changelog"
            }
            onToggle={() =>
              toggleSection("changelog")
            }
            badge={
              checklistChangeLog.length > 0 ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {checklistChangeLog.length}
                </span>
              ) : undefined
            }
          >
            {checklistChangeLog.length === 0 ? (
              <p className="text-sm text-slate-500">
                No checklist changes have been logged yet.
              </p>
            ) : (
              <div className="space-y-2">
                {[...checklistChangeLog]
                  .reverse()
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            CHANGE_TYPE_BADGE_CLASSES[
                              entry.changeType
                            ]
                          }`}
                        >
                          {entry.changeType.replace(
                            /_/g,
                            " "
                          )}
                        </span>

                        <span className="font-medium text-slate-800">
                          {entry.taskText}
                        </span>

                        <span className="text-[10px] uppercase tracking-wide text-slate-400">
                          by {entry.changedBy}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {entry.reason}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(
                          entry.timestamp
                        ).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

function ControlContextBox({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h5 className="font-medium text-slate-900">
        {title}
      </h5>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {content ||
          "Not yet defined. Regenerate the contextual checklist after completing the application context."}
      </p>
    </div>
  );
}

function ControlStatusBadge({
  status,
}: {
  status: ControlStatus;
}) {
  const classes: Record<
    ControlStatus,
    string
  > = {
    New: "bg-slate-100 text-slate-700",
    "Checklist Review Pending":
      "bg-amber-100 text-amber-800",
    "In Progress":
      "bg-blue-100 text-blue-700",
    "Ready for Review":
      "bg-purple-100 text-purple-700",
    Completed:
      "bg-green-100 text-green-700",
    "On Hold": "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[status]}`}
    >
      Control: {status}
    </span>
  );
}

function ChecklistStatusBadge({
  status,
}: {
  status: ChecklistStatus;
}) {
  const classes: Record<
    ChecklistStatus,
    string
  > = {
    "Review Pending":
      "bg-amber-100 text-amber-800",
    Approved:
      "bg-blue-100 text-blue-700",
    "Needs Revision":
      "bg-red-100 text-red-700",
    Completed:
      "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[status]}`}
    >
      Checklist: {status}
    </span>
  );
}

function QaScoreBadge({
  score,
}: {
  score: QaScoreLevel;
}) {
  const classes: Record<
    QaScoreLevel,
    string
  > = {
    "Not Started":
      "bg-slate-100 text-slate-700",
    "Surface Level":
      "bg-amber-100 text-amber-800",
    Developing:
      "bg-blue-100 text-blue-700",
    "Well Researched":
      "bg-indigo-100 text-indigo-700",
    "Argos Ready":
      "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[score]}`}
    >
      QA: {score}
    </span>
  );
}

function ChecklistTaskRow({
  task,
  onToggleTask,
  onAddTaskNote,
  onMarkTaskIrrelevant,
  onRestoreTask,
}: {
  task: ChecklistTask;
  onToggleTask: (taskId: string) => void;
  onAddTaskNote?: (
    taskText: string,
    note: string
  ) => void;
  onMarkTaskIrrelevant: (
    taskId: string,
    reason: string
  ) => void;
  onRestoreTask: (taskId: string) => void;
}) {
  const [draftNote, setDraftNote] =
    useState("");

  const [isMarkingIrrelevant, setIsMarkingIrrelevant] =
    useState(false);

  const [irrelevantReasonDraft, setIrrelevantReasonDraft] =
    useState("");

  function handleSubmitNote() {
    const trimmedNote = draftNote.trim();

    if (!trimmedNote || !onAddTaskNote) {
      return;
    }

    onAddTaskNote(task.text, trimmedNote);
    setDraftNote("");
  }

  function handleNoteKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    // Alt+Enter inserts a normal newline (default textarea
    // behavior) -- only a plain Enter submits the note.
    if (event.altKey) {
      return;
    }

    event.preventDefault();
    handleSubmitNote();
  }

  function handleIrrelevantCheckboxChange() {
    if (task.irrelevant) {
      onRestoreTask(task.id);
      return;
    }

    setIsMarkingIrrelevant(true);
  }

  function handleConfirmMarkIrrelevant() {
    const trimmedReason =
      irrelevantReasonDraft.trim();

    if (!trimmedReason) {
      return;
    }

    onMarkTaskIrrelevant(
      task.id,
      trimmedReason
    );

    setIsMarkingIrrelevant(false);
    setIrrelevantReasonDraft("");
  }

  return (
    <div
      className={`rounded-lg border p-3 transition ${
        task.irrelevant
          ? "border-slate-300 bg-slate-100 opacity-70"
          : task.completed
            ? "border-green-200 bg-green-50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          disabled={task.irrelevant}
          onChange={() =>
            onToggleTask(task.id)
          }
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />

        <div className="min-w-0">
          <span
            className={`text-sm leading-6 ${
              task.irrelevant
                ? "text-slate-400 line-through"
                : task.completed
                  ? "text-slate-500 line-through"
                  : "text-slate-700"
            }`}
          >
            {task.text}
          </span>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              {task.learningId ? (
                <span
                  className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
                  title={task.learningId}
                >
                  Learning
                </span>
              ) : null}

              {task.irrelevant ? (
                <span
                  className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"
                  title={task.irrelevantReason}
                >
                  Marked Irrelevant
                </span>
              ) : null}
            </div>

            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-slate-500">
              <input
                type="checkbox"
                checked={
                  task.irrelevant === true
                }
                onChange={
                  handleIrrelevantCheckboxChange
                }
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Mark irrelevant
            </label>
          </div>

          {task.irrelevant &&
          task.irrelevantReason ? (
            <p className="mt-1 text-xs italic leading-5 text-slate-500">
              {task.irrelevantReason}
            </p>
          ) : null}
        </div>
      </label>

      {isMarkingIrrelevant ? (
        <div className="mt-2">
          <textarea
            value={irrelevantReasonDraft}
            onChange={(event) =>
              setIrrelevantReasonDraft(
                event.target.value
              )
            }
            placeholder="Required: why is this item no longer relevant?"
            rows={2}
            className="w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500"
          />

          <div className="mt-1.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMarkingIrrelevant(
                  false
                );
                setIrrelevantReasonDraft("");
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                handleConfirmMarkIrrelevant
              }
              disabled={
                !irrelevantReasonDraft.trim()
              }
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}

      {task.notes.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
          {task.notes.map((note) => (
            <div
              key={note.id}
              className="rounded-md bg-white px-2.5 py-1.5"
            >
              <p className="mb-0.5 font-mono text-[10px] text-slate-400">
                {note.id}
              </p>

              <p
                className={
                  note.documentDeleted
                    ? "text-xs leading-5 text-slate-400 line-through decoration-slate-400"
                    : "text-xs leading-5 text-slate-600"
                }
              >
                {note.text}
              </p>

              {note.documentDeleted ? (
                <p className="mt-0.5 text-[11px] font-medium text-rose-500">
                  Source document deleted
                </p>
              ) : noteSourceLabel(note) ? (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {noteSourceLabel(note)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {onAddTaskNote ? (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <textarea
            value={draftNote}
            onChange={(event) =>
              setDraftNote(event.target.value)
            }
            onKeyDown={handleNoteKeyDown}
            placeholder="Add a note and press Enter to save (Alt+Enter for a new line)..."
            rows={1}
            className="w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />
        </div>
      ) : null}
    </div>
  );
}
