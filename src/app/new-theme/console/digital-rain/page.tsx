"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { APPLICATIONS, CHAT_MESSAGES } from "../../_data";

const STATUS_TAG: Record<string, string> = {
  Completed: "[OK]",
  "In Progress": "[WIP]",
  "Not Started": "[----]",
  "Needs Attention": "[WARN]",
};

const CHARS =
  "MANOJ KUMAR";

function MatrixRainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const fontSize = 8;
    let columns = Math.floor(width / fontSize);
    let drops = new Array(columns).fill(1);

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(1);
    };
    window.addEventListener("resize", onResize);

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
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
  );
}

export default function DigitalRainPreview() {
  const [expandedApp, setExpandedApp] = useState<string | null>(
    "Payment Gateway Service"
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-mono text-green-400">
      <MatrixRainCanvas />

      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="flex shrink-0 items-center justify-between border-b border-green-500/30 bg-black/70 px-3 py-2 backdrop-blur-sm">
          <h1 className="text-xl font-bold tracking-widest text-green-300">
            CONTROL_GOVERNOR // WAKE UP
          </h1>
          <Link
            href="/new-theme/console"
            className="text-xs text-green-600 hover:text-green-300"
          >
            ← all console styles
          </Link>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto border border-green-500/30 bg-black/80 p-3 backdrop-blur-sm">
            {APPLICATIONS.map((app) => {
              const isOpen = expandedApp === app.name;
              return (
                <div key={app.name} className="mb-3">
                  <button
                    onClick={() => setExpandedApp(isOpen ? null : app.name)}
                    className="flex w-full items-center justify-between gap-4 border border-green-500/30 px-3 py-2 text-left hover:bg-green-500/10"
                  >
                    <span>
                      {isOpen ? "▾" : "▸"} {app.name}{" "}
                      <span className="text-green-700">
                        ({app.framework})
                      </span>
                    </span>
                    <span className="shrink-0 text-green-500">
                      {app.completed}/{app.controls}
                    </span>
                  </button>

                  {isOpen && app.controlList.length > 0 ? (
                    <div className="border border-t-0 border-green-500/30 px-3 py-2">
                      {app.controlList.map((control) => (
                        <div
                          key={control.code}
                          className="flex items-center justify-between gap-4 py-1 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            <span className="text-green-700">
                              {control.code}
                            </span>{" "}
                            {control.title}
                          </span>
                          <span className="shrink-0 text-green-300">
                            {STATUS_TAG[control.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex w-72 shrink-0 flex-col border border-green-500/30 bg-black/80 backdrop-blur-sm">
            <div className="border-b border-green-500/30 px-3 py-2 text-xs text-green-600">
              AI_ASSIST.EXE
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
              {CHAT_MESSAGES.map((msg, i) => (
                <p key={i}>
                  <span className="text-green-700">
                    {msg.from === "ai" ? "AI>" : "YOU>"}
                  </span>{" "}
                  {msg.text}
                </p>
              ))}
            </div>
            <div className="border-t border-green-500/30 p-2 text-sm text-green-800">
              &gt; type a message<span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
