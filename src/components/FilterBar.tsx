"use client";

import type {
  Application,
  ChecklistStatus,
  ControlStatus,
  Framework,
  QaScoreLevel,
} from "@/services/commandEngine";
import {
  getAvailableClientReferenceEntries,
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

const CHECKLIST_STATUS_OPTIONS: ChecklistStatus[] =
  [
    "Review Pending",
    "Approved",
    "Needs Revision",
    "Completed",
  ];

const QA_SCORE_OPTIONS: QaScoreLevel[] = [
  "Not Started",
  "Surface Level",
  "Developing",
  "Well Researched",
  "Argos Ready",
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

function HamburgerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M1 3h12M3.5 7h7M6 11h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

type FilterOption<T extends string> = {
  value: T;
  label: string;
  title?: string;
};

// One row per category: a compact "☰ Label" trigger, any currently
// selected options shown right next to it (stick around regardless of
// hover, so an active filter is never hidden from view), and the full
// option list revealed in a popover on hover -- no click/open state
// needed, pure CSS group-hover, and the popover sits flush against
// the trigger row (no margin gap) so moving the pointer from one into
// the other never drops out of :hover along the way.
function FilterCategory<T extends string>({
  categoryLabel,
  options,
  selected,
  onToggle,
}: {
  categoryLabel: string;
  options: FilterOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  const selectedOptions = options.filter(
    (option) => selected.includes(option.value)
  );

  return (
    <div className="group/cat relative">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
          <HamburgerIcon />
          {categoryLabel}
        </span>

        {selectedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => onToggle(option.value)}
            className={chipClass(true)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="invisible absolute left-0 top-full z-50 flex w-max max-w-xs flex-wrap gap-1.5 rounded-lg border border-slate-700 bg-slate-900 p-2 opacity-0 shadow-lg transition-opacity duration-100 group-hover/cat:visible group-hover/cat:opacity-100">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={selected.includes(
              option.value
            )}
            onClick={() => onToggle(option.value)}
            className={chipClass(
              selected.includes(option.value)
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
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

  const clientReferenceEntries =
    getAvailableClientReferenceEntries(
      applications
    );

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

      <div className="flex flex-wrap items-start gap-2">
        <FilterCategory
          categoryLabel="Framework"
          options={FRAMEWORK_OPTIONS.map(
            (framework) => ({
              value: framework,
              label: framework,
            })
          )}
          selected={filters.frameworks}
          onToggle={(value) =>
            onChange({
              ...filters,
              frameworks: toggleValue(
                filters.frameworks,
                value
              ),
            })
          }
        />

        <FilterCategory
          categoryLabel="Status"
          options={STATUS_OPTIONS.map(
            (status) => ({
              value: status,
              label: status,
            })
          )}
          selected={filters.statuses}
          onToggle={(value) =>
            onChange({
              ...filters,
              statuses: toggleValue(
                filters.statuses,
                value
              ),
            })
          }
        />

        <FilterCategory
          categoryLabel="Checklist"
          options={CHECKLIST_STATUS_OPTIONS.map(
            (status) => ({
              value: status,
              label: status,
            })
          )}
          selected={filters.checklistStatuses}
          onToggle={(value) =>
            onChange({
              ...filters,
              checklistStatuses: toggleValue(
                filters.checklistStatuses,
                value
              ),
            })
          }
        />

        <FilterCategory
          categoryLabel="QA Score"
          options={QA_SCORE_OPTIONS.map(
            (score) => ({
              value: score,
              label: score,
            })
          )}
          selected={filters.qaScores}
          onToggle={(value) =>
            onChange({
              ...filters,
              qaScores: toggleValue(
                filters.qaScores,
                value
              ),
            })
          }
        />

        <FilterCategory
          categoryLabel="Quick"
          options={[
            {
              value: "needsAttention",
              label: "Needs Attention",
            },
          ]}
          selected={
            filters.needsAttentionOnly
              ? ["needsAttention"]
              : []
          }
          onToggle={() =>
            onChange({
              ...filters,
              needsAttentionOnly:
                !filters.needsAttentionOnly,
            })
          }
        />

        <FilterCategory
          categoryLabel="Control"
          options={clientReferenceEntries.map(
            (entry) => ({
              value: entry.code,
              label: entry.code,
              title: entry.title,
            })
          )}
          selected={filters.clientCodes}
          onToggle={(value) =>
            onChange({
              ...filters,
              clientCodes: toggleValue(
                filters.clientCodes,
                value
              ),
            })
          }
        />

        {applications.length > 0 && (
          <FilterCategory
            categoryLabel="Apps"
            options={applications.map(
              (application) => ({
                value: application.id,
                label:
                  application.name ||
                  application.id,
              })
            )}
            selected={filters.applicationIds}
            onToggle={(value) =>
              onChange({
                ...filters,
                applicationIds: toggleValue(
                  filters.applicationIds,
                  value
                ),
              })
            }
          />
        )}
      </div>
    </div>
  );
}
