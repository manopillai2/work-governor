"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../_data";

const NAV_ITEMS = ["Applications", "Learnings", "Reports", "Guide"];

export default function SaasMinimalPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-neutral-900 antialiased">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
        <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
            CG
          </div>
          <span className="text-sm font-semibold text-neutral-900">
            Control Governor
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={`flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm transition ${
                item === "Applications"
                  ? "bg-neutral-200/70 font-medium text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-200/40 hover:text-neutral-900"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-neutral-200 px-5 py-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Workspace</span>
            <span className="font-medium text-neutral-700">CORE</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Framework</span>
            <span className="font-medium text-neutral-700">SOX</span>
          </div>
          <Link
            href="/new-theme"
            className="mt-2 block text-xs text-neutral-400 hover:text-neutral-700"
          >
            ← All themes
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-neutral-900">
              Applications
            </h1>
            <span className="text-xs text-neutral-400">
              {APPLICATIONS.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              placeholder="Search applications…"
              className="w-56 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              readOnly
            />
            <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
              New Application
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-neutral-200">
              {APPLICATIONS.map((app) => {
                const isOpen = expandedApp === app.name;
                return (
                  <div key={app.name}>
                    <button
                      onClick={() => setExpandedApp(isOpen ? null : app.name)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-neutral-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900">
                            {app.name}
                          </span>
                          <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-500">
                            {app.framework}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">
                          {app.completed}/{app.controls} controls completed
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-900"
                            style={{
                              width: `${(app.completed / app.controls) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-neutral-300">
                          {isOpen ? "−" : "+"}
                        </span>
                      </div>
                    </button>

                    {isOpen && app.controlList.length > 0 ? (
                      <div className="divide-y divide-neutral-100 bg-neutral-50/60 px-6">
                        {app.controlList.map((control) => (
                          <div
                            key={control.code}
                            className="flex items-center justify-between gap-4 py-3 pl-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="shrink-0 font-mono text-[11px] text-neutral-400">
                                {control.code}
                              </span>
                              <span className="truncate text-sm text-neutral-700">
                                {control.title}
                              </span>
                            </div>
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  control.status === "Completed"
                                    ? "bg-emerald-500"
                                    : control.status === "In Progress"
                                      ? "bg-amber-500"
                                      : "bg-neutral-300"
                                }`}
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
            </div>
          </div>

          <div className="flex w-80 shrink-0 flex-col border-l border-neutral-200">
            <div className="flex h-12 shrink-0 items-center border-b border-neutral-200 px-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                AI Assistant
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {CHAT_MESSAGES.map((msg, i) =>
                msg.from === "ai" ? (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-700"
                  >
                    {msg.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className="ml-auto max-w-[85%] rounded-lg bg-neutral-900 px-3 py-2 text-sm leading-6 text-white"
                  >
                    {msg.text}
                  </div>
                )
              )}
            </div>
            <div className="shrink-0 border-t border-neutral-200 p-3">
              <div className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-400">
                Type a message…
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
