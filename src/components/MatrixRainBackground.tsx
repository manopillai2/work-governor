"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

const CHARS =
  "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFXYZ";

export default function MatrixRainBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme !== "rain") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    let drops = new Array(columns).fill(1);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(1);
    };
    window.addEventListener("resize", onResize);

    // The fade-trail effect only reaches full black gradually; without an
    // immediate solid fill, toggling into rain mode would flash the
    // browser's default white canvas for the first ~30 frames (the outer
    // shell and body are now transparent so the rain shows through gaps).
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    let frame: number;
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#0aff41";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [theme]);

  if (theme !== "rain") return null;

  // A negative z-index keeps this behind normal in-flow content (per CSS
  // stacking/painting order, negative-z descendants paint before static
  // content). The app's own outer shell (.app-canvas-bg) is made
  // transparent in rain mode so this shows through in real gaps, while
  // every actual content box keeps its normal opaque background and hides
  // the rain naturally — no blend trickery needed.
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    />
  );
}
