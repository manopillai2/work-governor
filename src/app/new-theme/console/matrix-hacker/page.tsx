"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_GLOW: Record<string, string> = {
  Completed: "text-[#0aff9d]",
  "In Progress": "text-[#00e5ff]",
  "Not Started": "text-slate-500",
  "Needs Attention": "text-[#ff00c8]",
};

export default function MatrixHackerPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-black font-mono text-[#0aff9d]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(10,255,157,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(10,255,157,0.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b border-[#0aff9d]/30 pb-3">
          <h1
            className="text-2xl font-black tracking-widest text-[#0aff9d]"
            style={{
              textShadow:
                "0 0 6px #0aff9d, 2px 0 #ff00c8, -2px 0 #00e5ff",
            }}
          >
            CONTROL_GOVERNOR.SYS
          </h1>
          <Link
            href="/new-theme/console"
            className="rounded border border-[#00e5ff]/50 px-3 py-1 text-xs text-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.4)] hover:bg-[#00e5ff]/10"
          >
            ← ALL_CONSOLE_STYLES
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-[#0aff9d]/30 p-3 shadow-[0_0_16px_rgba(10,255,157,0.08)_inset]">
            <p className="mb-3 text-xs text-[#0aff9d]/60">
              &gt; root@core:~$ ./list-applications --live
            </p>
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 rounded border border-[#0aff9d]/20 bg-black/40 px-3 py-2 text-left hover:border-[#0aff9d]/60 hover:shadow-[0_0_10px_rgba(10,255,157,0.25)]"
                  >
                    <span className="text-[#d6ffe9]">
                      {isOpen ? "▾" : "▸"} {app.name}
                    </span>
                    <span className="shrink-0 text-[#00e5ff]">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="mt-1 space-y-1 border-l-2 border-[#ff00c8]/40 pl-3">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate text-[#8effc9]">
                            <span className="text-[#0aff9d]/50">
                              {control.code}
                            </span>{" "}
                            {control.title}
                          </span>
                          <span
                            className={`shrink-0 font-bold ${STATUS_GLOW[control.status]}`}
                          >
                            {control.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex w-72 shrink-0 flex-col rounded border border-[#ff00c8]/40 shadow-[0_0_16px_rgba(255,0,200,0.1)_inset]">
            <div className="border-b border-[#ff00c8]/30 px-3 py-2 text-xs text-[#ff00c8]">
              AI_ASSIST.EXE
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span
                    className={
                      msg.from === "ai" ? "text-[#00e5ff]" : "text-[#ff00c8]"
                    }
                  >
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  <span className="text-[#c8ffe4]">{msg.text}</span>
                </p>
              ))}
            </div>
            <div className="border-t border-[#ff00c8]/30 p-2 text-sm text-[#0aff9d]/50">
              &gt; type a message
              <span className="animate-pulse text-[#0aff9d]">▌</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
