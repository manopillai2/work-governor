import type {
  Application,
  ComplianceControl,
  ControlStatus,
  Framework,
} from "./commandEngine";

export type ApplicationFilterState = {
  search: string;
  applicationIds: string[];
  frameworks: Framework[];
  statuses: ControlStatus[];
  clientCodes: string[];
};

export const EMPTY_APPLICATION_FILTERS: ApplicationFilterState =
  {
    search: "",
    applicationIds: [],
    frameworks: [],
    statuses: [],
    clientCodes: [],
  };

export function hasActiveFilters(
  filters: ApplicationFilterState
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.applicationIds.length > 0 ||
    filters.frameworks.length > 0 ||
    filters.statuses.length > 0 ||
    filters.clientCodes.length > 0
  );
}

// control.clientContext is stored as "CODE - Title" (see
// formatClientReferenceEntry); the filter only cares about the code.
function controlClientCode(
  control: ComplianceControl
): string {
  return control.clientContext.split(" - ")[0].trim();
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

  const clientCodeOk =
    filters.clientCodes.length === 0 ||
    filters.clientCodes.includes(
      controlClientCode(control)
    );

  return frameworkOk && statusOk && clientCodeOk;
}

export function filterApplications(
  applications: Application[],
  filters: ApplicationFilterState
): Application[] {
  const needle = filters.search.trim().toLowerCase();

  const hasFacetFilters =
    filters.frameworks.length > 0 ||
    filters.statuses.length > 0 ||
    filters.clientCodes.length > 0;

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
