"use client";

import { useState } from "react";
import Link from "next/link";

import ApplicationDetail from "@/components/ApplicationDetail";
import ChatPanel from "@/components/ChatPanel";
import ContextStatusBadge from "@/components/ContextStatusBadge";
import Header from "@/components/layout/Header";
import NavSwitchButton from "@/components/NavSwitchButton";
import { useAppState } from "@/components/AppStateProvider";
import {
  findApplication,
  type Application,
} from "@/services/commandEngine";
import { splitApplicationName } from "@/services/applicationName";

function ApplicationTile({
  application,
  isSelected,
  onSelect,
}: {
  application: Application;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { appName, context } =
    splitApplicationName(application.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected}
      className={`block w-full overflow-hidden rounded-xl border p-4 text-left transition ${
        isSelected
          ? "border-blue-500 bg-slate-800"
          : "border-slate-700 bg-slate-900 hover:bg-slate-800/70"
      }`}
    >
      <h3 className="text-lg font-semibold text-white">
        {appName}
        {context ? (
          <span className="ml-2 text-base font-normal text-slate-400">
            ({context})
          </span>
        ) : null}
      </h3>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          Hosting: {application.hosting}
        </span>

        <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-medium text-blue-300">
          {application.controls.length} control
          {application.controls.length === 1
            ? ""
            : "s"}
        </span>

        <ContextStatusBadge
          status={application.contextStatus}
        />
      </div>
    </button>
  );
}

export default function ApplicationsPage() {
  const {
    applications,
    messages,
    isProcessing,
    processingSummary,
    isLoaded,
    progress,

    handleSend,
    saveApplicationContext,
    addApplicationNoteHandler,
    regenerateAllChecklistsHandler,

    openEvidenceModal,
    openAttachmentManager,
  } = useAppState();

  const [isChatCollapsed, setIsChatCollapsed] =
    useState(false);

  // Master-detail on one page rather than a separate /applications/[id]
  // route -- selecting a tile on the left just swaps what's shown on
  // the right, no navigation. Clicking the already-selected tile again
  // clears the selection and returns to the centered list.
  const [
    selectedApplicationId,
    setSelectedApplicationId,
  ] = useState<string | null>(null);

  const selectedApplication = selectedApplicationId
    ? findApplication(
        applications,
        selectedApplicationId
      )
    : undefined;

  function handleSelect(applicationId: string) {
    setSelectedApplicationId((current) =>
      current === applicationId
        ? null
        : applicationId
    );
  }

  return (
    <main className="app-canvas-bg flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="shrink-0">
        <Header
          progress={
            isLoaded ? progress : undefined
          }
        />
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
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Applications
                </h2>

                {!selectedApplication ? (
                  <p className="mt-1 text-sm text-slate-400">
                    Application-level context,
                    evidence summaries, and bulk
                    actions live here. Day-to-day
                    control work happens on the{" "}
                    <Link
                      href="/"
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      flat control list
                    </Link>
                    .
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                  {applications.length} application
                  {applications.length === 1
                    ? ""
                    : "s"}
                </span>

                <NavSwitchButton />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {!isLoaded ? (
                <p className="text-sm text-slate-400">
                  Loading Control Governor...
                </p>
              ) : applications.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                  <div>
                    <h3 className="font-medium text-slate-200">
                      No applications yet
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Use the chat on the flat
                      control list to create an
                      application and its controls.
                    </p>
                  </div>
                </div>
              ) : selectedApplication ? (
                <div className="flex h-full min-h-0 gap-3 xl:gap-4">
                  <div className="w-full max-w-xs shrink-0 space-y-3 overflow-y-auto overscroll-contain pr-1">
                    {applications.map(
                      (application) => (
                        <ApplicationTile
                          key={application.id}
                          application={
                            application
                          }
                          isSelected={
                            application.id ===
                            selectedApplication.id
                          }
                          onSelect={() =>
                            handleSelect(
                              application.id
                            )
                          }
                        />
                      )
                    )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 xl:pr-2">
                    <ApplicationDetail
                      application={
                        selectedApplication
                      }
                      isProcessing={isProcessing}
                      onSaveContext={(context) =>
                        saveApplicationContext(
                          selectedApplication.id,
                          context
                        )
                      }
                      onRegenerateAllChecklists={() =>
                        void regenerateAllChecklistsHandler(
                          selectedApplication
                        )
                      }
                      onAddNote={(note) =>
                        addApplicationNoteHandler(
                          selectedApplication.id,
                          note
                        )
                      }
                      onRefreshEvidenceDataGapAnalysis={() =>
                        handleSend(
                          `Analyze the evidence vs real data gap for ${selectedApplication.id}, across all controls.`
                        )
                      }
                      onPrepEmail={() =>
                        handleSend(
                          `Give me an email-ready version for ${selectedApplication.id}.`
                        )
                      }
                      onShowQuestions={() =>
                        handleSend(
                          `Give me just the open questions from an email-ready version for ${selectedApplication.id}.`
                        )
                      }
                      onOpenAttachments={() =>
                        openAttachmentManager(
                          selectedApplication.id
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col items-center overflow-y-auto overscroll-contain py-2">
                  <p className="mb-4 text-sm text-slate-400">
                    Click an application below for
                    more details.
                  </p>

                  <div className="w-full max-w-4xl space-y-3">
                    {applications.map(
                      (application) => (
                        <ApplicationTile
                          key={application.id}
                          application={
                            application
                          }
                          isSelected={false}
                          onSelect={() =>
                            handleSelect(
                              application.id
                            )
                          }
                        />
                      )
                    )}
                  </div>
                </div>
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
                    onAttachEvidence={(kind) =>
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
