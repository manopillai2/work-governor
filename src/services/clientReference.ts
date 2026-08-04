export type ClientReferenceEntry = {
  code: string;
  title: string;
};

// The user's fixed internal client control-code reference table.
// Single source of truth -- both the assistant's system prompt
// (src/app/api/assistant/route.ts) and the FilterBar's Control filter
// are derived from this so they can't drift apart.
export const CLIENT_REFERENCE_TABLE: ClientReferenceEntry[] = [
  { code: "IS02", title: "User provisioning" },
  { code: "IS03", title: "password application" },
  { code: "IS04", title: "UAR Infrastructure" },
  { code: "IS05", title: "UAR application" },
  { code: "IS06", title: "access termination" },
  { code: "IS07", title: "access SAP configuration" },
  { code: "IS08", title: "access SOD application" },
  { code: "CM11", title: "change management" },
  { code: "CM12", title: "change management dev SOD" },
  { code: "OP21", title: "computer operations batch monitoring" },
  { code: "OP22", title: "computer operations backup" },
  { code: "OP23", title: "computer operations IT asset validation" },
];

export function formatClientReferenceEntry(
  entry: ClientReferenceEntry
): string {
  return `${entry.code} - ${entry.title}`;
}
