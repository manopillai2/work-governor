"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../_data";

const STATUS_BG: Record<string, string> = {
  Completed: "bg-lime-400",
  "In Progress": "bg-yellow-300",
  "Not Started": "bg-white",
  "Needs Attention": "bg-pink-400",
};

export default function BrutalistPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="min-h-screen w-full bg-[#fffbe6] text-black">
      {/* Header */}
      <header className="border-b-4 border-black bg-[#7c5cff] px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black">
              Control Governor
            </h1>
            <p className="mt-1 text-sm font-bold text-black">
              Workspace: CORE &nbsp;/&nbsp; Framework: SOX
            </p>
          </div>
          <Link
            href="/new-theme"
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000]"
          >
            ← All Themes
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Applications */}
          <section>
            <h2 className="mb-4 text-2xl font-black uppercase">
              Applications
            </h2>

            <div className="space-y-5">
              {APPLICATIONS.map((app) => {
                const isOpen = expandedApp === app.name;
                return (
                  <div
                    key={app.name}
                    className="border-4 border-black bg-white shadow-[6px_6px_0_0_#000]"
                  >
                    <button
                      onClick={() => setExpandedApp(isOpen ? null : app.name)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left"
                    >
                      <div>
                        <h3 className="text-xl font-black uppercase">
                          {app.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="border-2 border-black bg-cyan-300 px-2 py-0.5 text-xs font-bold uppercase">
                            {app.framework}
                          </span>
                          <span className="border-2 border-black bg-lime-300 px-2 py-0.5 text-xs font-bold uppercase">
                            {app.completed}/{app.controls} done
                          </span>
                          {app.needsAttention > 0 ? (
                            <span className="border-2 border-black bg-pink-400 px-2 py-0.5 text-xs font-bold uppercase">
                              {app.needsAttention} flagged
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-yellow-300 text-xl font-black">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    {isOpen && app.controlList.length > 0 ? (
                      <div className="space-y-3 border-t-4 border-black p-4">
                        {app.controlList.map((control) => (
                          <div
                            key={control.code}
                            className={`flex items-center justify-between gap-4 border-2 border-black p-3 ${STATUS_BG[control.status]}`}
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] font-bold">
                                {control.code}
                              </span>
                              <p className="text-sm font-bold leading-5">
                                {control.title}
                              </p>
                            </div>
                            <span className="shrink-0 border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase">
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
          </section>

          {/* Chat */}
          <aside className="flex h-fit flex-col border-4 border-black bg-white shadow-[6px_6px_0_0_#000]">
            <div className="border-b-4 border-black bg-cyan-300 px-4 py-2">
              <span className="text-sm font-black uppercase">
                AI Assistant
              </span>
            </div>
            <div className="space-y-3 p-4">
              {CHAT_MESSAGES.map((msg, i) =>
                msg.from === "ai" ? (
                  <div
                    key={i}
                    className="border-2 border-black bg-yellow-100 p-2 text-sm font-bold"
                  >
                    {msg.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className="ml-auto max-w-[90%] border-2 border-black bg-lime-300 p-2 text-sm font-bold"
                  >
                    {msg.text}
                  </div>
                )
              )}
            </div>
            <div className="border-t-4 border-black p-3">
              <div className="border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black/40">
                Type a message…
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
