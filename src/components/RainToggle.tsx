"use client";

import { useTheme } from "./ThemeProvider";

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
      <span>{rainEffectEnabled ? "🌂" : "🌧"}</span>
      {rainEffectEnabled ? "Remove Rain" : "Add Rain"}
    </button>
  );
}
