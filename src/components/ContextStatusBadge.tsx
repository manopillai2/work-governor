import type { ApplicationContextStatus } from "@/services/commandEngine";

export default function ContextStatusBadge({
  status,
}: {
  status: ApplicationContextStatus;
}) {
  const classes: Record<
    ApplicationContextStatus,
    string
  > = {
    Missing:
      "bg-red-950 text-red-300",
    Partial:
      "bg-amber-950 text-amber-300",
    Complete:
      "bg-emerald-950 text-emerald-300",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[status]}`}
    >
      Context: {status}
    </span>
  );
}
