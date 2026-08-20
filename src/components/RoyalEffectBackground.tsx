"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

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

// Falling gold coins for the royal theme -- same shape as the app's
// own MatrixRainBackground.tsx (drop model, requestAnimationFrame
// loop, resize handling) but drawn as spinning coin discs, and
// rendered ABOVE the page content (not behind it, unlike the matrix
// rain) since coins hidden behind opaque cards read as "broken" rather
// than atmospheric -- pointer-events-none keeps every click and
// button working normally underneath. Any button/link click pops a
// small burst of coins from that spot that arcs outward and joins the
// ambient rain. Mounted once in layout.tsx; renders nothing outside
// the royal theme.
export default function RoyalEffectBackground() {
  const { theme, royalEffectEnabled } = useTheme();
  const active = theme === "royal" && royalEffectEnabled;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40"
      aria-hidden
    />
  );
}
