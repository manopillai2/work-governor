"use client";

import { useMemo, useState } from "react";

import ChatPanel from "@/components/ChatPanel";
import ControlCard from "@/components/ControlCard";
import FilterBar from "@/components/FilterBar";
import Header from "@/components/layout/Header";
import NavSwitchButton from "@/components/NavSwitchButton";
import { useAppState } from "@/components/AppStateProvider";
import { generateExecutiveProgressPdf } from "@/services/exportReport";

import {
  filterApplications,
  toFlatControlEntries,
} from "@/services/applicationFilters";
import { splitApplicationName } from "@/services/applicationName";

export default function Home() {
  const {
    applications,
    messages,
    isProcessing,
    processingSummary,
    isLoaded,
    loadError,
    retryLoad,
    progress,

    filters,
    setFilters,

    handleSend,
    toggleChecklistTask,
    addTaskNote,
    markTaskIrrelevantHandler,
    restoreTaskHandler,
    regenerateChecklistHandler,
    approveChecklist,
    requestChecklistRevision,
    completeControl,

    openEvidenceModal,
  } = useAppState();

  const [isChatCollapsed, setIsChatCollapsed] =
    useState(false);

  // A single expanded control id, not a per-card useState -- expanding
  // one control auto-collapses whichever other one was open.
  const [
    expandedControlId,
    setExpandedControlId,
  ] = useState<string | null>(null);

  const visibleApplications = useMemo(
    () =>
      filterApplications(
        applications,
        filters
      ),
    [applications, filters]
  );

  const visibleControls = useMemo(
    () =>
      toFlatControlEntries(
        visibleApplications
      ),
    [visibleApplications]
  );

  if (!isLoaded) {
    return (
      <main className="app-canvas-bg flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
        <div className="shrink-0">
          <Header />
        </div>

        <div className="flex flex-1 items-center justify-center">
          {loadError ? (
            <div className="max-w-md text-center">
              <p className="text-sm text-red-400">
                {loadError}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Your existing data has not been
                touched -- nothing is saved
                until it loads successfully.
              </p>
              <button
                type="button"
                onClick={retryLoad}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Loading Control Governor...
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="app-canvas-bg flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="shrink-0">
        <Header progress={progress} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 xl:px-4 xl:py-4">
        <div
          className={`grid h-full min-h-0 w-full gap-3 xl:gap-4 ${
            isChatCollapsed
              ? "xl:grid-cols-[1fr_44px]"
              : "xl:grid-cols-[minmax(650px,78%)_minmax(300px,22%)]"
          }`}
        >
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">
                Controls
              </h2>

              <div className="flex shrink-0 items-center gap-3">
                <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                  {applications.length} application
                  {applications.length === 1
                    ? ""
                    : "s"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    generateExecutiveProgressPdf(
                      applications
                    )
                  }
                  title="Download a colorful executive PDF covering every application and control, with completion percentages"
                  className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  Executive Summary
                </button>

                <NavSwitchButton />
              </div>
            </div>

            {applications.length > 0 && (
              <div className="mb-2 shrink-0">
                <FilterBar
                  applications={applications}
                  filters={filters}
                  onChange={setFilters}
                  matchedApplicationCount={
                    visibleApplications.length
                  }
                  totalApplicationCount={
                    applications.length
                  }
                  matchedControlCount={
                    visibleControls.length
                  }
                  totalControlCount={
                    progress.controls
                  }
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 xl:pr-2">
              {applications.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                  <div>
                    <h3 className="font-medium text-slate-200">
                      No applications yet
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Use the chat to create an
                      application and its controls.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {visibleControls.length === 0 ? (
                    <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                      <div>
                        <h3 className="font-medium text-slate-200">
                          No matches
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                          No applications or controls
                          match the current filters.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {visibleControls.map(
                        ({
                          application,
                          control,
                        }) => (
                          <ControlCard
                            key={control.id}
                            expanded={
                              expandedControlId ===
                              control.id
                            }
                            onToggleExpanded={() =>
                              setExpandedControlId(
                                (current) =>
                                  current ===
                                  control.id
                                    ? null
                                    : control.id
                              )
                            }
                            applicationTag={splitApplicationName(
                              application.name
                            )}
                            controlName={
                              control.name
                            }
                            globalControlReference={
                              control.globalControlReference
                            }
                            clientContext={
                              control.clientContext
                            }
                            framework={
                              control.framework
                            }
                            stage={
                              control.stage
                            }
                            controlStatus={
                              control.controlStatus
                            }
                            checklistStatus={
                              control.checklistStatus
                            }
                            controlObjective={
                              control.controlObjective
                            }
                            controlRisk={
                              control.controlRisk
                            }
                            applicabilityRationale={
                              control.applicabilityRationale
                            }
                            evidenceStrategy={
                              control.evidenceStrategy
                            }
                            evidenceDataGapAnalysis={
                              control.evidenceDataGapAnalysis
                            }
                            evidenceDataGapAnalysisStale={
                              control.evidenceDataGapAnalysisStale
                            }
                            qaScore={
                              control.qaScore
                            }
                            qaScoreRationale={
                              control.qaScoreRationale
                            }
                            checklistChangeLog={
                              control.checklistChangeLog
                            }
                            nextTasks={
                              control.nextTasks
                            }
                            notes={control.notes}
                            onToggleTask={(
                              taskId
                            ) =>
                              toggleChecklistTask(
                                application.id,
                                control.id,
                                taskId
                              )
                            }
                            onAddTaskNote={(
                              taskText,
                              note
                            ) =>
                              addTaskNote(
                                application.name,
                                control.name,
                                taskText,
                                note
                              )
                            }
                            onMarkTaskIrrelevant={(
                              taskId,
                              reason
                            ) =>
                              markTaskIrrelevantHandler(
                                application.id,
                                control.id,
                                taskId,
                                reason
                              )
                            }
                            onRestoreTask={(
                              taskId
                            ) =>
                              restoreTaskHandler(
                                application.id,
                                control.id,
                                taskId
                              )
                            }
                            onRegenerateChecklist={() =>
                              regenerateChecklistHandler(
                                application.id,
                                control.name
                              )
                            }
                            onPrepEmail={() =>
                              handleSend(
                                `Give me an email-ready version for ${application.id}, for control "${control.name}" only.`
                              )
                            }
                            onShowQuestions={() =>
                              handleSend(
                                `Give me just the open questions from an email-ready version for ${application.id}, for control "${control.name}" only.`
                              )
                            }
                            onRefreshEvidenceDataGapAnalysis={() =>
                              handleSend(
                                `Analyze the evidence vs real data gap for ${application.id}, for control "${control.name}" only.`
                              )
                            }
                            onApproveChecklist={() =>
                              approveChecklist(
                                application.id,
                                control.id
                              )
                            }
                            onRequestChecklistRevision={() =>
                              requestChecklistRevision(
                                application.id,
                                control.id
                              )
                            }
                            onCompleteControl={() =>
                              completeControl(
                                application.id,
                                control.id
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="h-full min-h-0 min-w-0 overflow-hidden">
            {isChatCollapsed ? (
              <button
                type="button"
                onClick={() =>
                  setIsChatCollapsed(false)
                }
                title="Expand chat"
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <span className="text-lg">
                  ‹
                </span>
                <span className="[writing-mode:vertical-rl] text-xs font-medium tracking-wide">
                  Chat
                </span>
              </button>
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
                <div className="flex shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setIsChatCollapsed(true)
                    }
                    title="Collapse chat"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Collapse ›
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <ChatPanel
                    messages={messages}
                    onSend={handleSend}
                    assistantMessage={
                      isProcessing
                        ? `Working on: "${processingSummary}"`
                        : undefined
                    }
                    onAttachEvidence={(
                      kind
                    ) =>
                      openEvidenceModal(kind)
                    }
                  />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
