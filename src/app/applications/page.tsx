"use client";

import Link from "next/link";

import ContextStatusBadge from "@/components/ContextStatusBadge";
import Header from "@/components/layout/Header";
import NavSwitchButton from "@/components/NavSwitchButton";
import { useAppState } from "@/components/AppStateProvider";
import { splitApplicationName } from "@/services/applicationName";

export default function ApplicationsPage() {
  const { applications, isLoaded, progress } =
    useAppState();

  return (
    <main className="app-canvas-bg flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="shrink-0">
        <Header
          progress={
            isLoaded ? progress : undefined
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 xl:px-4 xl:py-4">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Applications
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Application-level context, evidence
                summaries, and bulk actions live here.
                Day-to-day control work happens on the{" "}
                <Link
                  href="/"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  flat control list
                </Link>
                .
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                {applications.length} application
                {applications.length === 1 ? "" : "s"}
              </span>

              <NavSwitchButton />
            </div>
          </div>

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
                  Use the chat on the flat control list
                  to create an application and its
                  controls.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((application) => {
                const { appName, context } =
                  splitApplicationName(
                    application.name
                  );

                return (
                  <Link
                    key={application.id}
                    href={`/applications/${encodeURIComponent(application.id)}`}
                    className="block overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-4 transition hover:bg-slate-800/70"
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
                        {application.controls.length}{" "}
                        control
                        {application.controls
                          .length === 1
                          ? ""
                          : "s"}
                      </span>

                      <ContextStatusBadge
                        status={
                          application.contextStatus
                        }
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
