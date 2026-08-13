"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "control-governor-theme";
const RAIN_STORAGE_KEY = "control-governor-rain-effect";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  rainEffectEnabled: boolean;
  toggleRainEffect: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [rainEffectEnabled, setRainEffectEnabled] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      setThemeState(storedTheme);
    }

    const storedRain = window.localStorage.getItem(RAIN_STORAGE_KEY);
    if (storedRain === "on") {
      setRainEffectEnabled(true);
    } else if (storedRain === null && storedTheme === "dark") {
      // First time this key exists: match the dark theme's historical
      // behavior of always showing the rain animation.
      setRainEffectEnabled(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-rain",
      rainEffectEnabled ? "on" : "off"
    );
    window.localStorage.setItem(
      RAIN_STORAGE_KEY,
      rainEffectEnabled ? "on" : "off"
    );
  }, [rainEffectEnabled]);

  // Switching into the dark theme also turns the rain animation on,
  // matching how the theme behaved before the two were split apart --
  // switching back to light leaves the animation as the user last set
  // it via the independent rain toggle, rather than forcing it off.
  function setTheme(next: Theme) {
    setThemeState(next);
    if (next === "dark") {
      setRainEffectEnabled(true);
    }
  }

  function toggleRainEffect() {
    setRainEffectEnabled((current) => !current);
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, rainEffectEnabled, toggleRainEffect }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
