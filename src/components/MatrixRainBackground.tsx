"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

const DROP_COLOR = "10,255,65"; // matches the theme's #0aff41 green

type Drop = {
  x: number;
  y: number;
  length: number;
  speed: number;
  drift: number; // horizontal fall-per-frame, for a slight wind-blown angle
  opacity: number;
};

function createDrop(width: number, height: number, atTop = false): Drop {
  return {
    x: Math.random() * width,
    y: atTop ? -20 - Math.random() * height : Math.random() * -height,
    length: 12 + Math.random() * 28,
    speed: 6 + Math.random() * 10,
    drift: 1.5 + Math.random(),
    opacity: 0.25 + Math.random() * 0.55,
  };
}

export default function MatrixRainBackground() {
  const { theme, rainEffectEnabled } = useTheme();
  const active = theme === "dark" && rainEffectEnabled;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // One droplet per ~14px of width -- dense enough to read as rain,
    // sparse enough that individual streaks stay visible.
    let drops: Drop[] = Array.from(
      { length: Math.floor(width / 14) },
      () => createDrop(width, height, true)
    );

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      drops = Array.from(
        { length: Math.floor(width / 14) },
        () => createDrop(width, height, true)
      );
    };
    window.addEventListener("resize", onResize);

    // The fade-trail effect only reaches full black gradually; without an
    // immediate solid fill, toggling into rain mode would flash the
    // browser's default white canvas for the first frames (the outer
    // shell and body are now transparent so the rain shows through gaps).
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    let frame: number;
    const draw = () => {
      // Faster fade than the old character-column version -- thin fast
      // streaks need a shorter trail than slow-drifting characters did,
      // or they smear into a solid wash instead of reading as droplets.
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, 0, width, height);
      ctx.lineCap = "round";

      for (const drop of drops) {
        const tailX = drop.x - drop.drift * 2;
        const tailY = drop.y - drop.length;
        const gradient = ctx.createLinearGradient(
          tailX,
          tailY,
          drop.x,
          drop.y
        );
        gradient.addColorStop(0, `rgba(${DROP_COLOR},0)`);
        gradient.addColorStop(1, `rgba(${DROP_COLOR},${drop.opacity})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(drop.x, drop.y);
        ctx.stroke();

        drop.x += drop.drift;
        drop.y += drop.speed;

        if (drop.y - drop.length > height || drop.x > width + 20) {
          Object.assign(drop, createDrop(width, height));
        }
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [active]);

  if (!active) return null;

  // A negative z-index keeps this behind normal in-flow content (per CSS
  // stacking/painting order, negative-z descendants paint before static
  // content). The app's own outer shell (.app-canvas-bg) is made
  // transparent whenever data-theme="dark" and data-rain="on" are both
  // set, so this shows through in real gaps, while every actual content
  // box keeps its normal opaque background and hides the rain naturally
  // — no blend trickery needed.
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 opacity-50"
      aria-hidden
    />
  );
}
