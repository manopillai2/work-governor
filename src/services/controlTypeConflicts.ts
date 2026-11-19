import { CLIENT_REFERENCE_TABLE, normalizeClientReferenceContext } from "./clientReference";
import { findApplication, normalizeApplicationId, type Application, type Command } from "./commandEngine";

// Guards against creating two controls of the same control type (client
// code: IS02, IS05, CM11 ...) on one application without the user
// meaning to. Checked in the app before a CREATE_APPLICATION or
// ADD_CONTROL command is applied, so it holds no matter what the
// assistant proposed:
//   - CREATE_APPLICATION: two or more listed controls share a code.
//   - ADD_CONTROL: the application already has a control with that code.
// Controls without a client code can't be typed and are never flagged.

export type ControlTypeConflict = {
  kind: "create" | "add";
  applicationName: string;
  groups: {
    code: string;
    title: string;
    existing: string[]; // already on the application (ADD_CONTROL)
    incoming: string[]; // being created now
  }[];
};

export function clientCodeOf(clientContext: string | undefined): string {
  const normalized = normalizeClientReferenceContext(String(clientContext ?? ""));
  return normalized.split(" - ")[0]?.trim().toUpperCase() ?? "";
}

const titleOf = (code: string) => CLIENT_REFERENCE_TABLE.find((e) => e.code === code)?.title ?? code;

export function findControlTypeConflicts(command: Command, applications: Application[]): ControlTypeConflict | null {
  if (command.action === "CREATE_APPLICATION") {
    const byCode = new Map<string, string[]>();
    for (const c of command.payload.controls ?? []) {
      const name = String(c.name ?? "").trim();
      const code = clientCodeOf(c.clientContext);
      if (!name || !code) continue;
      byCode.set(code, [...(byCode.get(code) ?? []), name]);
    }
    const groups = [...byCode.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([code, names]) => ({ code, title: titleOf(code), existing: [], incoming: names }));
    return groups.length ? { kind: "create", applicationName: command.payload.application, groups } : null;
  }

  if (command.action === "ADD_CONTROL") {
    const code = clientCodeOf(command.payload.clientContext);
    if (!code) return null;
    const application = findApplication(applications, normalizeApplicationId(command.payload.application));
    if (!application) return null;
    const existing = application.controls.filter((c) => clientCodeOf(c.clientContext) === code).map((c) => c.name);
    if (existing.length === 0) return null;
    return {
      kind: "add",
      applicationName: application.name,
      groups: [{ code, title: titleOf(code), existing, incoming: [String(command.payload.control ?? "").trim()] }],
    };
  }

  return null;
}

// "Keep one per type": for CREATE_APPLICATION, drop every control after
// the first of each conflicting code.
export function keepOnePerControlType(command: Command): Command {
  if (command.action !== "CREATE_APPLICATION") return command;
  const seen = new Set<string>();
  return {
    ...command,
    payload: {
      ...command.payload,
      controls: (command.payload.controls ?? []).filter((c) => {
        const code = clientCodeOf(c.clientContext);
        if (!code) return true;
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      }),
    },
  };
}

// The question as a chat message, so the conversation shows what was
// asked.
export function describeConflict(conflict: ControlTypeConflict): string {
  const lines = conflict.groups.map((g) =>
    conflict.kind === "add"
      ? `- **${g.code} (${g.title})** — ${conflict.applicationName} already has: ${g.existing.map((n) => `"${n}"`).join(", ")}. You asked to add "${g.incoming[0]}".`
      : `- **${g.code} (${g.title})** — ${g.incoming.length} controls: ${g.incoming.map((n) => `"${n}"`).join(", ")}.`
  );
  const lead =
    conflict.kind === "add"
      ? `Before I add this control: ${conflict.applicationName} already has a control of the same type.`
      : `Before I create ${conflict.applicationName}: some of the listed controls share the same control type.`;
  return `${lead}\n\n${lines.join("\n")}\n\nPlease confirm how to proceed in the dialog.`;
}
