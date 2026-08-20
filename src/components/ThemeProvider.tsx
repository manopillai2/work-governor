"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "royal";

const THEME_STORAGE_KEY = "control-governor-theme";
const RAIN_STORAGE_KEY = "control-governor-rain-effect";
const ROYAL_EFFECT_STORAGE_KEY = "control-governor-royal-effect";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  rainEffectEnabled: boolean;
  toggleRainEffect: () => void;
  royalEffectEnabled: boolean;
  toggleRoyalEffect: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [rainEffectEnabled, setRainEffectEnabled] = useState(false);
  const [royalEffectEnabled, setRoyalEffectEnabled] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "royal"
    ) {
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

    const storedRoyalEffect = window.localStorage.getItem(
      ROYAL_EFFECT_STORAGE_KEY
    );
    if (storedRoyalEffect === "on") {
      setRoyalEffectEnabled(true);
    } else if (storedRoyalEffect === null && storedTheme === "royal") {
      setRoyalEffectEnabled(true);
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

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-royal-effect",
      royalEffectEnabled ? "on" : "off"
    );
    window.localStorage.setItem(
      ROYAL_EFFECT_STORAGE_KEY,
      royalEffectEnabled ? "on" : "off"
    );
  }, [royalEffectEnabled]);

  // Switching into the dark theme also turns the rain animation on, and
  // switching into royal turns the coin-rain effect on -- each theme's
  // own effect flag, kept independent so entering one theme never
  // silently flips the other theme's effect toggle. Switching away
  // leaves each flag as the user last set it via its own toggle button.
  function setTheme(next: Theme) {
    setThemeState(next);
    if (next === "dark") {
      setRainEffectEnabled(true);
    }
    if (next === "royal") {
      setRoyalEffectEnabled(true);
    }
  }

  function toggleRainEffect() {
    setRainEffectEnabled((current) => !current);
  }

  function toggleRoyalEffect() {
    setRoyalEffectEnabled((current) => !current);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        rainEffectEnabled,
        toggleRainEffect,
        royalEffectEnabled,
        toggleRoyalEffect,
      }}
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
