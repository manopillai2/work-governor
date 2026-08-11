"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../_data";

const STATUS_DOT: Record<string, string> = {
  Completed: "bg-emerald-300",
  "In Progress": "bg-amber-300",
  "Not Started": "bg-white/40",
  "Needs Attention": "bg-rose-300",
};

export default function GlassPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/40 bg-white/20 px-6 py-4 shadow-xl backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">
              Control Governor
            </h1>
            <p className="text-sm text-white/80">
              Workspace: CORE · Framework: SOX
            </p>
          </div>
          <Link
            href="/new-theme"
            className="rounded-full border border-white/40 bg-white/30 px-4 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-white/40"
          >
            ← All themes
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Applications */}
          <section className="space-y-4">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div
                  key={app.name}
                  className="overflow-hidden rounded-3xl border border-white/40 bg-white/25 shadow-lg backdrop-blur-xl"
                >
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-white drop-shadow-sm">
                        {app.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/40 bg-white/30 px-3 py-1 text-xs font-medium text-white">
                          {app.framework}
                        </span>
                        <span className="rounded-full border border-white/40 bg-white/30 px-3 py-1 text-xs font-medium text-white">
                          {app.completed}/{app.controls} completed
                        </span>
                      </div>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/30 text-lg text-white">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="space-y-2 border-t border-white/30 p-5">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-white/30 bg-white/20 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[11px] text-white/70">
                              {control.code}
                            </span>
                            <p className="truncate text-sm text-white">
                              {control.title}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[control.status]}`}
                            />
                            {control.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>

          {/* Chat */}
          <aside className="flex h-fit flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/25 shadow-lg backdrop-blur-xl">
            <div className="border-b border-white/30 px-5 py-3">
              <span className="text-sm font-semibold text-white">
                AI Assistant
              </span>
            </div>
            <div className="space-y-3 p-4">
              {CHAT_MESSAGES.map((msg, i) =>
                msg.from === "ai" ? (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/30 bg-white/20 px-3 py-2 text-sm text-white"
                  >
                    {msg.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className="ml-auto max-w-[85%] rounded-2xl bg-white/40 px-3 py-2 text-sm font-medium text-white"
                  >
                    {msg.text}
                  </div>
                )
              )}
            </div>
            <div className="border-t border-white/30 p-3">
              <div className="rounded-full border border-white/40 bg-white/20 px-4 py-2 text-sm text-white/70">
                Type a message…
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
