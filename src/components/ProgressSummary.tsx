// ======================================================
// Component Name : ProgressSummary
// Purpose        : Displays a compact horizontal strip
//                  of dashboard progress tiles
// Author         : Manoj
// ======================================================

"use client";

export type ProgressTileKey =
  | "applications"
  | "controls"
  | "notStarted"
  | "inProgress"
  | "completed"
  | "needsAttention"
  | "fullyUploaded";

type ProgressSummaryProps = {
  applications: number;
  controls: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  needsAttention: number;
  fullyUploaded: number;
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
  fullyUploaded,
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
        tileKey="fullyUploaded"
        label="Evidence + Testing"
        value={fullyUploaded}
        tone="success"
        onClick={
          onTileClick &&
          (() => onTileClick("fullyUploaded"))
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
  label,
  value,
  tone = "default",
  onClick,
}: SummaryTileProps) {
  const toneClasses = `rounded-lg border px-2.5 py-1.5 text-center leading-tight shadow-sm ${TONE_CLASSES[tone]}`;

  const content = (
    <>

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
