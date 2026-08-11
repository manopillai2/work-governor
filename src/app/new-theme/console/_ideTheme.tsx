"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../_data";

export type IdeColors = {
  bg: string;
  sidebarBg: string;
  activityBarBg: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  tabActiveBg: string;
  keyword: string;
  identifier: string;
  string: string;
  comment: string;
  statusCompleted: string;
  statusInProgress: string;
  statusNotStarted: string;
  statusNeedsAttention: string;
  statusBarBg: string;
  chatUserBg: string;
};

export default function IdeThemePreview({
  title,
  colors: c,
}: {
  title: string;
  colors: IdeColors;
}) {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  const statusColor: Record<string, string> = {
    Completed: c.statusCompleted,
    "In Progress": c.statusInProgress,
    "Not Started": c.statusNotStarted,
    "Needs Attention": c.statusNeedsAttention,
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden font-mono text-[13px]"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <div
        className="flex w-11 shrink-0 flex-col items-center gap-4 border-r py-3"
        style={{
          backgroundColor: c.activityBarBg,
          borderColor: c.border,
          color: c.textDim,
        }}
      >
        <span className="text-lg">▤</span>
        <span className="text-lg" style={{ color: c.text }}>
          ◧
        </span>
        <span className="text-lg">⚙</span>
      </div>

      <div
        className="flex w-56 shrink-0 flex-col border-r"
        style={{ backgroundColor: c.sidebarBg, borderColor: c.border }}
      >
        <div
          className="px-3 py-2 text-[11px] uppercase tracking-wide"
          style={{ color: c.textDim }}
        >
          Control Governor
        </div>
        <div
          className="px-3 py-1 text-[11px] font-bold uppercase"
          style={{ color: c.text }}
        >
          Applications
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {APPLICATIONS.map((app) => (
            <div
              key={app.name}
              className="flex items-center gap-1.5 px-3 py-1"
              style={{ color: c.text }}
            >
              <span style={{ color: c.identifier }}>▸</span>
              <span className="truncate">{app.name}</span>
            </div>
          ))}
        </div>
        <Link
          href="/new-theme/console"
          className="border-t px-3 py-2 text-[11px] hover:opacity-80"
          style={{ borderColor: c.border, color: c.textDim }}
        >
          ← all console styles
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="flex h-9 shrink-0 items-center border-b text-[12px]"
          style={{ borderColor: c.border, backgroundColor: c.sidebarBg }}
        >
          <div
            className="flex h-full items-center gap-2 border-r px-3"
            style={{
              backgroundColor: c.tabActiveBg,
              borderColor: c.border,
              color: c.text,
            }}
          >
            applications.controls.ts
          </div>
          <div
            className="flex h-full items-center gap-2 border-r px-3"
            style={{ borderColor: c.border, color: c.textDim }}
          >
            ai-assistant.tsx
          </div>
        </div>
        <div
          className="flex h-6 shrink-0 items-center gap-1 border-b px-3 text-[11px]"
          style={{ borderColor: c.border, color: c.textDim }}
        >
          <span>control-governor</span>
          <span>›</span>
          <span>applications</span>
          <span>›</span>
          <span style={{ color: c.text }}>{title}</span>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-1">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:opacity-90"
                  >
                    <span style={{ color: c.textDim }}>
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <span style={{ color: c.identifier }}>{app.name}</span>
                    <span style={{ color: c.comment }}>
                      // {app.framework}, {app.completed}/{app.controls} done
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div
                      className="ml-6 border-l pl-3"
                      style={{ borderColor: c.border }}
                    >
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1"
                        >
                          <span className="min-w-0 truncate">
                            <span style={{ color: c.keyword }}>const</span>{" "}
                            <span style={{ color: c.identifier }}>
                              {control.code}
                            </span>
                            <span style={{ color: c.text }}> = &quot;</span>
                            <span style={{ color: c.string }}>
                              {control.title}
                            </span>
                            <span style={{ color: c.text }}>&quot;</span>
                          </span>
                          <span
                            className="shrink-0 text-[11px] font-semibold"
                            style={{ color: statusColor[control.status] }}
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

          <div
            className="flex w-72 shrink-0 flex-col border-l"
            style={{ borderColor: c.border, backgroundColor: c.sidebarBg }}
          >
            <div
              className="border-b px-3 py-2 text-[11px] uppercase"
              style={{ borderColor: c.border, color: c.textDim }}
            >
              AI Assistant
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {CHAT_MESSAGES.map((msg, i) => (
                <div
                  key={i}
                  className="rounded px-2 py-1.5 text-[12px] leading-5"
                  style={{
                    backgroundColor:
                      msg.from === "ai" ? c.tabActiveBg : c.chatUserBg,
                    color: c.text,
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="border-t p-2" style={{ borderColor: c.border }}>
              <div
                className="rounded border px-2 py-1.5 text-[12px]"
                style={{
                  borderColor: c.border,
                  backgroundColor: c.bg,
                  color: c.textDim,
                }}
              >
                Type a message…
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex h-6 shrink-0 items-center justify-between px-3 text-[11px] text-white"
          style={{ backgroundColor: c.statusBarBg }}
        >
          <span>CORE / SOX</span>
          <span>3 applications · 23 controls</span>
        </div>
      </div>
    </div>
  );
}
