import type { Note } from "@/services/commandEngine";

export function noteSourceLabel(
  note: Note
): string | null {
  if (!note.sourceDocumentFilename) {
    return null;
  }

  const kindLabel =
    note.sourceKind === "data"
      ? "data"
      : "evidence";

  return `Coming from ${kindLabel}: ${note.sourceDocumentFilename}`;
}
