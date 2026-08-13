// Shared three-line menu glyph, replacing the raw "☰" character
// everywhere it's used as a menu/filter trigger icon.
export default function HamburgerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M1 3h12M3.5 7h7M6 11h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
