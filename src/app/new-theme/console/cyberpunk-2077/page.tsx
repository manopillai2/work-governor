"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_GLOW: Record<string, string> = {
  Completed: "text-[#00f0b5]",
  "In Progress": "text-[#fcee0a]",
  "Not Started": "text-neutral-500",
  "Needs Attention": "text-[#ff2e63]",
};

export default function Cyberpunk2077Preview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-mono text-[#fcee0a]">
      {/* glitch scan bars */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b-2 border-[#fcee0a] pb-3">
          <h1 className="relative text-2xl font-black uppercase tracking-tight text-[#fcee0a]">
            <span
              className="absolute -left-[2px] top-0 text-[#ff2e63] opacity-70"
              aria-hidden
            >
              CONTROL_GOVERNOR
            </span>
            <span
              className="absolute left-[2px] top-0 text-[#00f0b5] opacity-70"
              aria-hidden
            >
              CONTROL_GOVERNOR
            </span>
            <span className="relative">CONTROL_GOVERNOR</span>
          </h1>
          <Link
            href="/new-theme/console"
            className="border-2 border-[#ff2e63] bg-black px-3 py-1 text-xs font-bold uppercase text-[#ff2e63] hover:bg-[#ff2e63]/10"
          >
            ← ALL CONSOLE STYLES
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto border-2 border-[#fcee0a]/60 bg-black p-3">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 border border-[#ff2e63]/50 px-3 py-2 text-left hover:bg-[#ff2e63]/10"
                  >
                    <span className="uppercase text-white">
                      {isOpen ? "▾" : "▸"} {app.name}
                    </span>
                    <span className="shrink-0 text-[#00f0b5]">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="mt-1 space-y-1 border-l-4 border-[#ff2e63] pl-3">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate text-neutral-300">
                            <span className="text-[#fcee0a]/70">
                              {control.code}
                            </span>{" "}
                            {control.title}
                          </span>
                          <span
                            className={`shrink-0 font-black uppercase ${STATUS_GLOW[control.status]}`}
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

          <div className="flex w-72 shrink-0 flex-col border-2 border-[#ff2e63]/60 bg-black">
            <div className="border-b-2 border-[#ff2e63]/60 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#ff2e63]">
              AI Assistant
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span className="font-bold text-[#00f0b5]">
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  <span className="text-neutral-300">{msg.text}</span>
                </p>
              ))}
            </div>
            <div className="border-t-2 border-[#ff2e63]/60 p-2 text-sm text-neutral-600">
              &gt; type a message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
