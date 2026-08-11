"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../_data";

const STATUS_TEXT: Record<string, string> = {
  Completed: "text-emerald-700",
  "In Progress": "text-amber-700",
  "Not Started": "text-stone-400",
  "Needs Attention": "text-red-700",
};

export default function EditorialPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbfaf8] text-stone-800">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="shrink-0 border-b border-stone-200 px-10 py-6">
          <div className="mx-auto flex max-w-4xl items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold text-stone-900">
                Control Governor
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Workspace <span className="text-stone-800">CORE</span> ·
                Framework <span className="text-stone-800">SOX</span>
              </p>
            </div>
            <Link
              href="/new-theme"
              className="text-sm text-stone-400 underline decoration-stone-300 underline-offset-4 hover:text-stone-700"
            >
              ← All themes
            </Link>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 gap-10 overflow-hidden px-10 py-8">
          <section className="min-h-0 flex-1 overflow-y-auto">
            <h2 className="font-serif text-xl text-stone-900">
              Applications
            </h2>
            <div className="mt-4 divide-y divide-stone-200">
              {APPLICATIONS.map((app) => {
                const isOpen = expandedApp === app.name;
                return (
                  <div key={app.name} className="py-5">
                    <button
                      onClick={() =>
                        setExpandedApp(isOpen ? null : app.name)
                      }
                      className="flex w-full items-baseline justify-between gap-4 text-left"
                    >
                      <div>
                        <h3 className="font-serif text-lg text-stone-900">
                          {app.name}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {app.framework} · {app.completed} of{" "}
                          {app.controls} controls complete
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-amber-700">
                        {isOpen ? "hide" : "view"}
                      </span>
                    </button>

                    {isOpen && app.controlList.length > 0 ? (
                      <div className="mt-4 space-y-4 border-l-2 border-stone-200 pl-5">
                        {app.controlList.map((control) => (
                          <div key={control.code}>
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="font-mono text-[11px] text-stone-400">
                                {control.code}
                              </span>
                              <span
                                className={`text-xs font-medium ${STATUS_TEXT[control.status]}`}
                              >
                                {control.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm leading-6 text-stone-700">
                              {control.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chat */}
          <aside className="flex w-72 shrink-0 flex-col rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-4 py-3">
              <span className="font-serif text-sm text-stone-900">
                Assistant
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {CHAT_MESSAGES.map((msg, i) => (
                <div key={i}>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-stone-400">
                    {msg.from === "ai" ? "Assistant" : "You"}
                  </p>
                  <p className="text-sm leading-6 text-stone-700">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 p-3">
              <div className="border-b border-stone-300 pb-1 text-sm text-stone-400">
                Type a message…
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
