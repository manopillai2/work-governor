"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_GLOW: Record<string, string> = {
  Completed: "text-[#5ef1ff]",
  "In Progress": "text-[#ffcc00]",
  "Not Started": "text-slate-500",
  "Needs Attention": "text-[#ff3b3b]",
};

export default function TronGridPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-black font-mono text-[#5ef1ff]"
      style={{ perspective: "600px" }}
    >
      {/* receding floor grid */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,241,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(94,241,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform: "rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />

      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b border-[#5ef1ff]/40 pb-3">
          <h1
            className="text-2xl font-bold uppercase tracking-[0.2em] text-[#5ef1ff]"
            style={{ textShadow: "0 0 8px #5ef1ff, 0 0 20px #5ef1ff" }}
          >
            Control Governor
          </h1>
          <Link
            href="/new-theme/console"
            className="rounded border border-[#5ef1ff]/50 px-3 py-1 text-xs text-[#5ef1ff] shadow-[0_0_8px_rgba(94,241,255,0.4)] hover:bg-[#5ef1ff]/10"
          >
            ← all console styles
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-[#5ef1ff]/40 bg-black/60 p-3 shadow-[0_0_20px_rgba(94,241,255,0.1)_inset]">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 rounded border border-[#5ef1ff]/30 px-3 py-2 text-left hover:border-[#5ef1ff] hover:shadow-[0_0_12px_rgba(94,241,255,0.35)]"
                  >
                    <span className="uppercase tracking-wide text-white">
                      {isOpen ? "▾" : "▸"} {app.name}
                    </span>
                    <span className="shrink-0 text-[#5ef1ff]">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="mt-1 space-y-1 border-l-2 border-[#5ef1ff]/40 pl-3">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate text-[#c7fbff]">
                            <span className="text-[#5ef1ff]/50">
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

          <div className="flex w-72 shrink-0 flex-col rounded border border-[#5ef1ff]/40 bg-black/60 shadow-[0_0_20px_rgba(94,241,255,0.1)_inset]">
            <div className="border-b border-[#5ef1ff]/40 px-3 py-2 text-xs uppercase tracking-wide text-[#5ef1ff]">
              AI Assistant
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span className="text-[#5ef1ff]/60">
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  <span className="text-[#e6feff]">{msg.text}</span>
                </p>
              ))}
            </div>
            <div className="border-t border-[#5ef1ff]/40 p-2 text-sm text-[#5ef1ff]/40">
              &gt; type a message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
