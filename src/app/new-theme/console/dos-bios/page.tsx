"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_COLOR: Record<string, string> = {
  Completed: "text-[#55ff55]",
  "In Progress": "text-[#ffff55]",
  "Not Started": "text-[#aaaaaa]",
  "Needs Attention": "text-[#ff5555]",
};

export default function DosBiosPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0000aa] p-4 font-mono text-sm text-white">
      <div className="mb-2 flex shrink-0 items-center justify-between border border-white px-3 py-1">
        <span className="text-[#ffff55]">
          CONTROL GOVERNOR SETUP UTILITY (C) 1998
        </span>
        <Link
          href="/new-theme/console"
          className="text-[#00aaaa] hover:text-white"
        >
          [ESC] Back to console styles
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col border border-white">
          <div className="border-b border-white bg-white px-3 py-0.5 text-[#0000aa]">
            APPLICATIONS ({APPLICATIONS.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-2">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className={`flex w-full items-center justify-between gap-4 px-2 py-1 text-left ${
                      isOpen ? "bg-[#00aaaa] text-black" : "hover:bg-white/10"
                    }`}
                  >
                    <span>
                      {isOpen ? "►" : " "} {app.name} [{app.framework}]
                    </span>
                    <span className="shrink-0">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="mt-1 space-y-1 border border-white/40 px-2 py-2">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="min-w-0 truncate">
                            {control.code} - {control.title}
                          </span>
                          <span
                            className={`shrink-0 font-bold ${STATUS_COLOR[control.status]}`}
                          >
                            &lt;{control.status}&gt;
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex w-72 shrink-0 flex-col border border-white">
          <div className="border-b border-white bg-white px-3 py-0.5 text-[#0000aa]">
            AI ASSISTANT
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {CHAT_MESSAGES.map((msg, i) => (
              <p key={i}>
                <span className="text-[#ffff55]">
                  {msg.from === "ai" ? "AI:" : "YOU:"}
                </span>{" "}
                {msg.text}
              </p>
            ))}
          </div>
          <div className="border-t border-white px-3 py-1 text-[#aaaaaa]">
            &gt; type a message_
          </div>
        </div>
      </div>

      <div className="mt-2 flex shrink-0 justify-center gap-6 border border-white bg-white px-3 py-1 text-[#0000aa]">
        <span>F1=Help</span>
        <span>F5=Refresh</span>
        <span>F10=Save</span>
        <span>ESC=Exit</span>
        <span>↑↓=Navigate</span>
        <span>ENTER=Select</span>
      </div>
    </div>
  );
}
