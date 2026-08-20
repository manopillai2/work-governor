"use client";

import { useTheme } from "./ThemeProvider";

// A hand-drawn silhouette skyline -- castle, towers, rooftops -- sitting
// at the bottom of the real page content (normal document flow, not
// fixed) so it's always genuinely visible rather than fighting opaque
// cards for the same screen space, with a handful of tiny figures
// wandering along the street line and a few flickering torches. Built
// entirely from SVG shapes and CSS-driven motion, not a fetched photo.
// Renders nothing outside the royal theme.

function Torch({
  left,
  bottom,
  delay,
}: {
  left: string;
  bottom: string;
  delay: number;
}) {
  return (
    <div className="royal-torch" style={{ left, bottom }}>
      <div className="royal-torch__stick" />
      <div
        className="royal-torch__flame"
        style={{ animationDelay: `${delay}s` }}
      />
    </div>
  );
}

const WALKERS = [
  { top: 82, duration: 34, delay: 0, size: 5, dir: 1 },
  { top: 84.5, duration: 46, delay: -8, size: 4, dir: -1 },
  { top: 80, duration: 52, delay: -20, size: 4.5, dir: 1 },
  { top: 86, duration: 38, delay: -5, size: 5, dir: -1 },
  { top: 83.5, duration: 60, delay: -30, size: 4, dir: 1 },
];

const TORCHES = [
  { left: "33%", bottom: "45%", delay: 0 },
  { left: "39.5%", bottom: "36%", delay: -0.4 },
  { left: "46%", bottom: "36%", delay: -0.9 },
  { left: "52%", bottom: "45%", delay: -1.3 },
  { left: "8%", bottom: "30%", delay: -0.6 },
  { left: "85%", bottom: "34%", delay: -1.1 },
];

export default function RoyalSkyline() {
  const { theme } = useTheme();
  if (theme !== "royal") return null;

  return (
    <div className="royal-skyline" aria-hidden="true">
      <svg
        viewBox="0 0 1600 260"
        preserveAspectRatio="none"
        className="royal-skyline__svg"
      >
        <g fill="#100821" opacity="0.92">
          {/* distant rooftops */}
          <polygon points="0,180 60,180 60,140 120,140 120,180 260,180 260,150 300,150 300,180 1600,180 1600,260 0,260" />
          <polygon points="340,180 380,180 380,120 400,100 420,120 420,180 470,180" />
          <polygon points="900,180 940,180 940,110 965,90 990,110 990,180 1040,180" />
          <polygon points="1200,180 1250,180 1250,130 1280,130 1280,180 1340,180" />

          {/* castle */}
          <g transform="translate(560,60)">
            <rect x="0" y="60" width="220" height="120" />
            <rect x="-18" y="20" width="40" height="160" />
            <rect x="198" y="20" width="40" height="160" />
            <rect x="85" y="0" width="50" height="180" />
            <polygon points="-18,20 -18,0 -8,10 2,0 2,20" />
            <polygon points="218,20 218,0 228,10 238,0 238,20" />
            <polygon points="85,0 85,-14 95,-4 105,-14 105,0 115,-14 125,-4 135,0" />
            <rect x="100" y="120" width="20" height="60" fill="#2a1740" opacity="0.9" />
            <rect x="35" y="90" width="14" height="18" fill="#2a1740" opacity="0.8" />
            <rect x="171" y="90" width="14" height="18" fill="#2a1740" opacity="0.8" />
          </g>
        </g>

        <rect x="0" y="180" width="1600" height="80" fill="#0a0512" />
        <line x1="0" y1="180" x2="1600" y2="180" stroke="rgba(212,175,55,0.25)" strokeWidth="1.5" />
      </svg>

      {WALKERS.map((walker, i) => (
        <span
          key={i}
          className="royal-walker"
          style={
            {
              top: `${walker.top}%`,
              width: `${walker.size}px`,
              height: `${walker.size * 1.8}px`,
              animationDuration: `${walker.duration}s`,
              animationDelay: `${walker.delay}s`,
              "--royal-walk-dir": walker.dir,
            } as React.CSSProperties
          }
        />
      ))}

      {TORCHES.map((torch, i) => (
        <Torch
          key={i}
          left={torch.left}
          bottom={torch.bottom}
          delay={torch.delay}
        />
      ))}
    </div>
  );
}
