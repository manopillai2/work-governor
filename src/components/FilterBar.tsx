"use client";

import type {
  Application,
  ControlStatus,
  Framework,
} from "@/services/commandEngine";
import {
  hasActiveFilters,
  type ApplicationFilterState,
  EMPTY_APPLICATION_FILTERS,
} from "@/services/applicationFilters";

const FRAMEWORK_OPTIONS: Framework[] = [
  "SOX",
  "PCI DSS",
];

const STATUS_OPTIONS: ControlStatus[] = [
  "New",
  "Checklist Review Pending",
  "In Progress",
  "Ready for Review",
  "Completed",
  "On Hold",
];

type FilterBarProps = {
  applications: Application[];
  filters: ApplicationFilterState;
  onChange: (
    filters: ApplicationFilterState
  ) => void;
  matchedApplicationCount: number;
  totalApplicationCount: number;
  matchedControlCount: number;
  totalControlCount: number;
};

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter(
        (current) => current !== value
      )
    : [...values, value];
}

function chipClass(selected: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    selected
      ? "border-blue-500 bg-blue-950 text-blue-200"
      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
  }`;
}

export default function FilterBar({
  applications,
  filters,
  onChange,
  matchedApplicationCount,
  totalApplicationCount,
  matchedControlCount,
  totalControlCount,
}: FilterBarProps) {
  const filtersActive = hasActiveFilters(filters);

  return (
    <div className="mb-3 shrink-0 space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="text"
          value={filters.search}
          onChange={(event) =>
            onChange({
              ...filters,
              search: event.target.value,
            })
          }
          placeholder="Search applications, controls, notes..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 md:flex-1"
        />

        {filtersActive && (
          <button
            type="button"
            onClick={() =>
              onChange(EMPTY_APPLICATION_FILTERS)
            }
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {applications.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Applications
          </p>

          <div className="flex flex-wrap gap-2">
            {applications.map((application) => (
              <button
                key={application.id}
                type="button"
                aria-pressed={filters.applicationIds.includes(
                  application.id
                )}
                onClick={() =>
                  onChange({
                    ...filters,
                    applicationIds: toggleValue(
                      filters.applicationIds,
                      application.id
                    ),
                  })
                }
                className={chipClass(
                  filters.applicationIds.includes(
                    application.id
                  )
                )}
              >
                {application.name || application.id}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Framework
          </p>

          <div className="flex flex-wrap gap-2">
            {FRAMEWORK_OPTIONS.map((framework) => (
              <button
                key={framework}
                type="button"
                aria-pressed={filters.frameworks.includes(
                  framework
                )}
                onClick={() =>
                  onChange({
                    ...filters,
                    frameworks: toggleValue(
                      filters.frameworks,
                      framework
                    ),
                  })
                }
                className={chipClass(
                  filters.frameworks.includes(
                    framework
                  )
                )}
              >
                {framework}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Control status
          </p>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filters.statuses.includes(
                  status
                )}
                onClick={() =>
                  onChange({
                    ...filters,
                    statuses: toggleValue(
                      filters.statuses,
                      status
                    ),
                  })
                }
                className={chipClass(
                  filters.statuses.includes(status)
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Showing {matchedApplicationCount} of{" "}
        {totalApplicationCount} application
        {totalApplicationCount === 1 ? "" : "s"} ·{" "}
        {matchedControlCount} of {totalControlCount}{" "}
        control{totalControlCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
