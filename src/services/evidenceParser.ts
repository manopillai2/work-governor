import { parseOffice } from "officeparser";
import type { SupportedFileType } from "officeparser";

const EXTENSION_TO_FILE_TYPE: Record<
  string,
  SupportedFileType
> = {
  docx: "docx",
  pptx: "pptx",
  xlsx: "xlsx",
  pdf: "pdf",
  csv: "csv",
  md: "md",
};

// .txt and .json aren't distinct officeparser file types -- read
// directly instead. Anything else falls outside what this app
// promises to parse (legacy .doc/.ppt/.xls binary formats are
// deliberately not supported here -- no reliable lightweight parser
// for them).
export const ALLOWED_EVIDENCE_EXTENSIONS = [
  "docx",
  "pptx",
  "xlsx",
  "pdf",
  "csv",
  "txt",
  "md",
  "json",
];

const MAX_STORED_TEXT_LENGTH = 300_000;

export function getFileExtension(
  filename: string
): string {
  const match = filename
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);

  return match ? match[1] : "";
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<{
  text: string;
  truncated: boolean;
}> {
  const extension = getFileExtension(filename);

  let rawText: string;

  if (extension === "txt") {
    rawText = buffer.toString("utf-8");
  } else if (extension === "json") {
    const raw = buffer.toString("utf-8");

    try {
      // Pretty-printed is far easier for the model to read
      // accurately than minified JSON; fall back to the raw text
      // if it doesn't actually parse.
      rawText = JSON.stringify(
        JSON.parse(raw),
        null,
        2
      );
    } catch {
      rawText = raw;
    }
  } else {
    const fileType =
      EXTENSION_TO_FILE_TYPE[extension];

    if (!fileType) {
      throw new Error(
        `Unsupported file type ".${extension}". Supported: ${ALLOWED_EVIDENCE_EXTENSIONS.join(", ")}.`
      );
    }

    const ast = await parseOffice(buffer, {
      fileType,
    });

    const result = await ast.to("text");
    rawText = String(result.value);
  }

  const truncated =
    rawText.length > MAX_STORED_TEXT_LENGTH;

  const text = truncated
    ? rawText.slice(0, MAX_STORED_TEXT_LENGTH)
    : rawText;

  return { text, truncated };
}
