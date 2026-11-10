"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ChatPanel from "@/components/ChatPanel";
import ChevronMiniIcon from "@/components/ChevronMiniIcon";
import ControlCard from "@/components/ControlCard";
import FilterBar from "@/components/FilterBar";
import AppFrame from "@/components/layout/AppFrame";
import HubDashboard from "@/components/hub/HubDashboard";
import { useTheme } from "@/components/ThemeProvider";
import { usePathname, useSearchParams } from "next/navigation";
import NavSwitchButton from "@/components/NavSwitchButton";
import { useAppState } from "@/components/AppStateProvider";
import { generateExecutiveProgressPdf } from "@/services/exportReport";

import {
  buildControlDrillDownFilters,
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


  // New UI: "/" is the application dashboard and the flat control
  // list lives at /controls (same component); the chat moves into the
  // shell's drawer. Classic renders this page the same on both paths.
  const { uiMode } = useTheme();
  const isHub = uiMode === "hub";
  const pathname = usePathname();
  const showDashboard = isHub && pathname === "/";

  const [isChatCollapsed, setIsChatCollapsed] =
    useState(false);

  // A single expanded control id, not a per-card useState -- expanding
  // one control auto-collapses whichever other one was open.
  // Deep link from the New UI's application tiles: ?control=<id> opens
  // that control expanded. Read via useSearchParams (not
  // window.location) so it is also correct after an in-app router.push,
  // where the first render happens before the URL changes. The user's
  // own expand/collapse choice wins until the link changes again.
  const linkedControlId = useSearchParams().get("control");
  const [expandedChoice, setExpandedChoice] = useState<{
    forLink: string | null;
    id: string | null;
  } | null>(null);
  const expandedControlId =
    expandedChoice && expandedChoice.forLink === linkedControlId
      ? expandedChoice.id
      : linkedControlId;

  // ...and applies the existing Apps + Control filters for it once data
  // has loaded, so a reload or shared /controls?control=<id> link
  // narrows the same way a tile click does (which sets them before
  // navigating). Applied once per link; the user can change or clear
  // the filters in FilterBar afterwards.
  const appliedLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded || !linkedControlId || appliedLinkRef.current === linkedControlId) return;
    appliedLinkRef.current = linkedControlId;
    for (const application of applications) {
      const control = application.controls.find((c) => c.id === linkedControlId);
      if (control) {
        setFilters(buildControlDrillDownFilters(application, control));
        return;
      }
    }
  }, [isLoaded, linkedControlId, applications, setFilters]);

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
      <AppFrame title={showDashboard ? "Dashboard" : "Controls"}>

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
      </AppFrame>
    );
  }

  if (showDashboard) {
    return (
      <AppFrame title="Dashboard" progress={progress}>
        <HubDashboard />
      </AppFrame>
    );
  }

  return (
    <AppFrame title="Controls" progress={progress}>

      <div className={`min-h-0 flex-1 overflow-hidden ${isHub ? "px-4 py-3" : "px-3 py-3 xl:px-4 xl:py-4"}`}>
        <div
          className={`grid h-full min-h-0 w-full gap-3 xl:gap-4 ${
            isHub
              ? ""
              : isChatCollapsed
              ? "xl:grid-cols-[1fr_44px]"
              : "xl:grid-cols-[minmax(650px,78%)_minmax(300px,22%)]"
          }`}
        >
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className={`mb-2 flex shrink-0 items-center justify-between gap-4 ${isHub ? "hidden" : ""}`}>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Controls
              </h2>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    generateExecutiveProgressPdf(
                      applications
                    )
                  }
                  title="Download a colorful executive PDF covering every application and control, with completion percentages"
                  className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500`}
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
                              setExpandedChoice({
                                forLink: linkedControlId,
                                id:
                                  expandedControlId ===
                                  control.id
                                    ? null
                                    : control.id,
                              })
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

          {isHub ? null : (
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
                <ChevronMiniIcon direction="left" />
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
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Collapse
                    <ChevronMiniIcon direction="right" />
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
          )}
        </div>
      </div>
    </AppFrame>
  );
}
