// Hand-built classic chess/heraldic iconography for the "royal" theme --
// solid single-color (or gradient, for "sword") silhouettes in the spirit
// of a Staunton chess set, not emoji glyphs. Shared between the /royaltheme
// preview page and the real app's royal-themed components so both draw
// from the same source.

export type RoyalIconName =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn"
  | "crown"
  | "swords"
  | "sword"
  | "shield"
  | "throne"
  | "coin"
  | "quill";

export function RoyalIcon({
  name,
  size = 20,
  color = "currentColor",
  glow = false,
}: {
  name: RoyalIconName;
  size?: number;
  color?: string;
  glow?: boolean;
}) {
  const style = glow
    ? { filter: `drop-shadow(0 0 4px ${color})` }
    : undefined;

  switch (name) {
    case "king":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <rect x="15" y="1" width="2" height="4" />
            <rect x="13" y="2.6" width="6" height="1.8" />
            <circle cx="16" cy="8.4" r="1.7" />
            <path d="M10.5 12.8 Q10.5 10.2 16 10.2 Q21.5 10.2 21.5 12.8 L20.2 15.2 L11.8 15.2 Z" />
            <rect x="13.2" y="15.2" width="5.6" height="2.6" />
            <path d="M9 26.6 C9 19.6 12 17.7 16 17.7 C20 17.7 23 19.6 23 26.6 Z" />
            <rect x="7" y="26.6" width="18" height="2.8" rx="1" />
          </g>
        </svg>
      );
    case "queen":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <circle cx="9" cy="8.5" r="1.6" />
            <circle cx="13" cy="6" r="1.6" />
            <circle cx="16" cy="5" r="1.6" />
            <circle cx="19" cy="6" r="1.6" />
            <circle cx="23" cy="8.5" r="1.6" />
            <path d="M8.5 12.8 Q8.5 10 16 10 Q23.5 10 23.5 12.8 L22 15.6 L10 15.6 Z" />
            <rect x="13" y="15.6" width="6" height="2.4" />
            <path d="M8 26.6 C8 19 11.5 17.2 16 17.2 C20.5 17.2 24 19 24 26.6 Z" />
            <rect x="6.5" y="26.6" width="19" height="2.8" rx="1" />
          </g>
        </svg>
      );
    case "rook":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <polygon points="9,10 9,6 12,6 12,8 14,8 14,6 18,6 18,8 20,8 20,6 23,6 23,10" />
            <rect x="10.3" y="10" width="11.4" height="4.4" />
            <path d="M9.5 26.6 C9.5 20.6 11.7 18.6 16 18.6 C20.3 18.6 22.5 20.6 22.5 26.6 Z" />
            <rect x="7.5" y="26.6" width="17" height="2.8" rx="1" />
          </g>
        </svg>
      );
    case "bishop":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <circle cx="16" cy="3.6" r="1.4" />
            <path d="M11 15.4 C11 9.4 13 6.2 16 6.2 C19 6.2 21 9.4 21 15.4 Z" />
            <rect x="14.4" y="15.4" width="3.2" height="2.6" />
            <path d="M9 26.6 C9 20 12 18 16 18 C20 18 23 20 23 26.6 Z" />
            <rect x="7" y="26.6" width="18" height="2.8" rx="1" />
          </g>
        </svg>
      );
    case "knight":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <path
            fill={color}
            d="M9 29 L9 25 C9 22.3 10.1 20.8 11.6 19.8 C10.3 18.4 9.8 16.6 10.1 14.9 C10.5 12.5 12.2 10.2 14.7 9.2 C14.3 8.4 14.5 7.4 15.2 6.8 C16.2 5.9 17.8 6.2 18.5 7.4 C20.6 7.6 22.3 9.3 22.7 11.6 C23 13.1 22.6 14.3 21.7 15 C22.9 15.6 23.6 17 23.6 18.7 L23.6 20.7 L21 20.7 L21 19 C21 18.3 20.5 17.9 19.9 17.9 C19.5 17.9 19.1 18.1 18.8 18.5 L17.6 19.9 L15.7 18.6 L17 16.9 C16.1 17.2 15.2 17.7 14.5 18.4 C13.1 19.7 12.4 21.6 12.4 23.8 L12.4 29 Z"
          />
          <rect x="7" y="29" width="18" height="2" rx="0.5" fill={color} />
        </svg>
      );
    case "pawn":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <circle cx="16" cy="9.4" r="4.2" />
            <path d="M12.4 15.6 L19.6 15.6 L18.4 18.6 L13.6 18.6 Z" />
            <path d="M10 26.6 C10 21.4 12.2 18.8 16 18.8 C19.8 18.8 22 21.4 22 26.6 Z" />
            <rect x="8" y="26.6" width="16" height="2.6" rx="1" />
          </g>
        </svg>
      );
    case "crown":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <path d="M6 12 L9.5 23 L22.5 23 L26 12 L19.5 17 L16 8.4 L12.5 17 Z" />
            <rect x="8" y="23" width="16" height="4" rx="1" />
            <circle cx="6" cy="11" r="1.6" />
            <circle cx="16" cy="7" r="1.7" />
            <circle cx="26" cy="11" r="1.6" />
          </g>
        </svg>
      );
    case "swords":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          stroke={color}
          style={style}
          aria-hidden="true"
        >
          <line
            x1="6"
            y1="27"
            x2="25"
            y2="6"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <line
            x1="8.6"
            y1="21.8"
            x2="12.2"
            y2="19"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="6" cy="27" r="1.7" fill={color} stroke="none" />

          <line
            x1="26"
            y1="27"
            x2="7"
            y2="6"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <line
            x1="23.4"
            y1="21.8"
            x2="19.8"
            y2="19"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="26" cy="27" r="1.7" fill={color} stroke="none" />
        </svg>
      );
    case "sword":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sword-blade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8fa3b3" />
              <stop offset="35%" stopColor="#f4f8fb" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#f4f8fb" />
              <stop offset="100%" stopColor="#8fa3b3" />
            </linearGradient>
            <linearGradient id="sword-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f4cf47" />
              <stop offset="100%" stopColor="#a9791a" />
            </linearGradient>
            <radialGradient id="sword-gem" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#9fe3ff" />
              <stop offset="45%" stopColor="#2f8fd6" />
              <stop offset="100%" stopColor="#134d80" />
            </radialGradient>
          </defs>
          <g
            transform="rotate(-20 16 16)"
            stroke="#12202b"
            strokeWidth="0.7"
            strokeLinejoin="round"
          >
            {/* fullered, tapered blade */}
            <polygon
              points="16,0 17.6,3.5 17,17 15,17 14.4,3.5"
              fill="url(#sword-blade)"
            />
            <line
              x1="16"
              y1="3"
              x2="16"
              y2="16.2"
              stroke="#5c7080"
              strokeWidth="0.5"
              opacity="0.5"
            />
            <line
              x1="16"
              y1="3"
              x2="16"
              y2="16.2"
              stroke="url(#sword-gold)"
              strokeWidth="0.35"
              opacity="0.65"
              transform="translate(0.9,0)"
            />

            {/* fleur-de-lis crossguard, curling outward on both sides */}
            <path
              d="M16 15.5
                 C14.5 17.5 12 17.8 9.5 17.3
                 C7 16.8 4.5 17.8 3.5 20.5
                 C5.5 19.6 7.8 19.3 9 18
                 C8.3 20 7 21.5 4.8 22.3
                 C8 22.6 11.5 20.8 12.8 18.3
                 C13.6 19.2 14.7 19.7 16 19.7
                 C17.3 19.7 18.4 19.2 19.2 18.3
                 C20.5 20.8 24 22.6 27.2 22.3
                 C25 21.5 23.7 20 23 18
                 C24.2 19.3 26.5 19.6 28.5 20.5
                 C27.5 17.8 25 16.8 22.5 17.3
                 C20 17.8 17.5 17.5 16 15.5 Z"
              fill="url(#sword-gold)"
            />
            <rect
              x="14"
              y="19.3"
              width="4"
              height="1.5"
              rx="0.4"
              fill="url(#sword-gold)"
            />

            {/* navy leather grip, gold wire wrap */}
            <rect
              x="14.5"
              y="20.6"
              width="3"
              height="6.4"
              rx="1"
              fill="#1c2b52"
            />
            <line x1="14.5" y1="22" x2="17.5" y2="22" stroke="url(#sword-gold)" strokeWidth="0.65" />
            <line x1="14.5" y1="23.6" x2="17.5" y2="23.6" stroke="url(#sword-gold)" strokeWidth="0.65" />
            <line x1="14.5" y1="25.2" x2="17.5" y2="25.2" stroke="url(#sword-gold)" strokeWidth="0.65" />

            {/* flame-shaped pommel with an inset sapphire */}
            <path
              d="M16 26.8
                 C17.4 27.3 18.2 28.6 17.9 30
                 C17.6 31 16.9 31.6 16 31.7
                 C15.1 31.6 14.4 31 14.1 30
                 C13.8 28.6 14.6 27.3 16 26.8 Z"
              fill="url(#sword-gold)"
            />
            <path
              d="M16 27.7
                 C16.8 28 17.2 28.7 17 29.5
                 C16.8 30.1 16.4 30.5 16 30.6
                 C15.6 30.5 15.2 30.1 15 29.5
                 C14.8 28.7 15.2 28 16 27.7 Z"
              fill="url(#sword-gem)"
              strokeWidth="0.35"
            />
          </g>
        </svg>
      );
    case "coin":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <circle
            cx="16"
            cy="16"
            r="13.5"
            fill={color}
            stroke="#8a6d16"
            strokeWidth="1.4"
          />
          <circle
            cx="16"
            cy="16"
            r="9.5"
            fill="none"
            stroke="#8a6d16"
            strokeWidth="1"
            opacity="0.55"
          />
          <path
            fill="#8a6d16"
            opacity="0.85"
            d="M16 9.5 L18 12 L16 21 L14 12 Z"
          />
        </svg>
      );
    case "shield":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <path
            fill={color}
            d="M16 3 L25.5 6.4 L25.5 15.2 C25.5 21.4 21.6 26.2 16 29 C10.4 26.2 6.5 21.4 6.5 15.2 L6.5 6.4 Z"
          />
          <rect
            x="15"
            y="9"
            width="2"
            height="13"
            fill="#000"
            opacity="0.16"
          />
          <rect
            x="9.5"
            y="14.5"
            width="13"
            height="2"
            fill="#000"
            opacity="0.16"
          />
        </svg>
      );
    case "throne":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={style}
          aria-hidden="true"
        >
          <g fill={color}>
            <circle cx="8" cy="4" r="1.4" />
            <circle cx="16" cy="2.4" r="1.6" />
            <circle cx="24" cy="4" r="1.4" />
            <rect x="7" y="6" width="2" height="14.4" />
            <rect x="15" y="4.4" width="2" height="16" />
            <rect x="23" y="6" width="2" height="14.4" />
            <rect x="6" y="20.4" width="20" height="3" rx="1" />
            <rect x="7" y="23.4" width="2.4" height="6" />
            <rect x="22.6" y="23.4" width="2.4" height="6" />
          </g>
        </svg>
      );
    case "quill":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
          aria-hidden="true"
        >
          <path d="M25 5 C18 7 11 14 8 23 L6 27 L10 25 C17 21 23 15 26 8 Z" />
          <path d="M8 23 L20 11" />
        </svg>
      );
    default:
      return null;
  }
}

// A single hand-drawn filigree flourish -- a traced corner border, an
// echoing inner arc, a small curling vine, and three jeweled dots --
// oriented for the top-left corner by default; the other three
// corners reuse this exact SVG, just flipped via CSS transform on the
// positioned wrapper (see .royal-corner--tr/bl/br in globals.css), so
// there's only one shape to draw and keep in sync.
function FiligreeCornerSvg({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path
        d="M2 20 L2 6 C2 3.5 3.5 2 6 2 L20 2"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M2 12.5 C2 7 7 2 12.5 2"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M2 7.5 C4.8 7.5 7.5 4.8 7.5 2"
        fill="none"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <circle cx="2" cy="2" r="1.7" fill={color} />
      <circle cx="9.5" cy="2" r="0.9" fill={color} opacity="0.85" />
      <circle cx="2" cy="9.5" r="0.9" fill={color} opacity="0.85" />
    </svg>
  );
}

// Four ornate corner flourishes -- decorates the scroll-card frame
// used throughout the royal theme, echoing the traced-border-and-vine
// corners on an illuminated decree. Parent must be position:relative
// and carry the .royal-corner-frame styles (see globals.css) for
// these to sit correctly. Color defaults to gold; pass a tone to
// match a scroll's nesting level (e.g. crimson for a top-level
// control, emerald for a nested section within it).
export function RoyalCardCorners({
  color = "#d4af37",
}: {
  color?: string;
}) {
  return (
    <>
      <span
        className="royal-corner royal-corner--tl"
        aria-hidden="true"
      >
        <FiligreeCornerSvg color={color} />
      </span>
      <span
        className="royal-corner royal-corner--tr"
        aria-hidden="true"
      >
        <FiligreeCornerSvg color={color} />
      </span>
      <span
        className="royal-corner royal-corner--bl"
        aria-hidden="true"
      >
        <FiligreeCornerSvg color={color} />
      </span>
      <span
        className="royal-corner royal-corner--br"
        aria-hidden="true"
      >
        <FiligreeCornerSvg color={color} />
      </span>
    </>
  );
}
