"use client";

import { useTheme } from "./ThemeProvider";
import { RoyalIcon } from "./RoyalIcon";

// Only meaningful inside the royal theme -- lets you view its jewel-tone
// palette with or without the animated coin rain. Hidden entirely
// outside royal theme, mirroring how RainToggle only appears in dark.
export default function RoyalEffectToggle() {
  const { theme, royalEffectEnabled, toggleRoyalEffect } = useTheme();

  if (theme !== "royal") {
    return null;
  }

  return (
    <button
      onClick={toggleRoyalEffect}
      className="flex items-center gap-1.5 rounded-full border border-[#D4AF37]/50 bg-[#1c0f2e] px-3 py-1.5 text-xs font-semibold text-[#F4CF47] shadow-[0_0_10px_rgba(212,175,55,0.25)] transition hover:bg-[#2a1a44]"
      title={
        royalEffectEnabled
          ? "Remove the coin rain"
          : "Add the coin rain"
      }
    >
      <RoyalIcon name="coin" size={13} color="currentColor" />
      {royalEffectEnabled ? "Remove Rain" : "Add Rain"}
    </button>
  );
}
