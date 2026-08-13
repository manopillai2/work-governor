"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-[#0aff41]/40 dark:bg-black dark:text-[#8affc0] dark:shadow-[0_0_10px_rgba(10,255,65,0.15)] dark:hover:bg-[#0aff41]/10"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span>{isDark ? "🌙" : "☀️"}</span>
      Change Theme
    </button>
  );
}
