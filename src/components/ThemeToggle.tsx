"use client";

import { useTheme, type Theme } from "./ThemeProvider";
import { RoyalIcon } from "./RoyalIcon";

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle
        cx="7"
        cy="7"
        r="3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7 0.5V2M7 12V13.5M13.5 7H12M2 7H0.5M11.5 2.5L10.5 3.5M3.5 10.5L2.5 11.5M11.5 11.5L10.5 10.5M3.5 3.5L2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path
        d="M12.5 8.75A5.5 5.5 0 1 1 5.25 1.5a4.5 4.5 0 0 0 7.25 7.25Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// light -> dark -> royal -> light
const NEXT_THEME: Record<Theme, Theme> = {
  light: "dark",
  dark: "royal",
  royal: "light",
};

const THEME_LABEL: Record<Theme, string> = {
  light: "light theme",
  dark: "dark theme",
  royal: "royal theme",
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(NEXT_THEME[theme])}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-[#0aff41]/40 dark:bg-black dark:text-[#8affc0] dark:shadow-[0_0_10px_rgba(10,255,65,0.15)] dark:hover:bg-[#0aff41]/10 royal:border-[#D4AF37]/50 royal:bg-[#1c0f2e] royal:text-[#F4CF47] royal:shadow-[0_0_10px_rgba(212,175,55,0.25)] royal:hover:bg-[#2a1a44]"
      title={`Switch to ${THEME_LABEL[NEXT_THEME[theme]]}`}
    >
      {theme === "dark" ? (
        <MoonIcon />
      ) : theme === "royal" ? (
        <RoyalIcon name="crown" size={13} color="currentColor" />
      ) : (
        <SunIcon />
      )}
      Change Theme
    </button>
  );
}
