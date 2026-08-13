// Small directional chevron, replacing raw "‹"/"›" text glyphs so the
// chat-panel collapse/expand controls match the rest of the app's
// stroke-based icon style.
export default function ChevronMiniIcon({
  direction,
}: {
  direction: "left" | "right";
}) {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
      <path
        d={
          direction === "left"
            ? "M6 1L2 5L6 9"
            : "M2 1L6 5L2 9"
        }
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
