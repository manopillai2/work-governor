// ======================================================
// Component Name : ProgressSummary
// Purpose        : Displays a compact horizontal strip
//                  of dashboard progress tiles
// Author         : Manoj
// ======================================================

"use client";

import { RoyalIcon, type RoyalIconName } from "@/components/RoyalIcon";
import { useTheme } from "@/components/ThemeProvider";

export type ProgressTileKey =
  | "applications"
  | "controls"
  | "notStarted"
  | "inProgress"
  | "completed"
  | "needsAttention"
  | "argosReady";

const TILE_ROYAL_ICON: Record<ProgressTileKey, RoyalIconName> = {
  applications: "rook",
  controls: "king",
  notStarted: "pawn",
  inProgress: "knight",
  completed: "queen",
  needsAttention: "swords",
  argosReady: "bishop",
};

type ProgressSummaryProps = {
  applications: number;
  controls: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  needsAttention: number;
  argosReady: number;
  // When omitted, tiles render as plain (non-interactive) figures --
  // used before isLoaded (see page.tsx's placeholder progress) where
  // clicking anything would have nothing real to filter yet.
  onTileClick?: (key: ProgressTileKey) => void;
};

export default function ProgressSummary({
  applications,
  controls,
  notStarted,
  inProgress,
  completed,
  needsAttention,
  argosReady,
  onTileClick,
}: ProgressSummaryProps) {
  return (
    <div className="grid w-full grid-cols-4 gap-1.5 xl:w-auto">
      <SummaryTile
        tileKey="applications"
        label="Applications"
        value={applications}
        onClick={
          onTileClick &&
          (() => onTileClick("applications"))
        }
      />

      <SummaryTile
        tileKey="controls"
        label="Controls"
        value={controls}
        onClick={
          onTileClick &&
          (() => onTileClick("controls"))
        }
      />

      <SummaryTile
        tileKey="notStarted"
        label="Not Started"
        value={notStarted}
        onClick={
          onTileClick &&
          (() => onTileClick("notStarted"))
        }
      />

      <SummaryTile
        tileKey="inProgress"
        label="In Progress"
        value={inProgress}
        onClick={
          onTileClick &&
          (() => onTileClick("inProgress"))
        }
      />

      <SummaryTile
        tileKey="completed"
        label="Completed"
        value={completed}
        tone="success"
        onClick={
          onTileClick &&
          (() => onTileClick("completed"))
        }
      />

      <SummaryTile
        tileKey="needsAttention"
        label="Needs Attention"
        value={needsAttention}
        tone="warning"
        onClick={
          onTileClick &&
          (() => onTileClick("needsAttention"))
        }
      />

      <SummaryTile
        tileKey="argosReady"
        label="Argos Ready"
        value={argosReady}
        tone="success"
        onClick={
          onTileClick &&
          (() => onTileClick("argosReady"))
        }
      />
    </div>
  );
}

type SummaryTileProps = {
  tileKey: ProgressTileKey;
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
  onClick?: () => void;
};

const TONE_CLASSES: Record<
  NonNullable<SummaryTileProps["tone"]>,
  string
> = {
  default: "border-slate-200 bg-white",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
};

const TONE_VALUE_CLASSES: Record<
  NonNullable<SummaryTileProps["tone"]>,
  string
> = {
  default: "text-slate-900",
  success: "text-emerald-700",
  warning: "text-amber-700",
};

function SummaryTile({
  tileKey,
  label,
  value,
  tone = "default",
  onClick,
}: SummaryTileProps) {
  const { theme } = useTheme();
  const toneClasses = `rounded-lg border px-2.5 py-1.5 text-center leading-tight shadow-sm ${TONE_CLASSES[tone]}`;

  const content = (
    <>
      {theme === "royal" ? (
        <div className="flex justify-center text-[#a9791a]">
          <RoyalIcon
            name={TILE_ROYAL_ICON[tileKey]}
            size={16}
            color="currentColor"
          />
        </div>
      ) : null}

      <p
        className={`text-lg font-bold ${TONE_VALUE_CLASSES[tone]}`}
      >
        {value}
      </p>

      <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </>
  );

  if (!onClick) {
    return <div className={toneClasses}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Show ${label}`}
      className={`${toneClasses} cursor-pointer transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md`}
    >
      {content}
    </button>
  );
}
