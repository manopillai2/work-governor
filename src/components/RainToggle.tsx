"use client";

import { useTheme } from "./ThemeProvider";

function DropletIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="13" viewBox="0 0 14 15" fill="none">
      <path
        d="M7 1.5C7 1.5 2.5 7.7 2.5 10.6A4.5 4.5 0 0 0 11.5 10.6C11.5 7.7 7 1.5 7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.35 : 0}
      />
    </svg>
  );
}

// Only meaningful inside the dark theme -- lets you view its dark green
// palette with or without the animated rain. Hidden entirely in the
// light theme, which doesn't support the rain effect at all.
export default function RainToggle() {
  const { theme, rainEffectEnabled, toggleRainEffect } = useTheme();

  if (theme !== "dark") {
    return null;
  }

  return (
    <button
      onClick={toggleRainEffect}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-[#0aff41]/40 dark:bg-black dark:text-[#8affc0] dark:shadow-[0_0_10px_rgba(10,255,65,0.15)] dark:hover:bg-[#0aff41]/10"
      title={
        rainEffectEnabled
          ? "Remove the rain effect"
          : "Add the rain effect"
      }
    >
      <DropletIcon filled={rainEffectEnabled} />
      {rainEffectEnabled ? "Remove Rain" : "Add Rain"}
    </button>
  );
}
