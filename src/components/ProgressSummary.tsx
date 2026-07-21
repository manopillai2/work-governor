// ======================================================
// Component Name : ProgressSummary
// Purpose        : Displays dashboard summary cards
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
    <aside className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Progress Summary
      </h2>

      <div className="mt-6 space-y-4">
        <SummaryCard
          label="Applications"
          value={applications.toString()}
        />

        <SummaryCard
          label="Compliance Controls"
          value={controls.toString()}
        />

        <SummaryCard
          label="Not Started"
          value={notStarted.toString()}
        />

        <SummaryCard
          label="In Progress"
          value={inProgress.toString()}
        />

        <SummaryCard
          label="Completed"
          value={completed.toString()}
          tone="success"
        />

        <SummaryCard
          label="Needs Attention"
          value={needsAttention.toString()}
          tone="warning"
        />

        <SummaryCard
          label="Argos Ready"
          value={argosReady.toString()}
          tone="success"
        />
      </div>
    </aside>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
};

const TONE_CLASSES: Record<
  NonNullable<SummaryCardProps["tone"]>,
  string
> = {
  default: "border-slate-200",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
};

const TONE_VALUE_CLASSES: Record<
  NonNullable<SummaryCardProps["tone"]>,
  string
> = {
  default: "text-slate-900",
  success: "text-emerald-700",
  warning: "text-amber-700",
};

function SummaryCard({
  label,
  value,
  tone = "default",
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${TONE_CLASSES[tone]}`}
    >
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${TONE_VALUE_CLASSES[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}
