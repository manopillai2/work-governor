"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const FKEYS = [
  "F1 HELP",
  "F2 FILTER",
  "F3 EXPORT",
  "F4 FLAG",
  "F5 REFRESH",
  "F6 CHAT",
];

export default function AmberBloombergPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0805] font-mono text-[13px] text-amber-500">
      {/* ticker */}
      <div className="shrink-0 overflow-hidden whitespace-nowrap border-b border-amber-900/60 bg-black px-3 py-1 text-xs text-amber-600">
        CORE/SOX &nbsp;•&nbsp; 3 APPLICATIONS &nbsp;•&nbsp; 23 CONTROLS
        &nbsp;•&nbsp; 4 IN PROGRESS &nbsp;•&nbsp; 1 NEEDS ATTENTION
        &nbsp;•&nbsp; LAST SYNC 00:00:07 AGO
      </div>

      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/60 px-4 py-2">
        <span className="font-bold tracking-widest text-amber-300">
          CONTROL-GOVERNOR&lt;GO&gt;
        </span>
        <Link
          href="/new-theme/console"
          className="text-xs text-amber-700 hover:text-amber-400"
        >
          ← all console styles
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-[1fr_100px_100px_90px] gap-2 border-b border-amber-900/60 bg-black/40 px-4 py-1 text-[11px] text-amber-700">
            <span>APPLICATION</span>
            <span>FRAMEWORK</span>
            <span>PROGRESS</span>
            <span>OWNER</span>
          </div>

          {APPLICATIONS.map((app) => {
            const isOpen = expandedApp === app.name;
            return (
              <div key={app.name} className="border-b border-amber-900/30">
                <button
                  onClick={() => setExpandedApp(isOpen ? null : app.name)}
                  className="grid w-full grid-cols-[1fr_100px_100px_90px] gap-2 px-4 py-2 text-left hover:bg-amber-950/30"
                >
                  <span className="text-amber-300">
                    {isOpen ? "▾" : "▸"} {app.name}
                  </span>
                  <span className="text-amber-700">{app.framework}</span>
                  <span className="text-amber-500">
                    {app.completed}/{app.controls}
                  </span>
                  <span className="text-amber-700">{app.owner}</span>
                </button>

                {isOpen && app.controlList.length > 0 ? (
                  <div className="bg-black/30 pb-2 pl-8">
                    {app.controlList.map((control) => (
                      <div
                        key={control.code}
                        className="grid grid-cols-[90px_1fr_100px] gap-2 py-1 text-[12px]"
                      >
                        <span className="text-amber-800">
                          {control.code}
                        </span>
                        <span className="truncate text-amber-400">
                          {control.title}
                        </span>
                        <span className="text-right font-semibold text-amber-300">
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

        <div className="flex w-72 shrink-0 flex-col border-l border-amber-900/60">
          <div className="border-b border-amber-900/60 px-3 py-2 text-[11px] text-amber-700">
            AI ASSISTANT
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-[12px]">
            {CHAT_MESSAGES.map((msg, i) => (
              <p key={i} className="leading-5">
                <span className="text-amber-700">
                  {msg.from === "ai" ? "AI>" : "YOU>"}
                </span>{" "}
                <span className="text-amber-400">{msg.text}</span>
              </p>
            ))}
          </div>
          <div className="border-t border-amber-900/60 p-2 text-[12px] text-amber-800">
            &gt; type a message
          </div>
        </div>
      </div>

      {/* function key footer */}
      <div className="grid shrink-0 grid-cols-6 border-t border-amber-900/60 bg-black text-[11px]">
        {FKEYS.map((k) => (
          <div
            key={k}
            className="border-r border-amber-900/40 px-2 py-1.5 text-center text-amber-600 last:border-r-0"
          >
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}
