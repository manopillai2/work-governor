import type {
  Application,
  ChecklistStatus,
  ComplianceControl,
  ControlStatus,
  Framework,
  QaScoreLevel,
} from "./commandEngine";
import {
  CLIENT_REFERENCE_TABLE,
  type ClientReferenceEntry,
} from "./clientReference";

export type ApplicationFilterState = {
  search: string;
  applicationIds: string[];
  frameworks: Framework[];
  statuses: ControlStatus[];
  checklistStatuses: ChecklistStatus[];
  qaScores: QaScoreLevel[];
  clientCodes: string[];
  // Composite quick filter (On Hold OR checklist Needs Revision) --
  // can't be expressed as a plain facet-array intersection since it
  // spans two different fields with an OR between them, so it gets
  // its own flag rather than living in `statuses`/`checklistStatuses`.
  needsAttentionOnly: boolean;
};

export const EMPTY_APPLICATION_FILTERS: ApplicationFilterState =
  {
    search: "",
    applicationIds: [],
    frameworks: [],
    statuses: [],
    checklistStatuses: [],
    qaScores: [],
    clientCodes: [],
    needsAttentionOnly: false,
  };

export function hasActiveFilters(
  filters: ApplicationFilterState
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.applicationIds.length > 0 ||
    filters.frameworks.length > 0 ||
    filters.statuses.length > 0 ||
    filters.checklistStatuses.length > 0 ||
    filters.qaScores.length > 0 ||
    filters.clientCodes.length > 0 ||
    filters.needsAttentionOnly
  );
}

// Dashboard tile -> filter state, one per ProgressSummary tile except
// "Applications" (which navigates to the Application View instead of
// filtering this page). Each replaces the current filters entirely --
// a drill-down should show exactly that bucket, not combine with
// whatever else was already selected.
export type QuickFilterKey =
  | "controls"
  | "notStarted"
  | "inProgress"
  | "completed"
  | "needsAttention"
  | "argosReady";

export function buildQuickFilterState(
  key: QuickFilterKey
): ApplicationFilterState {
  switch (key) {
    case "notStarted":
      return {
        ...EMPTY_APPLICATION_FILTERS,
        statuses: [
          "New",
          "Checklist Review Pending",
        ],
      };
    case "inProgress":
      return {
        ...EMPTY_APPLICATION_FILTERS,
        statuses: [
          "In Progress",
          "Ready for Review",
        ],
      };
    case "completed":
      return {
        ...EMPTY_APPLICATION_FILTERS,
        statuses: ["Completed"],
      };
    case "needsAttention":
      return {
        ...EMPTY_APPLICATION_FILTERS,
        needsAttentionOnly: true,
      };
    case "argosReady":
      return {
        ...EMPTY_APPLICATION_FILTERS,
        qaScores: ["Argos Ready"],
      };
    case "controls":
    default:
      return EMPTY_APPLICATION_FILTERS;
  }
}

// control.clientContext is stored as "CODE - Title" (see
// formatClientReferenceEntry); the filter only cares about the code.
export function controlClientCode(
  control: ComplianceControl
): string {
  return control.clientContext.split(" - ")[0].trim();
}

// The fixed table only has the 12 permanent codes -- the Learning
// Engine can add more (client_reference_learnings, approved through
// the learning review flow), and those show up on real controls'
// clientContext without ever appearing in CLIENT_REFERENCE_TABLE.
// Rather than a second API call just to list them, derive the extra
// entries directly from whatever codes are actually in use right now,
// so the filter never lags behind what's really on the data.
export function getAvailableClientReferenceEntries(
  applications: Application[]
): ClientReferenceEntry[] {
  const knownCodes = new Set(
    CLIENT_REFERENCE_TABLE.map((entry) =>
      entry.code.toLowerCase()
    )
  );

  const extra = new Map<string, ClientReferenceEntry>();

  for (const application of applications) {
    for (const control of application.controls) {
      const raw = control.clientContext.trim();

      if (!raw) {
        continue;
      }

      const [codePart, ...titleParts] =
        raw.split(" - ");
      const code = codePart.trim();

      if (
        !code ||
        knownCodes.has(code.toLowerCase()) ||
        extra.has(code.toLowerCase())
      ) {
        continue;
      }

      extra.set(code.toLowerCase(), {
        code,
        title: titleParts.join(" - ").trim(),
      });
    }
  }

  return [
    ...CLIENT_REFERENCE_TABLE,
    ...Array.from(extra.values()),
  ];
}

function textMatches(
  value: string | undefined,
  needle: string
): boolean {
  return Boolean(value) && value!.toLowerCase().includes(needle);
}

function applicationTextMatches(
  application: Application,
  needle: string
): boolean {
  return (
    textMatches(application.id, needle) ||
    textMatches(application.name, needle)
  );
}

function controlTextMatches(
  control: ComplianceControl,
  needle: string
): boolean {
  return (
    textMatches(control.id, needle) ||
    textMatches(control.name, needle) ||
    textMatches(control.controlObjective, needle) ||
    textMatches(control.controlRisk, needle) ||
    textMatches(control.applicabilityRationale, needle) ||
    textMatches(control.evidenceStrategy, needle) ||
    textMatches(control.argosObjective, needle) ||
    textMatches(
      control.globalControlReference,
      needle
    ) ||
    textMatches(control.clientContext, needle) ||
    control.notes.some((note) =>
      textMatches(note.text, needle)
    )
  );
}

function controlMatchesFacets(
  control: ComplianceControl,
  filters: ApplicationFilterState
): boolean {
  const frameworkOk =
    filters.frameworks.length === 0 ||
    filters.frameworks.includes(control.framework);

  const statusOk =
    filters.statuses.length === 0 ||
    filters.statuses.includes(control.controlStatus);

  const checklistStatusOk =
    filters.checklistStatuses.length === 0 ||
    filters.checklistStatuses.includes(
      control.checklistStatus
    );

  const qaScoreOk =
    filters.qaScores.length === 0 ||
    filters.qaScores.includes(control.qaScore);

  const clientCodeOk =
    filters.clientCodes.length === 0 ||
    filters.clientCodes.includes(
      controlClientCode(control)
    );

  const needsAttentionOk =
    !filters.needsAttentionOnly ||
    control.controlStatus === "On Hold" ||
    control.checklistStatus === "Needs Revision";

  return (
    frameworkOk &&
    statusOk &&
    checklistStatusOk &&
    qaScoreOk &&
    clientCodeOk &&
    needsAttentionOk
  );
}

export type FlatControlEntry = {
  application: Application;
  control: ComplianceControl;
};

export function toFlatControlEntries(
  applications: Application[]
): FlatControlEntry[] {
  return applications.flatMap((application) =>
    application.controls.map((control) => ({
      application,
      control,
    }))
  );
}

export function filterApplications(
  applications: Application[],
  filters: ApplicationFilterState
): Application[] {
  const needle = filters.search.trim().toLowerCase();

  const hasFacetFilters =
    filters.frameworks.length > 0 ||
    filters.statuses.length > 0 ||
    filters.checklistStatuses.length > 0 ||
    filters.qaScores.length > 0 ||
    filters.clientCodes.length > 0 ||
    filters.needsAttentionOnly;

  return applications.reduce<Application[]>(
    (result, application) => {
      if (
        filters.applicationIds.length > 0 &&
        !filters.applicationIds.includes(
          application.id
        )
      ) {
        return result;
      }

      const applicationMatchesSearch =
        !needle ||
        applicationTextMatches(application, needle);

      // An application-level search match reveals every one of its
      // facet-passing controls; otherwise only controls whose own
      // text matches the search survive.
      const visibleControls =
        application.controls.filter(
          (control) =>
            controlMatchesFacets(control, filters) &&
            (!needle ||
              applicationMatchesSearch ||
              controlTextMatches(control, needle))
        );

      if (visibleControls.length === 0) {
        const emptyApplicationQualifies =
          application.controls.length === 0 &&
          !hasFacetFilters &&
          (!needle || applicationMatchesSearch);

        if (!emptyApplicationQualifies) {
          return result;
        }
      }

      result.push({
        ...application,
        controls: visibleControls,
      });

      return result;
    },
    []
  );
}
