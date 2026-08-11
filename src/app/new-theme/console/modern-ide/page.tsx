"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_COLOR: Record<string, string> = {
  Completed: "text-[#4ec9b0]",
  "In Progress": "text-[#dcdcaa]",
  "Not Started": "text-[#6a6a6a]",
  "Needs Attention": "text-[#f14c4c]",
};

export default function ModernIdePreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e] font-mono text-[13px] text-[#cccccc]">
      {/* activity bar */}
      <div className="flex w-11 shrink-0 flex-col items-center gap-4 border-r border-black bg-[#333333] py-3 text-[#858585]">
        <span className="text-lg">▤</span>
        <span className="text-lg text-white">◧</span>
        <span className="text-lg">⚙</span>
      </div>

      {/* sidebar */}
      <div className="flex w-56 shrink-0 flex-col border-r border-black bg-[#252526]">
        <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-[#858585]">
          Control Governor
        </div>
        <div className="px-3 py-1 text-[11px] font-bold uppercase text-[#cccccc]">
          Applications
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {APPLICATIONS.map((app) => (
            <div
              key={app.name}
              className="flex items-center gap-1.5 px-3 py-1 text-[#cccccc] hover:bg-[#2a2d2e]"
            >
              <span className="text-[#519aba]">▸</span>
              <span className="truncate">{app.name}</span>
            </div>
          ))}
        </div>
        <Link
          href="/new-theme/console"
          className="border-t border-black px-3 py-2 text-[11px] text-[#858585] hover:text-white"
        >
          ← all console styles
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* tabs */}
        <div className="flex h-9 shrink-0 items-center border-b border-black bg-[#252526] text-[12px]">
          <div className="flex h-full items-center gap-2 border-r border-black bg-[#1e1e1e] px-3 text-white">
            applications.controls.ts
          </div>
          <div className="flex h-full items-center gap-2 border-r border-black px-3 text-[#858585]">
            ai-assistant.tsx
          </div>
        </div>
        {/* breadcrumb */}
        <div className="flex h-6 shrink-0 items-center gap-1 border-b border-black px-3 text-[11px] text-[#858585]">
          <span>control-governor</span>
          <span>›</span>
          <span>applications</span>
          <span>›</span>
          <span className="text-[#cccccc]">SOX</span>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-1">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#2a2d2e]"
                  >
                    <span className="text-[#858585]">
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <span className="text-[#9cdcfe]">{app.name}</span>
                    <span className="text-[#6a9955]">
                      // {app.framework}, {app.completed}/{app.controls} done
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="ml-6 border-l border-[#3c3c3c] pl-3">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1"
                        >
                          <span className="min-w-0 truncate">
                            <span className="text-[#c586c0]">const</span>{" "}
                            <span className="text-[#9cdcfe]">
                              {control.code}
                            </span>
                            <span className="text-[#cccccc]"> = &quot;</span>
                            <span className="text-[#ce9178]">
                              {control.title}
                            </span>
                            <span className="text-[#cccccc]">&quot;</span>
                          </span>
                          <span
                            className={`shrink-0 text-[11px] font-semibold ${STATUS_COLOR[control.status]}`}
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

          {/* right panel = chat */}
          <div className="flex w-72 shrink-0 flex-col border-l border-black bg-[#252526]">
            <div className="border-b border-black px-3 py-2 text-[11px] uppercase text-[#858585]">
              AI Assistant
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {CHAT_MESSAGES.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded px-2 py-1.5 text-[12px] leading-5 ${
                    msg.from === "ai"
                      ? "bg-[#2d2d2d] text-[#cccccc]"
                      : "bg-[#0e639c]/30 text-[#cccccc]"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="border-t border-black p-2">
              <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-[12px] text-[#6a6a6a]">
                Type a message…
              </div>
            </div>
          </div>
        </div>

        {/* status bar */}
        <div className="flex h-6 shrink-0 items-center justify-between bg-[#007acc] px-3 text-[11px] text-white">
          <span>CORE / SOX</span>
          <span>3 applications · 23 controls</span>
        </div>
      </div>
    </div>
  );
}
