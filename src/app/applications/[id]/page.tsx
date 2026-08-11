"use client";

import { use, useState } from "react";
import Link from "next/link";

import ApplicationDetail from "@/components/ApplicationDetail";
import ChatPanel from "@/components/ChatPanel";
import Header from "@/components/layout/Header";
import NavSwitchButton from "@/components/NavSwitchButton";
import { useAppState } from "@/components/AppStateProvider";
import { findApplication } from "@/services/commandEngine";

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const decodedId = decodeURIComponent(id);

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

  const application = findApplication(
    applications,
    decodedId
  );

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
              <Link
                href="/applications"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
              >
                ‹ Back to Applications
              </Link>

              <NavSwitchButton />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 xl:pr-2">
              {!isLoaded ? (
                <p className="text-sm text-slate-400">
                  Loading Control Governor...
                </p>
              ) : !application ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                  <div>
                    <h3 className="font-medium text-slate-200">
                      Application not found
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      This application may have been
                      renamed or deleted.
                    </p>

                    <Link
                      href="/applications"
                      className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Back to Applications
                    </Link>
                  </div>
                </div>
              ) : (
                <ApplicationDetail
                  application={application}
                  isProcessing={isProcessing}
                  onSaveContext={(context) =>
                    saveApplicationContext(
                      application.id,
                      context
                    )
                  }
                  onRegenerateAllChecklists={() =>
                    void regenerateAllChecklistsHandler(
                      application
                    )
                  }
                  onAddNote={(note) =>
                    addApplicationNoteHandler(
                      application.id,
                      note
                    )
                  }
                  onRefreshEvidenceDataGapAnalysis={() =>
                    handleSend(
                      `Analyze the evidence vs real data gap for ${application.id}, across all controls.`
                    )
                  }
                  onPrepEmail={() =>
                    handleSend(
                      `Give me an email-ready version for ${application.id}.`
                    )
                  }
                  onShowQuestions={() =>
                    handleSend(
                      `Give me just the open questions from an email-ready version for ${application.id}.`
                    )
                  }
                  onOpenAttachments={() =>
                    openAttachmentManager(
                      application.id
                    )
                  }
                />
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
