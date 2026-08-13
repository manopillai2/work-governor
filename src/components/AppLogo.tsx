// The app's mark -- a shield with a checkmark, the standard visual
// shorthand for "verified/compliant" -- filled with the same
// blue-to-indigo gradient as the "Control Governor" wordmark next to
// it, so the two read as one consistent brand unit. Kept as a single
// gradient fill (not theme-conditional) since it reads fine against
// both the light header and the dark canvas.
export default function AppLogo({
  size = 24,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="app-logo-gradient"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5L3.5 4.75V11c0 6.08 3.64 10.72 8.5 11.5 4.86-0.78 8.5-5.42 8.5-11.5V4.75L12 1.5Z"
        fill="url(#app-logo-gradient)"
      />
      <path
        d="M8 12.3l2.7 2.7L16.3 9"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
