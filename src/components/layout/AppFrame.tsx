"use client";

// Page frame shared by "/" and "/applications": the classic header
// layout, or the New UI (Compliance Hub) sidebar shell, depending on
// the UI switch (see ThemeProvider / ThemeToggle).

import type { ReactNode } from "react";

import Header from "@/components/layout/Header";
import HubShell from "@/components/hub/HubShell";
import { useTheme } from "@/components/ThemeProvider";
import { useAppState } from "@/components/AppStateProvider";

type Progress = ReturnType<typeof useAppState>["progress"];

export default function AppFrame({
  title,
  progress,
  children,
}: {
  title: string;
  progress?: Progress;
  children: ReactNode;
}) {
  const { uiMode } = useTheme();

  if (uiMode === "hub") {
    return (
      <HubShell title={title} progress={progress}>
        {children}
      </HubShell>
    );
  }

  return (
    <main className="app-canvas-bg flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="shrink-0">
        <Header progress={progress} />
      </div>
      {children}
    </main>
  );
}
