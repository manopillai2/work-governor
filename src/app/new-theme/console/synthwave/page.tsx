"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_GLOW: Record<string, string> = {
  Completed: "text-[#5efce8]",
  "In Progress": "text-[#ffe066]",
  "Not Started": "text-[#a78bd1]/60",
  "Needs Attention": "text-[#ff5f9e]",
};

export default function SynthwavePreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-[#1a0b2e] via-[#3a1155] to-[#ff5f9e] font-mono text-[#f4e8ff]">
      {/* retro sun */}
      <div
        className="pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full"
        style={{
          background: "linear-gradient(180deg, #ffe066, #ff5f9e)",
          boxShadow: "0 0 60px 10px rgba(255,95,158,0.5)",
        }}
      />
      {/* horizon grid */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,252,232,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(94,252,232,0.6) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b border-[#5efce8]/40 pb-3">
          <h1
            className="text-2xl font-black uppercase tracking-[0.15em] text-white"
            style={{ textShadow: "2px 2px 0 #ff5f9e, -2px -2px 0 #5efce8" }}
          >
            Control Governor
          </h1>
          <Link
            href="/new-theme/console"
            className="rounded-full border border-[#5efce8]/60 bg-black/30 px-3 py-1 text-xs text-[#5efce8] hover:bg-black/50"
          >
            ← all console styles
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#5efce8]/40 bg-black/40 p-3 backdrop-blur-sm">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 rounded-md border border-[#ff5f9e]/40 px-3 py-2 text-left hover:bg-[#ff5f9e]/10"
                  >
                    <span className="text-white">
                      {isOpen ? "▾" : "▸"} {app.name}
                    </span>
                    <span className="shrink-0 text-[#5efce8]">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="mt-1 space-y-1 border-l-2 border-[#ffe066]/50 pl-3">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate text-[#f4e8ff]/80">
                            <span className="text-[#ffe066]/70">
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

          <div className="flex w-72 shrink-0 flex-col rounded-lg border border-[#5efce8]/40 bg-black/40 backdrop-blur-sm">
            <div className="border-b border-[#5efce8]/40 px-3 py-2 text-xs uppercase tracking-wide text-[#5efce8]">
              AI Assistant
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span className="text-[#ff5f9e]">
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  <span className="text-[#f4e8ff]">{msg.text}</span>
                </p>
              ))}
            </div>
            <div className="border-t border-[#5efce8]/40 p-2 text-sm text-[#f4e8ff]/40">
              &gt; type a message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
