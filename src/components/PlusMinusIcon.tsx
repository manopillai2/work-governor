// Shared expand/collapse glyph, replacing the raw "+"/"−" text
// characters so every expand/collapse control in the app uses the
// same stroke-based icon style as the chevrons and hamburger glyphs.
export default function PlusMinusIcon({
  expanded,
}: {
  expanded: boolean;
}) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1 5H9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {!expanded ? (
        <path
          d="M5 1V9"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
