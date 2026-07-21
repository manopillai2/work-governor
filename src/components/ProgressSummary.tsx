// ======================================================
// Component Name : ProgressSummary
// Purpose        : Displays a compact horizontal strip
//                  of dashboard progress tiles
// Author         : Manoj
// ======================================================

type ProgressSummaryProps = {
  applications: number;
  controls: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  needsAttention: number;
  argosReady: number;
};

export default function ProgressSummary({
  applications,
  controls,
  notStarted,
  inProgress,
  completed,
  needsAttention,
  argosReady,
}: ProgressSummaryProps) {
  return (
    <div className="grid w-full grid-cols-4 gap-1.5 xl:w-auto">
      <SummaryTile
        label="Applications"
        value={applications}
      />

      <SummaryTile
        label="Controls"
        value={controls}
      />

      <SummaryTile
        label="Not Started"
        value={notStarted}
      />

      <SummaryTile
        label="In Progress"
        value={inProgress}
      />

      <SummaryTile
        label="Completed"
        value={completed}
        tone="success"
      />

      <SummaryTile
        label="Needs Attention"
        value={needsAttention}
        tone="warning"
      />

      <SummaryTile
        label="Argos Ready"
        value={argosReady}
        tone="success"
      />
    </div>
  );
}

type SummaryTileProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
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
}: SummaryTileProps) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 text-center leading-tight ${TONE_CLASSES[tone]}`}
    >
      <p
        className={`text-lg font-bold ${TONE_VALUE_CLASSES[tone]}`}
      >
        {value}
      </p>

      <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
