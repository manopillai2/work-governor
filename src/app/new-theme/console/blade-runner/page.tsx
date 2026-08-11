"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_GLOW: Record<string, string> = {
  Completed: "text-[#5ce1c4]",
  "In Progress": "text-[#ff9d3d]",
  "Not Started": "text-stone-500",
  "Needs Attention": "text-[#ff4d4d]",
};

export default function BladeRunnerPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#120d0a] font-mono text-[#e8dcc8]">
      {/* rain streaks */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(100deg, rgba(255,157,61,0.15) 0px, transparent 2px, transparent 14px)",
        }}
      />
      {/* amber haze */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[#ff9d3d]/15 to-transparent" />

      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b border-[#ff9d3d]/30 pb-3">
          <h1
            className="text-2xl font-bold uppercase tracking-[0.2em] text-[#ff9d3d]"
            style={{ textShadow: "0 0 10px rgba(255,157,61,0.6)" }}
          >
            Control Governor
          </h1>
          <Link
            href="/new-theme/console"
            className="rounded border border-[#5ce1c4]/50 px-3 py-1 text-xs text-[#5ce1c4] hover:bg-[#5ce1c4]/10"
          >
            ← all console styles
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-[#ff9d3d]/25 bg-black/50 p-3">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 rounded border border-[#5ce1c4]/25 px-3 py-2 text-left hover:border-[#5ce1c4]/60 hover:bg-[#5ce1c4]/5"
                  >
                    <span className="text-[#e8dcc8]">
                      {isOpen ? "▾" : "▸"} {app.name}
                    </span>
                    <span className="shrink-0 text-[#5ce1c4]">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="mt-1 space-y-1 border-l-2 border-[#ff9d3d]/40 pl-3">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate text-[#c9bda6]">
                            <span className="text-[#ff9d3d]/60">
                              {control.code}
                            </span>{" "}
                            {control.title}
                          </span>
                          <span
                            className={`shrink-0 font-bold uppercase ${STATUS_GLOW[control.status]}`}
                          >
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

          <div className="flex w-72 shrink-0 flex-col rounded border border-[#5ce1c4]/25 bg-black/50">
            <div className="border-b border-[#5ce1c4]/25 px-3 py-2 text-xs uppercase tracking-wide text-[#5ce1c4]">
              AI Assistant
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span className="text-[#ff9d3d]/70">
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  <span className="text-[#e8dcc8]">{msg.text}</span>
                </p>
              ))}
            </div>
            <div className="border-t border-[#5ce1c4]/25 p-2 text-sm text-[#e8dcc8]/40">
              &gt; type a message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
