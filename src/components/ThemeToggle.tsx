"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isRain = theme === "rain";

  return (
    <button
      onClick={() => setTheme(isRain ? "default" : "rain")}
      className="fixed right-3 top-3 z-[200] flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 rain:border-[#0aff41]/40 rain:bg-black rain:text-[#8affc0] rain:shadow-[0_0_10px_rgba(10,255,65,0.15)] rain:hover:bg-[#0aff41]/10"
      title={isRain ? "Switch to default theme" : "Switch to digital rain theme"}
    >
      <span>{isRain ? "🌧" : "☀️"}</span>
      {isRain ? "Rain" : "Default"}
    </button>
  );
}
