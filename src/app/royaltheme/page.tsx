// ======================================================
// Route   : /royaltheme
// Purpose : Preview of the actual Control Governor screen
//           (dashboard, controls, checklist, AI panel)
//           restyled as an atmospheric "royal court" game
//           UI -- parchment scroll panels floating over a
//           dark, glowing throne-room backdrop, with hand-
//           built classic chess/heraldic iconography (no
//           emoji glyphs). Static mock data only -- not
//           wired to the real app and not applied anywhere
//           else.
// ======================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import {
  RoyalIcon,
  RoyalCardCorners,
  type RoyalIconName as IconName,
} from "@/components/RoyalIcon";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-royal-display",
});

const garamond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-royal-body",
});


type Coin = {
  x: number;
  y: number;
  size: number;
  speed: number;
  swayAmplitude: number;
  swayFrequency: number;
  spin: number;
  spinSpeed: number;
  opacity: number;
  burst?: boolean;
  vx?: number;
  vy?: number;
  originY?: number;
};

function createCoin(width: number, height: number, atStart = false): Coin {
  return {
    x: Math.random() * width,
    y: atStart ? Math.random() * height : -20 - Math.random() * 40,
    size: 5 + Math.random() * 6,
    speed: 30 + Math.random() * 45,
    swayAmplitude: 8 + Math.random() * 18,
    swayFrequency: 0.4 + Math.random() * 0.6,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: 1.5 + Math.random() * 2.5,
    opacity: 0.55 + Math.random() * 0.4,
  };
}

// A coin "popped" outward from a click -- launched with an upward/
// sideways burst, falls under gravity, then converts into an ordinary
// ambient raindrop once it's back below its launch height so it joins
// the rest of the falling coins instead of just vanishing.
function createBurstCoin(x: number, y: number): Coin {
  const angle = Math.PI + Math.random() * Math.PI; // upward-ish arc
  const power = 140 + Math.random() * 200;
  return {
    x,
    y,
    size: 4.5 + Math.random() * 5,
    speed: 0,
    swayAmplitude: 0,
    swayFrequency: 0,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: 5 + Math.random() * 5,
    opacity: 0.85 + Math.random() * 0.15,
    burst: true,
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power - 60,
    originY: y,
  };
}

// Falling gold coins -- a canvas particle loop, same shape as the app's
// own MatrixRainBackground.tsx (drop model, requestAnimationFrame loop,
// resize handling) but drawn as spinning coin discs instead of light
// streaks. Skips animating entirely when the user prefers reduced
// motion; still renders a few static coins so "enabled" isn't silently
// a no-op.
function CoinRain({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const coins: Coin[] = Array.from(
      { length: Math.max(14, Math.floor(width / 90)) },
      () => createCoin(width, height, true)
    );
    const MAX_COINS = 160;

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Any button or link click pops a small burst of coins from that
    // spot -- they arc outward under gravity, then join the ordinary
    // falling rain once they drop back below launch height.
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest("button, a")) return;

      const count = 8 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        coins.push(createBurstCoin(e.clientX, e.clientY));
      }
      if (coins.length > MAX_COINS) {
        coins.splice(0, coins.length - MAX_COINS);
      }
    }
    document.addEventListener("click", handleClick);

    function drawCoin(coin: Coin, elapsed: number) {
      const sway = coin.burst
        ? 0
        : Math.sin(elapsed * coin.swayFrequency + coin.x) *
          coin.swayAmplitude;
      const x = coin.x + sway;
      const scaleX = Math.max(0.18, Math.abs(Math.cos(coin.spin)));

      const gradient = ctx!.createLinearGradient(
        x - coin.size * scaleX,
        coin.y,
        x + coin.size * scaleX,
        coin.y
      );
      gradient.addColorStop(0, `rgba(140,105,20,${coin.opacity})`);
      gradient.addColorStop(0.5, `rgba(244,207,71,${coin.opacity})`);
      gradient.addColorStop(1, `rgba(140,105,20,${coin.opacity})`);

      ctx!.beginPath();
      ctx!.ellipse(
        x,
        coin.y,
        coin.size * scaleX,
        coin.size,
        0,
        0,
        Math.PI * 2
      );
      ctx!.fillStyle = gradient;
      ctx!.fill();
      ctx!.lineWidth = 0.8;
      ctx!.strokeStyle = `rgba(90,66,10,${coin.opacity * 0.8})`;
      ctx!.stroke();

      if (scaleX > 0.6) {
        ctx!.beginPath();
        ctx!.ellipse(
          x,
          coin.y,
          coin.size * scaleX * 0.55,
          coin.size * 0.55,
          0,
          0,
          Math.PI * 2
        );
        ctx!.strokeStyle = `rgba(90,66,10,${coin.opacity * 0.6})`;
        ctx!.lineWidth = 0.6;
        ctx!.stroke();
      }
    }

    let frame: number;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = now / 1000;

      ctx.clearRect(0, 0, width, height);

      for (const coin of coins) {
        drawCoin(coin, elapsed);

        if (!reduceMotion) {
          coin.spin += coin.spinSpeed * dt;

          if (coin.burst) {
            const GRAVITY = 600;
            coin.vx = (coin.vx ?? 0) * (1 - 0.6 * dt);
            coin.vy = (coin.vy ?? 0) + GRAVITY * dt;
            coin.x += coin.vx * dt;
            coin.y += coin.vy * dt;

            if (
              (coin.vy ?? 0) > 0 &&
              coin.y >= (coin.originY ?? coin.y)
            ) {
              coin.burst = false;
              coin.speed = 45 + Math.random() * 40;
              coin.swayAmplitude = 8 + Math.random() * 18;
              coin.swayFrequency = 0.4 + Math.random() * 0.6;
            }
          } else {
            coin.y += coin.speed * dt;
          }
        }

        if (coin.y - coin.size > height) {
          Object.assign(coin, createCoin(width, height));
        }
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", handleClick);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="royal-coin-rain"
      aria-hidden="true"
    />
  );
}

// A hand-drawn silhouette skyline -- castle, towers, rooftops -- fixed
// to the bottom of the viewport, with a handful of tiny figures
// wandering back and forth along the street line for a "living world"
// feel. Built entirely from SVG shapes and CSS-driven motion, not a
// fetched photo.
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

function CastleSkyline() {
  const walkers = [
    { top: 82, duration: 34, delay: 0, size: 5, dir: 1 },
    { top: 84.5, duration: 46, delay: -8, size: 4, dir: -1 },
    { top: 80, duration: 52, delay: -20, size: 4.5, dir: 1 },
    { top: 86, duration: 38, delay: -5, size: 5, dir: -1 },
    { top: 83.5, duration: 60, delay: -30, size: 4, dir: 1 },
  ];

  const torches = [
    { left: "33%", bottom: "45%", delay: 0 },
    { left: "39.5%", bottom: "36%", delay: -0.4 },
    { left: "46%", bottom: "36%", delay: -0.9 },
    { left: "52%", bottom: "45%", delay: -1.3 },
    { left: "8%", bottom: "30%", delay: -0.6 },
    { left: "85%", bottom: "34%", delay: -1.1 },
  ];

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

      {walkers.map((walker, i) => (
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

      {torches.map((torch, i) => (
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

// Replaces the native pointer with a swaying, glowing sword that
// tracks the mouse (position set imperatively via ref, not React
// state, so it stays smooth at 60fps) and slashes on click. Skipped
// entirely on touch/coarse-pointer devices.
function AnimatedCursor({ onReady }: { onReady: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const wrap = wrapRef.current;
    if (!wrap) return;

    let activeTimeout: number | undefined;
    let readyFired = false;

    function handleMove(e: MouseEvent) {
      if (!wrap) return;
      // The blade is tilted ~20deg to the left (a natural right-handed
      // grip, not dead vertical) -- its tip sits at roughly (33%, 3%)
      // of the 32px icon box, not the box's center, so the offset
      // anchors that tip (not the icon's bounding-box middle) to the
      // cursor.
      wrap.style.transform = `translate(${e.clientX - 10.5}px, ${e.clientY - 1}px)`;
      wrap.style.opacity = "1";
      // Only swap away from the static CSS fallback cursor once the
      // animated one is confirmed actually tracking the mouse -- if
      // this effect never fires (blocked script, no pointer:fine
      // match, etc.) the plain CSS cursor stays put instead of the
      // page silently going cursor-less.
      if (!readyFired) {
        readyFired = true;
        onReady();
      }
    }
    function handleLeave() {
      if (wrap) wrap.style.opacity = "0";
    }
    function handleDown() {
      setActive(true);
      window.clearTimeout(activeTimeout);
      activeTimeout = window.setTimeout(() => setActive(false), 220);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleDown);
    document.documentElement.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleDown);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
      window.clearTimeout(activeTimeout);
    };
  }, [onReady]);

  return (
    <div ref={wrapRef} className="royal-cursor" aria-hidden="true">
      <div
        className={`royal-cursor__inner ${active ? "royal-cursor__inner--active" : ""}`}
      >
        <div className="royal-cursor__glow">
          <RoyalIcon name="sword" size={32} />
        </div>
      </div>
    </div>
  );
}

type Status = "Not Started" | "In Progress" | "Completed" | "Needs Attention";

const STATUS_META: Record<
  Status,
  {
    tone: string;
    toneDeep: string;
    accent: string;
    icon: IconName;
    text: string;
  }
> = {
  "Not Started": {
    tone: "#e4dfee",
    toneDeep: "#c7bfe0",
    accent: "#8a7ea3",
    icon: "pawn",
    text: "var(--royal-purple-deep)",
  },
  "In Progress": {
    tone: "var(--royal-gold-bright)",
    toneDeep: "var(--royal-gold)",
    accent: "var(--royal-gold)",
    icon: "knight",
    text: "var(--royal-ink)",
  },
  Completed: {
    tone: "var(--royal-emerald)",
    toneDeep: "var(--royal-emerald-deep)",
    accent: "var(--royal-emerald)",
    icon: "king",
    text: "#ffffff",
  },
  "Needs Attention": {
    tone: "var(--royal-crimson)",
    toneDeep: "var(--royal-crimson-deep)",
    accent: "var(--royal-crimson)",
    icon: "swords",
    text: "#ffffff",
  },
};

const TILES: {
  label: string;
  value: number;
  icon: IconName;
  tone: string;
}[] = [
  { label: "Applications", value: 3, icon: "rook", tone: "var(--royal-sapphire-bright)" },
  { label: "Controls", value: 5, icon: "king", tone: "var(--royal-gold-bright)" },
  { label: "In Progress", value: 2, icon: "knight", tone: "var(--royal-gold-bright)" },
  { label: "Completed", value: 1, icon: "queen", tone: "var(--royal-emerald-bright)" },
  { label: "Needs Attention", value: 1, icon: "swords", tone: "var(--royal-crimson-bright)" },
  { label: "Argos Ready", value: 1, icon: "bishop", tone: "#d8b45c" },
];

const CONTROLS: {
  appName: string;
  code: string;
  title: string;
  status: Status;
  checklist: { text: string; done: boolean }[];
}[] = [
  {
    appName: "Payment Gateway Service",
    code: "CC-04.02",
    title:
      "Access reviews are performed quarterly for production systems",
    status: "In Progress",
    checklist: [
      {
        text: "Identify the authoritative access-review source system",
        done: true,
      },
      {
        text: "Obtain read-only access to the identity provider",
        done: true,
      },
      {
        text: "Confirm reviewer and cadence with the application owner",
        done: false,
      },
    ],
  },
  {
    appName: "Payment Gateway Service",
    code: "CC-06.01",
    title: "Encryption at rest is enabled for all data stores",
    status: "Completed",
    checklist: [
      { text: "Confirm encryption is enforced at the storage layer", done: true },
      { text: "Obtain key-management ownership and rotation policy", done: true },
    ],
  },
  {
    appName: "Payment Gateway Service",
    code: "CC-07.03",
    title: "Change requests require documented approval before deploy",
    status: "Not Started",
    checklist: [
      { text: "Identify the change-management ticketing system", done: false },
      { text: "Request read-only access to change records", done: false },
    ],
  },
  {
    appName: "Customer Data Platform",
    code: "CC-08.01",
    title: "Privileged access to customer data is logged and reviewed",
    status: "Needs Attention",
    checklist: [
      { text: "Locate the privileged-access audit trail", done: true },
      { text: "Resolve conflicting evidence from the prior review", done: false },
    ],
  },
  {
    appName: "Internal Reporting Suite",
    code: "CC-02.05",
    title: "Report outputs reconcile to source financial data",
    status: "In Progress",
    checklist: [
      { text: "Map each report field to its authoritative source", done: true },
      { text: "Validate reconciliation logic with the report owner", done: false },
    ],
  },
];

const CHAT_MESSAGES = [
  {
    from: "ai" as const,
    text: "Ask me to update evidence, regenerate a checklist, or explain a control.",
  },
  {
    from: "user" as const,
    text: "What's blocking Payment Gateway Service?",
  },
  {
    from: "ai" as const,
    text: "One control needs attention: CC-04.02 (access reviews) is still in progress -- the reviewer and cadence aren't confirmed yet.",
  },
];

export default function RoyalThemePreview() {
  const [expanded, setExpanded] = useState<string | null>(
    CONTROLS[0].code
  );
  const [rainEnabled, setRainEnabled] = useState(true);
  const [cursorActive, setCursorActive] = useState(false);
  const handleCursorReady = useCallback(() => setCursorActive(true), []);

  return (
    <div
      className={`royal-root ${cursorActive ? "royal-root--cursor-active" : ""} ${cinzel.variable} ${garamond.variable}`}
    >
      <style>{`
        .royal-root {
          --royal-purple: #5B2A86;
          --royal-purple-deep: #2E1065;
          --royal-gold: #D4AF37;
          --royal-gold-bright: #F4CF47;
          --royal-crimson: #A01D2B;
          --royal-crimson-deep: #6E1220;
          --royal-crimson-bright: #E23A4E;
          --royal-emerald: #0F6B4C;
          --royal-emerald-deep: #0A4A35;
          --royal-emerald-bright: #2BD696;
          --royal-sapphire: #1C3F8F;
          --royal-sapphire-deep: #12275C;
          --royal-sapphire-bright: #5B8CE0;
          --royal-parchment: #F6EFE0;
          --royal-ink: #1A0F2E;

          position: relative;
          min-height: 100vh;
          isolation: isolate;
          background:
            radial-gradient(ellipse 900px 500px at 50% -8%, rgba(244,207,71,0.14), transparent 60%),
            radial-gradient(ellipse 700px 600px at 100% 100%, rgba(160,29,43,0.20), transparent 55%),
            radial-gradient(ellipse 700px 600px at 0% 100%, rgba(15,107,76,0.18), transparent 55%),
            linear-gradient(180deg, #0a0512 0%, #150a26 45%, #1c0f2e 100%);
          color: var(--royal-parchment);
          font-family: var(--font-royal-body), Georgia, serif;
          /* Static fallback -- the same rapier, plain CSS, no JS
             required. Always correct on its own; upgraded to the
             swaying/glowing/slashing animated version below only
             once that's confirmed actually tracking the mouse, so a
             blocked script or a coarse-pointer device never leaves
             the page cursor-less or stuck on a wrong shape. */
          cursor:
            url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="sc-blade" x1="0" y1="0" x2="1" y2="0"><stop offset="0%25" stop-color="%238fa3b3"/><stop offset="35%25" stop-color="%23f4f8fb"/><stop offset="50%25" stop-color="%23ffffff"/><stop offset="65%25" stop-color="%23f4f8fb"/><stop offset="100%25" stop-color="%238fa3b3"/></linearGradient><linearGradient id="sc-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%25" stop-color="%23f4cf47"/><stop offset="100%25" stop-color="%23a9791a"/></linearGradient><radialGradient id="sc-gem" cx="35%25" cy="30%25" r="70%25"><stop offset="0%25" stop-color="%239fe3ff"/><stop offset="45%25" stop-color="%232f8fd6"/><stop offset="100%25" stop-color="%23134d80"/></radialGradient></defs><g transform="rotate(-20 16 16)" stroke="%2312202b" stroke-width="0.7" stroke-linejoin="round"><polygon points="16,0 17.6,3.5 17,17 15,17 14.4,3.5" fill="url(%23sc-blade)"/><line x1="16" y1="3" x2="16" y2="16.2" stroke="%235c7080" stroke-width="0.5" opacity="0.5"/><line x1="16" y1="3" x2="16" y2="16.2" stroke="url(%23sc-gold)" stroke-width="0.35" opacity="0.65" transform="translate(0.9,0)"/><path d="M16 15.5 C14.5 17.5 12 17.8 9.5 17.3 C7 16.8 4.5 17.8 3.5 20.5 C5.5 19.6 7.8 19.3 9 18 C8.3 20 7 21.5 4.8 22.3 C8 22.6 11.5 20.8 12.8 18.3 C13.6 19.2 14.7 19.7 16 19.7 C17.3 19.7 18.4 19.2 19.2 18.3 C20.5 20.8 24 22.6 27.2 22.3 C25 21.5 23.7 20 23 18 C24.2 19.3 26.5 19.6 28.5 20.5 C27.5 17.8 25 16.8 22.5 17.3 C20 17.8 17.5 17.5 16 15.5 Z" fill="url(%23sc-gold)"/><rect x="14" y="19.3" width="4" height="1.5" rx="0.4" fill="url(%23sc-gold)"/><rect x="14.5" y="20.6" width="3" height="6.4" rx="1" fill="%231c2b52"/><line x1="14.5" y1="22" x2="17.5" y2="22" stroke="url(%23sc-gold)" stroke-width="0.65"/><line x1="14.5" y1="23.6" x2="17.5" y2="23.6" stroke="url(%23sc-gold)" stroke-width="0.65"/><line x1="14.5" y1="25.2" x2="17.5" y2="25.2" stroke="url(%23sc-gold)" stroke-width="0.65"/><path d="M16 26.8 C17.4 27.3 18.2 28.6 17.9 30 C17.6 31 16.9 31.6 16 31.7 C15.1 31.6 14.4 31 14.1 30 C13.8 28.6 14.6 27.3 16 26.8 Z" fill="url(%23sc-gold)"/><path d="M16 27.7 C16.8 28 17.2 28.7 17 29.5 C16.8 30.1 16.4 30.5 16 30.6 C15.6 30.5 15.2 30.1 15 29.5 C14.8 28.7 15.2 28 16 27.7 Z" fill="url(%23sc-gem)" stroke-width="0.35"/></g></svg>') 10 1,
            auto;
        }

        .royal-root.royal-root--cursor-active {
          cursor: none;
        }

        .royal-root button,
        .royal-root a {
          cursor: inherit;
        }

        .royal-root .royal-cursor {
          position: fixed;
          top: 0;
          left: 0;
          width: 32px;
          height: 32px;
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: opacity 150ms ease;
          will-change: transform;
        }

        .royal-cursor__inner {
          width: 100%;
          height: 100%;
          transform-origin: 33% 3%;
          animation: royal-cursor-sway 2.4s ease-in-out infinite;
        }

        .royal-cursor__inner--active {
          animation: royal-cursor-slash 220ms ease;
        }

        .royal-cursor__glow {
          width: 100%;
          height: 100%;
          animation: royal-cursor-glow-pulse 2.2s ease-in-out infinite;
        }

        @keyframes royal-cursor-glow-pulse {
          0%, 100% {
            filter:
              drop-shadow(0 0 3px rgba(95,201,255,0.75))
              drop-shadow(0 0 7px rgba(95,201,255,0.4));
          }
          50% {
            filter:
              drop-shadow(0 0 6px rgba(95,201,255,0.95))
              drop-shadow(0 0 14px rgba(95,201,255,0.6));
          }
        }

        @keyframes royal-cursor-sway {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }

        @keyframes royal-cursor-slash {
          0% { transform: rotate(0deg) scale(1); }
          45% { transform: rotate(48deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .royal-cursor__inner,
          .royal-cursor__inner--active,
          .royal-cursor__glow {
            animation: none;
          }
        }

        /* The real app's globals.css recolors plain Tailwind utility
           classes like text-white/bg-white (scoped to the current
           data-theme, with !important) so its own components read
           correctly in both themes -- but that recoloring applies to
           any element carrying those class names anywhere in the
           document, including this unrelated, self-contained preview
           page, where it mismatches text against background (and, in
           dark mode, adds a text-shadow halo meant for the rain
           background). Reset both, scoped to this page only. */
        .royal-root.royal-root.royal-root {
          text-shadow: none !important;
        }
        .royal-root.royal-root.royal-root .text-white { color: #ffffff !important; }
        .royal-root.royal-root.royal-root .bg-white { background-color: #ffffff !important; }

        /* Ambient scene texture: faint diamond lattice + vignette,
           sitting behind everything (isolate + z-index keeps content
           above it without needing individual stacking contexts). */
        .royal-root::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          opacity: 0.05;
          background-image:
            repeating-linear-gradient(45deg, var(--royal-gold) 0, var(--royal-gold) 1px, transparent 1px, transparent 28px),
            repeating-linear-gradient(-45deg, var(--royal-gold) 0, var(--royal-gold) 1px, transparent 1px, transparent 28px);
          pointer-events: none;
        }
        .royal-root::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          box-shadow: inset 0 0 220px rgba(0,0,0,0.55);
          pointer-events: none;
        }
        .royal-root > * {
          position: relative;
          z-index: 1;
        }

        .royal-display {
          font-family: var(--font-royal-display), Georgia, serif;
        }

        .royal-header {
          background:
            radial-gradient(circle at 12% 0%, rgba(244,207,71,0.22), transparent 45%),
            linear-gradient(120deg, var(--royal-purple-deep) 0%, #1e0a3c 55%, var(--royal-crimson-deep) 120%);
          color: var(--royal-parchment);
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(212,175,55,0.4);
          box-shadow: 0 8px 26px rgba(0,0,0,0.45);
        }

        .royal-header::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image:
            repeating-linear-gradient(45deg, var(--royal-gold) 0, var(--royal-gold) 1px, transparent 1px, transparent 24px);
          pointer-events: none;
        }

        .royal-gold-text {
          background: linear-gradient(90deg, #b8860b, var(--royal-gold-bright) 45%, #b8860b 90%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .royal-crown-glow {
          filter: drop-shadow(0 0 6px rgba(244,207,71,0.75)) drop-shadow(0 0 14px rgba(244,207,71,0.35));
          animation: royal-pulse 3.6s ease-in-out infinite;
        }

        @keyframes royal-pulse {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(244,207,71,0.6)) drop-shadow(0 0 10px rgba(244,207,71,0.25)); }
          50% { filter: drop-shadow(0 0 9px rgba(244,207,71,0.9)) drop-shadow(0 0 20px rgba(244,207,71,0.45)); }
        }

        /* Ornate scroll/parchment panel -- the shared "game card" frame
           used for KPI tiles and control cards: a gold outer border, a
           thin inset hairline, and four carved corner brackets. */
        .royal-panel {
          position: relative;
          background: linear-gradient(180deg, #ffffff, var(--royal-parchment));
          color: var(--royal-ink);
          border: 1px solid rgba(212,175,55,0.6);
          box-shadow:
            0 10px 26px rgba(0,0,0,0.35),
            0 0 0 1px rgba(0,0,0,0.25);
        }
        .royal-panel::before {
          content: "";
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(26,15,46,0.14);
          pointer-events: none;
        }

        .royal-corner {
          position: absolute;
          width: 9px;
          height: 9px;
          border: 2px solid var(--royal-gold);
          z-index: 2;
        }
        .royal-corner--tl { top: -1.5px; left: -1.5px; border-right: none; border-bottom: none; }
        .royal-corner--tr { top: -1.5px; right: -1.5px; border-left: none; border-bottom: none; }
        .royal-corner--bl { bottom: -1.5px; left: -1.5px; border-right: none; border-top: none; }
        .royal-corner--br { bottom: -1.5px; right: -1.5px; border-left: none; border-top: none; }

        .royal-tile {
          background: rgba(246,239,224,0.1);
          border: 1px solid rgba(212,175,55,0.5);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        .royal-tile:hover {
          transform: translateY(-2px);
          background: rgba(246,239,224,0.16);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15), 0 0 16px rgba(244,207,71,0.25);
        }

        .royal-btn {
          position: relative;
          overflow: hidden;
          font-family: var(--font-royal-display), Georgia, serif;
          letter-spacing: 0.04em;
          border: 1px solid rgba(26,15,46,0.25);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
        }

        .royal-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
          transform: translateX(-120%);
          transition: transform 500ms ease;
        }

        .royal-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
          box-shadow: 0 8px 20px rgba(0,0,0,0.45);
        }

        .royal-btn:hover::after {
          transform: translateX(120%);
        }

        .royal-filter-chip {
          border: 1px solid rgba(212,175,55,0.5);
          background: rgba(246,239,224,0.95);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .royal-filter-chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .royal-card--open {
          box-shadow:
            0 14px 32px rgba(0,0,0,0.45),
            0 0 0 1px rgba(0,0,0,0.25),
            0 0 20px rgba(212,175,55,0.2);
        }

        .royal-ribbon {
          font-family: var(--font-royal-display), Georgia, serif;
          letter-spacing: 0.03em;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }

        .royal-check {
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
        }

        .royal-chat-ai {
          background: var(--royal-parchment);
          color: var(--royal-ink);
          border: 1px solid rgba(26,15,46,0.15);
          border-left: 3px solid var(--royal-gold);
        }

        .royal-chat-user {
          background: linear-gradient(135deg, var(--royal-purple), var(--royal-purple-deep));
          color: var(--royal-parchment);
        }

        .royal-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .royal-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212,175,55,0.5);
          border-radius: 999px;
        }

        .royal-root .royal-coin-rain {
          position: fixed;
          inset: 0;
          z-index: 40;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .royal-root .royal-skyline {
          position: relative;
          width: 100%;
          height: 240px;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }

        .royal-skyline__svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .royal-walker {
          position: absolute;
          left: -3%;
          border-radius: 40% 40% 50% 50%;
          background: #0d0616;
          box-shadow: 0 0 4px rgba(0,0,0,0.6);
          animation-name: royal-walk;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes royal-walk {
          0% { transform: translateX(0) scaleX(var(--royal-walk-dir, 1)); }
          49% { transform: translateX(106vw) scaleX(var(--royal-walk-dir, 1)); }
          50% { transform: translateX(106vw) scaleX(calc(var(--royal-walk-dir, 1) * -1)); }
          99% { transform: translateX(0) scaleX(calc(var(--royal-walk-dir, 1) * -1)); }
          100% { transform: translateX(0) scaleX(var(--royal-walk-dir, 1)); }
        }

        @media (prefers-reduced-motion: reduce) {
          .royal-walker {
            animation: none;
          }
        }

        .royal-torch {
          position: absolute;
          width: 4px;
        }

        .royal-torch__stick {
          width: 4px;
          height: 34px;
          background: linear-gradient(180deg, #6b4423, #2e1c0f);
          border-radius: 1px;
        }

        .royal-torch__flame {
          position: absolute;
          top: -13px;
          left: 50%;
          width: 13px;
          height: 17px;
          margin-left: -6.5px;
          background: radial-gradient(circle at 50% 72%, #fff3b0, #f4cf47 42%, #d4761a 76%, transparent 100%);
          border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
          filter: drop-shadow(0 0 7px rgba(244,207,71,0.85));
          transform-origin: 50% 100%;
          animation: royal-flicker 1.5s ease-in-out infinite;
        }

        @keyframes royal-flicker {
          0%, 100% { transform: scale(1, 1) rotate(-2deg); opacity: 0.95; }
          25% { transform: scale(0.9, 1.1) rotate(3deg); opacity: 1; }
          50% { transform: scale(1.06, 0.92) rotate(-3deg); opacity: 0.88; }
          75% { transform: scale(0.94, 1.04) rotate(2deg); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .royal-torch__flame {
            animation: none;
          }
        }

        /* Folded-letter treatment for control cards: a faint cloth-like
           crosshatch texture plus two embossed horizontal creases (as
           if tri-folded), a wax-seal toggle that turns when the letter
           is unfolded, and a paper-unfold reveal for the checklist. */
        .royal-letter {
          perspective: 700px;
          background-color: #d9bd88;
          background-image:
            /* fold creases -- tri-folded letter, shadow + highlight band */
            linear-gradient(180deg,
              transparent 0%, transparent 32%,
              rgba(69,45,15,0.32) 32.6%, rgba(255,244,214,0.55) 33.3%, transparent 34.2%,
              transparent 65.2%,
              rgba(69,45,15,0.32) 65.8%, rgba(255,244,214,0.55) 66.5%, transparent 67.4%,
              transparent 100%),
            /* mottled aging / worn patches */
            radial-gradient(ellipse 220px 110px at 12% 15%, rgba(107,71,26,0.16), transparent 62%),
            radial-gradient(ellipse 260px 130px at 88% 80%, rgba(107,71,26,0.14), transparent 62%),
            radial-gradient(ellipse 180px 120px at 55% 10%, rgba(107,71,26,0.10), transparent 58%),
            /* cloth weave */
            repeating-linear-gradient(45deg, rgba(69,45,15,0.07) 0px, rgba(69,45,15,0.07) 1px, transparent 1px, transparent 3px),
            repeating-linear-gradient(-45deg, rgba(69,45,15,0.07) 0px, rgba(69,45,15,0.07) 1px, transparent 1px, transparent 3px),
            /* base aged parchment/leather tone */
            linear-gradient(160deg, #f0dcab 0%, #dcbd85 55%, #c9a468 100%);
          border-color: rgba(120,80,30,0.55);
          box-shadow:
            inset 0 0 30px rgba(69,45,15,0.28),
            0 10px 26px rgba(0,0,0,0.4),
            0 0 0 1px rgba(0,0,0,0.3);
        }

        .royal-letter::before {
          border-color: rgba(69,45,15,0.22);
        }

        .royal-wax-seal {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, var(--royal-crimson), var(--royal-crimson-deep));
          box-shadow: 0 2px 5px rgba(0,0,0,0.4), inset 0 0 0 1.5px rgba(212,175,55,0.55);
          transition: transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .royal-unfold {
          transform-origin: top center;
          animation: royal-unfold 420ms cubic-bezier(0.22, 1, 0.36, 1);
          backface-visibility: hidden;
        }

        @keyframes royal-unfold {
          0% { transform: scaleY(0.1) rotateX(-25deg); opacity: 0; }
          65% { transform: scaleY(1.02) rotateX(2deg); opacity: 1; }
          100% { transform: scaleY(1) rotateX(0deg); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .royal-unfold {
            animation: none;
          }
          .royal-wax-seal {
            transition: none;
          }
        }
      `}</style>

      <AnimatedCursor onReady={handleCursorReady} />
      <CoinRain enabled={rainEnabled} />

      {/* Header */}
      <header className="royal-header px-6 py-5">
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="royal-crown-glow text-[var(--royal-gold-bright)]">
                <RoyalIcon name="shield" size={22} color="var(--royal-sapphire-bright)" glow />
              </span>
              <span className="royal-crown-glow text-[var(--royal-gold-bright)]">
                <RoyalIcon name="crown" size={26} color="var(--royal-gold-bright)" />
              </span>
              <h1 className="royal-display royal-gold-text text-2xl font-bold uppercase tracking-wide">
                Control Governor
              </h1>
              <span className="rounded-full border border-[var(--royal-gold)]/50 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.15em] text-[var(--royal-gold-bright)]">
                ROYAL THEME &middot; PREVIEW
              </span>
              <button
                type="button"
                onClick={() => setRainEnabled((v) => !v)}
                className="royal-btn flex items-center gap-1.5 rounded-full border border-[var(--royal-gold)]/50 bg-black/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-[var(--royal-gold-bright)]"
                title={
                  rainEnabled
                    ? "Remove the coin rain"
                    : "Add the coin rain"
                }
              >
                <RoyalIcon
                  name="coin"
                  size={12}
                  color="var(--royal-gold-bright)"
                />
                {rainEnabled ? "REMOVE RAIN" : "ADD RAIN"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[color:rgba(246,239,224,0.88)]">
              Workspace: CORE &middot; Framework: SOX / PCI DSS
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TILES.map((tile) => (
              <div
                key={tile.label}
                className="royal-panel royal-tile rounded-lg px-3 py-2 text-center"
              >
                <RoyalCardCorners />
                <div className="flex justify-center" style={{ color: tile.tone }}>
                  <RoyalIcon name={tile.icon} size={20} color={tile.tone} glow />
                </div>
                <div className="royal-display mt-1 text-lg font-bold text-[var(--royal-gold-bright)]">
                  {tile.value}
                </div>
                <div className="text-[9px] font-semibold uppercase tracking-wide text-[color:rgba(246,239,224,0.92)]">
                  {tile.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        {/* Main: controls */}
        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="royal-display text-2xl font-bold tracking-wide text-[var(--royal-gold-bright)]">
              Controls
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="royal-btn flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold uppercase text-[var(--royal-ink)]"
                style={{
                  background:
                    "linear-gradient(180deg, var(--royal-gold-bright), var(--royal-gold))",
                }}
              >
                <RoyalIcon name="queen" size={14} color="var(--royal-ink)" />
                Executive Summary
              </button>
              <Link
                href="/"
                className="royal-btn flex items-center gap-1.5 rounded-md border border-[var(--royal-gold)]/50 bg-white px-4 py-2 text-xs font-bold uppercase text-[var(--royal-purple-deep)]"
              >
                <RoyalIcon name="throne" size={14} color="var(--royal-purple-deep)" />
                Back to app
              </Link>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {["All Statuses", "By Application", "Client Reference", "Needs Attention"].map(
              (chip) => (
                <button
                  type="button"
                  key={chip}
                  className="royal-filter-chip royal-display rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--royal-purple-deep)]"
                >
                  {chip}
                </button>
              )
            )}
          </div>

          <div className="space-y-3">
            {CONTROLS.map((control) => {
              const isOpen = expanded === control.code;
              const meta = STATUS_META[control.status];
              const done = control.checklist.filter((t) => t.done).length;

              return (
                <div
                  key={control.code}
                  className={`royal-panel royal-letter rounded-xl p-4 ${isOpen ? "royal-card--open" : ""}`}
                  style={{ borderLeft: `4px solid ${meta.accent}` }}
                >
                  <RoyalCardCorners />
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(isOpen ? null : control.code)
                    }
                    className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="royal-display rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: "var(--royal-sapphire)" }}
                        >
                          {control.appName}
                        </span>
                        <span className="font-mono text-[11px] text-[color:rgba(26,15,46,0.5)]">
                          {control.code}
                        </span>
                      </div>
                      <p className="royal-display mt-1 text-base font-semibold">
                        {control.title}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-[color:rgba(26,15,46,0.6)]">
                        {done} of {control.checklist.length} tasks
                      </span>
                      <span
                        className="royal-ribbon flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                        style={{
                          background: `linear-gradient(180deg, ${meta.tone}, ${meta.toneDeep})`,
                          color: meta.text,
                        }}
                      >
                        <RoyalIcon name={meta.icon} size={12} color={meta.text} />
                        {control.status}
                      </span>
                      <span
                        className="royal-wax-seal"
                        style={{
                          transform: isOpen
                            ? "rotate(28deg) scale(0.92)"
                            : "rotate(0deg) scale(1)",
                        }}
                      >
                        <RoyalIcon name="shield" size={13} color="#f6efe0" />
                      </span>
                    </div>
                  </button>

                  {isOpen ? (
                    <ul className="royal-unfold mt-4 space-y-2 border-t border-[color:rgba(26,15,46,0.14)] pt-3">
                      {control.checklist.map((task) => (
                        <li
                          key={task.text}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span
                            className="royal-check mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] text-white"
                            style={{
                              backgroundColor: task.done
                                ? "var(--royal-emerald)"
                                : "transparent",
                              border: task.done
                                ? "none"
                                : "1.5px solid var(--royal-gold)",
                            }}
                          >
                            {task.done ? "✓" : ""}
                          </span>
                          <span
                            className={
                              task.done
                                ? "text-[color:rgba(26,15,46,0.45)] line-through"
                                : "text-[color:rgba(26,15,46,0.85)]"
                            }
                          >
                            {task.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Chat panel */}
        <aside className="royal-panel flex w-full shrink-0 flex-col rounded-xl lg:w-80">
          <RoyalCardCorners />
          <div className="royal-header flex items-center gap-2 rounded-t-xl px-4 py-3">
            <RoyalIcon
              name="rook"
              size={20}
              color="var(--royal-gold-bright)"
              glow
            />
            <div>
              <p className="royal-display text-sm font-bold uppercase tracking-wide text-[var(--royal-gold-bright)]">
                The Royal Herald
              </p>
              <p className="text-[10px] text-[color:rgba(246,239,224,0.88)]">
                AI-guided counsel
              </p>
            </div>
          </div>

          <div className="royal-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
            {CHAT_MESSAGES.map((msg, i) =>
              msg.from === "ai" ? (
                <div
                  key={i}
                  className="royal-chat-ai rounded-lg px-3 py-2 text-sm leading-6"
                >
                  {msg.text}
                </div>
              ) : (
                <div
                  key={i}
                  className="royal-chat-user ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6"
                >
                  {msg.text}
                </div>
              )
            )}
          </div>

          <div className="border-t border-[color:rgba(26,15,46,0.1)] p-3">
            <div className="flex items-center gap-2 rounded-lg border border-[color:rgba(26,15,46,0.2)] bg-[var(--royal-parchment)] px-3 py-2 text-sm text-[color:rgba(26,15,46,0.45)]">
              <RoyalIcon name="quill" size={14} color="rgba(26,15,46,0.5)" />
              Petition the herald&hellip;
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex items-center justify-center gap-2 border-t border-[color:rgba(212,175,55,0.25)] py-6 text-center text-xs text-[color:rgba(246,239,224,0.55)]">
        <RoyalIcon name="swords" size={14} color="var(--royal-gold)" />
        Royal Theme &middot; preview only, not applied to the live app &middot; /royaltheme
      </footer>

      <CastleSkyline />
    </div>
  );
}
