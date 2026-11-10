"use client";

// Switches between the Classic layout and the New UI (Compliance Hub)
// layout. Persisted in localStorage by ThemeProvider.

import { useTheme } from "./ThemeProvider";

function SwapIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { uiMode, setUiMode } = useTheme();
  const isHub = uiMode === "hub";

  return (
    <button
      type="button"
      onClick={() => setUiMode(isHub ? "classic" : "hub")}
      className={
        isHub
          ? "flex items-center gap-1.5 rounded-md border border-[#dfe4ea] bg-white px-2.5 py-1 text-[12.5px] font-medium text-[#3c4652] transition hover:bg-[#f4f6f8]"
          : "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
      }
      title={isHub ? "Switch back to the classic layout" : "Switch to the new Compliance Hub layout"}
    >
      <SwapIcon />
      {isHub ? "Classic UI" : "Try new UI"}
    </button>
  );
}
