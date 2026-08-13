// Shared close/"×" glyph, matching the stroke-based icon style used
// throughout the app instead of a raw "✕" text character.
export default function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path
        d="M1 1L10 10M10 1L1 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
