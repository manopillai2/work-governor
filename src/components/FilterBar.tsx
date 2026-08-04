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
import { CLIENT_REFERENCE_TABLE } from "@/services/clientReference";

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
  return `rounded-full border px-2.5 py-1 text-xs font-medium transition ${
    selected
      ? "border-blue-500 bg-blue-950 text-blue-200"
      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
  }`;
}

function GroupLabel({
  children,
}: {
  children: string;
}) {
  return (
    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
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
    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
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
          className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <span className="shrink-0 text-xs text-slate-500">
          {matchedApplicationCount}/
          {totalApplicationCount} app
          {totalApplicationCount === 1 ? "" : "s"}{" "}
          · {matchedControlCount}/
          {totalControlCount} control
          {totalControlCount === 1 ? "" : "s"}
        </span>

        {filtersActive && (
          <button
            type="button"
            onClick={() =>
              onChange(EMPTY_APPLICATION_FILTERS)
            }
            className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <GroupLabel>Framework</GroupLabel>

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

        <div className="flex flex-wrap items-center gap-1.5">
          <GroupLabel>Status</GroupLabel>

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

        <div className="flex flex-wrap items-center gap-1.5">
          <GroupLabel>Control</GroupLabel>

          {CLIENT_REFERENCE_TABLE.map((entry) => (
            <button
              key={entry.code}
              type="button"
              title={entry.title}
              aria-pressed={filters.clientCodes.includes(
                entry.code
              )}
              onClick={() =>
                onChange({
                  ...filters,
                  clientCodes: toggleValue(
                    filters.clientCodes,
                    entry.code
                  ),
                })
              }
              className={chipClass(
                filters.clientCodes.includes(
                  entry.code
                )
              )}
            >
              {entry.code}
            </button>
          ))}
        </div>

        {applications.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <GroupLabel>Apps</GroupLabel>

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
        )}
      </div>
    </div>
  );
}
