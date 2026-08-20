"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { RoyalIcon } from "./RoyalIcon";

// Mounted once, globally (see layout.tsx) alongside MatrixRainBackground.
// Renders nothing outside the royal theme. Replaces the native pointer
// with a swaying, glowing legendary sword that tracks the mouse
// (position set imperatively via ref, not React state, so it stays
// smooth at 60fps) and slashes on click.
//
// globals.css sets a plain CSS `cursor: url(...)` fallback on
// `[data-theme="royal"]` -- the exact same sword, no JS required -- so
// the page never goes cursor-less. This component only takes over
// (`cursor: none` via the `[data-royal-cursor="active"]` attribute this
// sets on <html>) once it's confirmed the animated version is actually
// tracking the mouse. Skipped entirely on touch/coarse-pointer devices.
export default function RoyalCursor() {
  const { theme } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (theme !== "royal") return;
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
      if (!readyFired) {
        readyFired = true;
        document.documentElement.setAttribute("data-royal-cursor", "active");
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
      document.documentElement.removeAttribute("data-royal-cursor");
    };
  }, [theme]);

  if (theme !== "royal") return null;

  return (
    <div ref={wrapRef} className="royal-cursor" aria-hidden="true">
      <style>{`
        .royal-cursor {
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

        @keyframes royal-cursor-sway {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }

        @keyframes royal-cursor-slash {
          0% { transform: rotate(0deg) scale(1); }
          45% { transform: rotate(48deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1); }
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

        @media (prefers-reduced-motion: reduce) {
          .royal-cursor__inner,
          .royal-cursor__inner--active,
          .royal-cursor__glow {
            animation: none;
          }
        }
      `}</style>
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
