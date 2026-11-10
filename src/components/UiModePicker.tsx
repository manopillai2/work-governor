"use client";

// Two-option layout picker (Classic | New UI) for the Guide page, where
// a single "switch" button would be ambiguous about which layout is on.
// Same preference ThemeToggle writes (ThemeProvider, localStorage).

import { useTheme, type UiMode } from "./ThemeProvider";

const OPTIONS: { mode: UiMode; label: string }[] = [
  { mode: "classic", label: "Classic" },
  { mode: "hub", label: "New UI" },
];

export default function UiModePicker({ onDark = false }: { onDark?: boolean }) {
  const { uiMode, setUiMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="App layout"
      className={`inline-flex rounded-lg p-0.5 text-[13px] font-medium ${onDark ? "bg-white/15" : "border border-slate-200 bg-white"}`}
    >
      {OPTIONS.map(({ mode, label }) => {
        const active = uiMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setUiMode(mode)}
            aria-pressed={active}
            className={`rounded-md px-3 py-1 transition ${active ? "" : onDark ? "hover:bg-white/10" : "hover:bg-slate-50"}`}
            // Inline colours: the app's colour layer remaps utility
            // classes like text-white, which would break contrast here.
            style={
              active
                ? onDark
                  ? { background: "#ffffff", color: "#16324a" }
                  : { background: "#0f7d8c", color: "#ffffff" }
                : { color: onDark ? "rgba(255,255,255,0.85)" : "#3c4652" }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
