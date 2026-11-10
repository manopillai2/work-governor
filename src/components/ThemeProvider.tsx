"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

// The app has one colour theme (light) and two UI layouts:
// "classic" -- the original header + control list layout, and
// "hub"     -- the newer Compliance Hub layout (sidebar shell, teal
//              accent, card grid), styled under [data-ui="hub"].
// `theme` stays on the context (always "light") so existing
// theme-aware component code keeps compiling.
export type Theme = "light";
export type UiMode = "classic" | "hub";

const UI_MODE_STORAGE_KEY = "control-governor-ui";
const UI_MODE_EVENT = "control-governor-ui-change";

function readUiMode(): UiMode {
  try {
    return window.localStorage.getItem(UI_MODE_STORAGE_KEY) === "hub" ? "hub" : "classic";
  } catch {
    return "classic";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(UI_MODE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(UI_MODE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setUiMode(mode: UiMode) {
  try {
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  } catch {}
  window.dispatchEvent(new Event(UI_MODE_EVENT));
}

const ThemeContext = createContext<{
  theme: Theme;
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const uiMode = useSyncExternalStore(subscribe, readUiMode, () => "classic" as UiMode);

  useEffect(() => {
    // Dark/royal themes were removed -- always render the light theme
    // and drop their old saved preferences.
    document.documentElement.setAttribute("data-theme", "light");
    try {
      window.localStorage.removeItem("control-governor-theme");
      window.localStorage.removeItem("control-governor-rain-effect");
      window.localStorage.removeItem("control-governor-royal-effect");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui", uiMode);
  }, [uiMode]);

  return (
    <ThemeContext.Provider value={{ theme: "light", uiMode, setUiMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
