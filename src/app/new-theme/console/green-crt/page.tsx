"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_TAG: Record<string, string> = {
  Completed: "[OK]",
  "In Progress": "[WIP]",
  "Not Started": "[----]",
  "Needs Attention": "[WARN]",
};

export default function GreenCrtPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-mono text-green-500">
      {/* scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,255,65,0.15) 0px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative z-0 flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b border-green-900 pb-2">
          <div>
            <p className="text-lg tracking-widest text-green-400">
              SYSTEM: CONTROL-GOVERNOR v2.1
            </p>
            <p className="text-xs text-green-700">
              WORKSPACE=CORE FRAMEWORK=SOX USER=MPILLAI
            </p>
          </div>
          <Link
            href="/new-theme/console"
            className="text-xs text-green-700 hover:text-green-400"
          >
            [ESC] all console styles
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          {/* main list */}
          <div className="min-h-0 flex-1 overflow-y-auto border border-green-900 p-3">
            <p className="mb-2 text-green-400">
              &gt; LIST APPLICATIONS --status=all
            </p>
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 border border-green-900 px-3 py-2 text-left hover:bg-green-950/40"
                  >
                    <span>
                      {isOpen ? "▾" : "▸"} {app.name}{" "}
                      <span className="text-green-800">
                        ({app.framework})
                      </span>
                    </span>
                    <span className="shrink-0 text-green-600">
                      {app.completed}/{app.controls} DONE
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="border border-t-0 border-green-900 px-3 py-2">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            <span className="text-green-800">
                              {control.code}
                            </span>{" "}
                            {control.title}
                          </span>
                          <span className="shrink-0 text-green-400">
                            {STATUS_TAG[control.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <p className="mt-2 text-green-700">
              &gt; <span className="animate-pulse">_</span>
            </p>
          </div>

          {/* chat */}
          <div className="flex w-72 shrink-0 flex-col border border-green-900">
            <div className="border-b border-green-900 px-3 py-2 text-xs text-green-600">
              AI-ASSIST.EXE
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span className="text-green-700">
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  {msg.text}
                </p>
              ))}
            </div>
            <div className="border-t border-green-900 p-2 text-sm text-green-800">
              &gt; type a message<span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
