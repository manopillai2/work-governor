"use client";

// ======================================================
// Component Name : HealthPage
// Purpose        : Polls /api/health and renders it as a
//                  small status dashboard (overall status,
//                  DB latency trend, uptime, memory).
// Author         : Manoj
// ======================================================

import { useEffect, useState } from "react";

type HealthResponse = {
  status: "ok" | "degraded";
  checkedAt: string;
  uptimeSeconds: number;
  database:
    | { status: "up"; latencyMs: number }
    | { status: "down"; error: string };
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
};

const POLL_MS = 5000;
const HISTORY_LIMIT = 20;

function formatUptime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="h-8" />;
  }

  const width = 120;
  const height = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke="#9ca8b8"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className=""
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={4}
        fill="#2a78d6"
        stroke="var(--color-background, #fff)"
        strokeWidth={2}
        className=""
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: "ok" | "degraded" | "checking" }) {
  const config = {
    ok: { color: "#0ca30c", label: "Operational" },
    degraded: { color: "#d03b3b", label: "Degraded" },
    checking: { color: "#898781", label: "Checking..." },
  }[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}

function StatTile({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-slate-900">
            {value}
          </p>
          {detail ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {detail}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as HealthResponse;
        if (cancelled) return;

        setHealth(data);
        setFetchError(null);

        if (data.database.status === "up") {
          const latencyMs = data.database.latencyMs;
          setLatencyHistory((prev) => [...prev, latencyMs].slice(-HISTORY_LIMIT));
        }
      } catch {
        if (!cancelled) {
          setFetchError("Could not reach the app server.");
        }
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const overallStatus: "ok" | "degraded" | "checking" = fetchError
    ? "degraded"
    : (health?.status ?? "checking");

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            System health
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Live status for the work-governor app, refreshed every{" "}
            {POLL_MS / 1000}s.
          </p>
        </div>
        <StatusBadge status={overallStatus} />
      </div>

      {fetchError ? (
        <p className="mt-4 rounded-lg border border-[#d03b3b]/30 bg-[#d03b3b]/5 px-3 py-2 text-sm text-[#d03b3b]">
          {fetchError}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Database latency"
          value={
            health?.database.status === "up"
              ? `${health.database.latencyMs} ms`
              : health?.database.status === "down"
                ? "down"
                : "—"
          }
          detail={
            health?.database.status === "down" ? health.database.error : undefined
          }
        >
          <Sparkline values={latencyHistory} />
        </StatTile>

        <StatTile
          label="Server uptime"
          value={health ? formatUptime(health.uptimeSeconds) : "—"}
        />

        <StatTile
          label="Memory (heap)"
          value={health ? `${health.memory.heapUsedMb} MB` : "—"}
          detail={health ? `of ${health.memory.heapTotalMb} MB · ${health.memory.rssMb} MB RSS` : undefined}
        />
      </div>

      {health ? (
        <p className="mt-4 text-xs text-slate-400">
          Last checked {new Date(health.checkedAt).toLocaleTimeString()}
        </p>
      ) : null}
    </main>
  );
}
