import { jsPDF } from "jspdf";
import type { CellHookData } from "jspdf-autotable";

import type {
  Application,
  ChecklistTask,
  ComplianceControl,
  ControlStatus,
  Note,
} from "./commandEngine";
import { splitApplicationName } from "./applicationName";
import { PDF, PDF_SIZE, PDF_STATUS, registerPdfFonts, setPdfFont, themedTable } from "./pdfTheme";
import { controlUploadState } from "./uploads";
import { controlTypeKey, needsAttention } from "./controlMetrics";
import { computeExecutiveMetrics, executiveNarrative } from "./executiveMetrics";

// "Uploaded (2 files)" / "Not uploaded" for one upload kind.
function uploadedLabel(
  control: Pick<ComplianceControl, "notes" | "nextTasks">,
  kind: "evidence" | "testing"
): string {
  const state = controlUploadState(control)[kind];
  if (!state.uploaded) return "Not uploaded";
  return state.files.length
    ? `Uploaded (${state.files.length} file${state.files.length === 1 ? "" : "s"})`
    : "Uploaded";
}

// Two-line uploads cell for the work progress tables.
function uploadsSummary(
  control: Pick<ComplianceControl, "notes" | "nextTasks">
): string {
  const state = controlUploadState(control);
  return `Evidence: ${state.evidence.uploaded ? "Yes" : "No"}\nTesting data: ${state.testing.uploaded ? "Yes" : "No"}`;
}

const CONTROL_STATUS_ORDER: ControlStatus[] = [
  "Completed",
  "Ready for Review",
  "In Progress",
  "Checklist Review Pending",
  "New",
  "On Hold",
];

function formatGeneratedTimestamp(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
}

function formatPercent(
  numerator: number,
  denominator: number
): string {
  if (denominator === 0) {
    return "0%";
  }

  return `${Math.round(
    (numerator / denominator) * 100
  )}%`;
}

function countControlsByStatus(
  applications: Application[],
  status: ControlStatus
): number {
  return applications.reduce(
    (total, application) =>
      total +
      application.controls.filter(
        (control) => control.controlStatus === status
      ).length,
    0
  );
}

function getFinalY(doc: jsPDF): number {
  return (
    doc as unknown as {
      lastAutoTable: { finalY: number };
    }
  ).lastAutoTable.finalY;
}

// Draws a colored banner-style section heading (used by the executive
// and per-application/control PDFs) and returns the Y position to
// start content below it.
function drawSectionBanner(
  doc: jsPDF,
  text: string,
  marginX: number,
  y: number,
  pageWidth: number,
  // Kept for call-site compatibility; headings use the app's teal accent.
  _color?: [number, number, number]
): number {
  void _color;
  void pageWidth;
  // The app's section heading: a 3pt teal bar and a small uppercase,
  // letter-spaced label.
  doc.setFillColor(...PDF.teal);
  doc.rect(marginX, y, 2.5, 13, "F");
  setPdfFont(doc, "bold");
  doc.setFontSize(PDF_SIZE.section);
  doc.setTextColor(...PDF.text);
  doc.text(text.toUpperCase(), marginX + 9, y + 10, { charSpace: 0.6 });
  return y + 22;
}

// Adds a new page and returns the reset Y if the given content height
// won't fit before the page bottom; otherwise returns y unchanged.
function ensureRoom(
  doc: jsPDF,
  y: number,
  neededHeight: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + neededHeight > pageHeight - 40) {
    doc.addPage();
    return 40;
  }
  return y;
}

function formatNoteList(notes: Note[]): string {
  if (notes.length === 0) {
    return "—";
  }

  return notes
    .map((note) => {
      const tag =
        note.sourceKind === "manual"
          ? ""
          : `[${note.sourceKind}${
              note.sourceDocumentFilename
                ? `: ${note.sourceDocumentFilename}`
                : ""
            }${note.documentDeleted ? ", source deleted" : ""}] `;
      return `${tag}${note.text}`;
    })
    .join("\n");
}

function describeTaskStatus(task: ChecklistTask): string {
  if (task.irrelevant) {
    return `Irrelevant${
      task.irrelevantReason ? ` — ${task.irrelevantReason}` : ""
    }`;
  }
  if (task.completed) {
    return "Completed";
  }
  return task.required ? "Required" : "Optional";
}

// Everything the shared control-detail renderer needs -- a structural
// subset of ComplianceControl so it can be called both with a full
// control (application export, looping application.controls) and with
// ControlCard's already-destructured local props (control export),
// without either caller needing to construct an object it doesn't have
// the full shape for.
export type ControlDetailInput = {
  name: string;
  framework: string;
  stage: string;
  controlStatus: string;
  checklistStatus: string;
  globalControlReference: string;
  clientContext: string;
  controlObjective: string;
  controlRisk: string;
  applicabilityRationale: string;
  evidenceStrategy: string;
  evidenceDataGapAnalysis: string;
  evidenceDataGapAnalysisStale: boolean;
  notes: Note[];
  nextTasks: ChecklistTask[];
  checklistChangeLog: {
    timestamp: string;
    changeType: string;
    taskText: string;
    reason: string;
    changedBy: string;
  }[];
};

// Draws one control's complete detail block (info table, checklist
// tasks, control notes, change log) starting at startY, paginating as
// needed, and returns the Y position after the last thing drawn. Used
// by both generateApplicationSummaryPdf (once per control) and
// generateControlSummaryPdf (once, for a single control).
function renderControlDetailSection(
  doc: jsPDF,
  marginX: number,
  pageWidth: number,
  startY: number,
  control: ControlDetailInput
): number {
  let y = ensureRoom(doc, startY, 60);

  y = drawSectionBanner(
    doc,
    control.name,
    marginX,
    y,
    pageWidth,
    [67, 56, 202]
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    body: [
      ["Framework", control.framework, "Stage", control.stage],
      [
        "Control Status",
        control.controlStatus,
        "Checklist Status",
        control.checklistStatus,
      ],
      [
        "Global Control Reference",
        control.globalControlReference || "—",
        "Client Context",
        control.clientContext || "—",
      ],
      [
        "Evidence",
        uploadedLabel(control, "evidence"),
        "Testing Data",
        uploadedLabel(control, "testing"),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 130 },
      2: { fontStyle: "bold", cellWidth: 130 },
    },
  });
  y = getFinalY(doc) + 14;

  const narrativeFields: [string, string][] = [
    ["Control Objective", control.controlObjective],
    ["Risk Addressed", control.controlRisk],
    [
      "Why This Control Applies",
      control.applicabilityRationale,
    ],
    ["Evidence Strategy", control.evidenceStrategy],
  ];

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Field", "Detail"]],
    body: narrativeFields.map(([label, value]) => [
      label,
      value || "Not yet captured.",
    ]),
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 140, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 14;

  y = ensureRoom(doc, y, 40);
  setPdfFont(doc, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF.teal);
  doc.text(
    `Evidence vs. Testing Data Gap Analysis${
      control.evidenceDataGapAnalysisStale
        ? " (stale — a source document was deleted since this was written)"
        : ""
    }`,
    marginX,
    y
  );
  doc.setTextColor(...PDF.text);
  y += 10;
  y =
    drawMarkdownField(
      doc,
      control.evidenceDataGapAnalysis,
      marginX,
      y,
      pageWidth - marginX * 2
    ) + 10;

  y = ensureRoom(doc, y, 60);
  setPdfFont(doc, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF.teal);
  doc.text(
    `Checklist (${
      control.nextTasks.filter((t) => t.completed).length
    }/${control.nextTasks.length} completed)`,
    marginX,
    y
  );
  doc.setTextColor(...PDF.text);
  y += 10;

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["#", "Task", "Category", "Status", "Notes"]],
    body:
      control.nextTasks.length > 0
        ? control.nextTasks.map((task, index) => [
            String(index + 1),
            task.text,
            task.category,
            describeTaskStatus(task),
            formatNoteList(task.notes),
          ])
        : [["—", "No checklist tasks.", "—", "—", "—"]],
    didParseCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 3
      ) {
        const value = String(data.cell.raw);
        if (value === "Completed") {
          data.cell.styles.textColor = PDF.green;
        } else if (value.startsWith("Irrelevant")) {
          data.cell.styles.textColor = PDF.faint;
        } else if (value === "Required") {
          data.cell.styles.textColor = PDF.orange;
        }
      }
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 80 },
      3: { cellWidth: 75 },
      4: { cellWidth: 130 },
    },
  });
  y = getFinalY(doc) + 14;

  y = ensureRoom(doc, y, 40);
  setPdfFont(doc, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF.teal);
  doc.text("Control Notes", marginX, y);
  doc.setTextColor(...PDF.text);
  y += 10;

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Date", "Source", "Note"]],
    body:
      control.notes.length > 0
        ? control.notes.map((note) => [
            new Date(note.createdAt).toLocaleDateString(),
            note.sourceKind,
            note.text,
          ])
        : [["—", "—", "No notes recorded on this control directly."]],
    styles: { fontSize: 8.5, cellPadding: 5, valign: "top" },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 60 },
      2: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 14;

  if (control.checklistChangeLog.length > 0) {
    y = ensureRoom(doc, y, 40);
    setPdfFont(doc, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF.teal);
    doc.text("Checklist Change Log", marginX, y);
    doc.setTextColor(...PDF.text);
    y += 10;

    themedTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [["Date", "Type", "Task", "Reason", "By"]],
      body: control.checklistChangeLog.map((entry) => [
        new Date(entry.timestamp).toLocaleDateString(),
        entry.changeType,
        entry.taskText,
        entry.reason,
        entry.changedBy,
      ]),
      styles: { fontSize: 8, cellPadding: 5, valign: "top" },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 70 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 130 },
        4: { cellWidth: 55 },
      },
    });
    y = getFinalY(doc) + 14;
  }

  return y;
}

function drawPageFooters(doc: jsPDF, marginX: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setPdfFont(doc, "normal");
    doc.setFontSize(PDF_SIZE.small);
    doc.setTextColor(...PDF.faint);
    doc.setDrawColor(...PDF.divider);
    doc.setLineWidth(0.6);
    doc.line(
      marginX,
      doc.internal.pageSize.getHeight() - 32,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 32
    );
    doc.text(
      "Control Governor · Compliance hub",
      marginX,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
    doc.setTextColor(...PDF.text);
  }
}

// ---- Minimal markdown rendering for jsPDF ----
// The AI writes evidenceDataGapAnalysis/evidenceDataGapSummary as
// markdown (## headings, "- " bullets, "**bold**" inline) -- the app
// already renders it that way on-screen via ReactMarkdown
// (ControlCard.tsx's GAP_ANALYSIS_MARKDOWN_COMPONENTS). Everywhere
// else on Application/ComplianceControl is plain prose, so only these
// two fields need this.

type MdToken = { text: string; bold: boolean };

function tokenizeInline(text: string): MdToken[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .flatMap((part) => {
      const isBold = part.startsWith("**") && part.endsWith("**");
      const clean = isBold ? part.slice(2, -2) : part;
      return clean
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({ text: word, bold: isBold }));
    });
}

// Word-wraps text with inline **bold** support at (x, y), constrained
// to maxWidth, paginating mid-paragraph if needed, and returns the Y
// position after the last line drawn.
function drawInlineMarkdown(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
): number {
  const tokens = tokenizeInline(text);
  if (tokens.length === 0) {
    return y;
  }

  doc.setFontSize(fontSize);
  setPdfFont(doc, "normal");
  const spaceWidth = doc.getTextWidth(" ");
  const pageHeight = doc.internal.pageSize.getHeight();

  let cursorX = x;
  let cursorY = y;
  let firstOnLine = true;

  const newLine = () => {
    cursorY += lineHeight;
    cursorX = x;
    firstOnLine = true;
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 40;
    }
  };

  for (const token of tokens) {
    setPdfFont(doc, token.bold ? "bold" : "normal");
    const wordWidth = doc.getTextWidth(token.text);
    const neededWidth =
      wordWidth + (firstOnLine ? 0 : spaceWidth);

    if (
      !firstOnLine &&
      cursorX + neededWidth > x + maxWidth
    ) {
      newLine();
    }

    if (!firstOnLine) {
      cursorX += spaceWidth;
    }

    doc.text(token.text, cursorX, cursorY);
    cursorX += wordWidth;
    firstOnLine = false;
  }

  setPdfFont(doc, "normal");
  return cursorY + lineHeight;
}

type MdBlock =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string; marker: string }
  | { type: "paragraph"; text: string };

function parseMarkdownBlocks(markdown: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paragraph.join(" ").trim(),
      });
      paragraph = [];
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.*)/);
    if (heading) {
      flush();
      blocks.push({ type: "heading", text: heading[1].trim() });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)/);
    if (bullet) {
      flush();
      blocks.push({
        type: "bullet",
        text: bullet[1].trim(),
        marker: "•",
      });
      continue;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.*)/);
    if (numbered) {
      flush();
      blocks.push({
        type: "bullet",
        text: numbered[2].trim(),
        marker: `${numbered[1]}.`,
      });
      continue;
    }

    paragraph.push(line);
  }
  flush();

  return blocks;
}

// Renders a full markdown-formatted field (headings/bullets/bold) at
// marginX, paginating between blocks as needed, and returns the Y
// position after the last thing drawn.
function drawMarkdownField(
  doc: jsPDF,
  markdown: string,
  marginX: number,
  startY: number,
  maxWidth: number
): number {
  const blocks = parseMarkdownBlocks(
    markdown || "Not yet captured."
  );
  let y = startY;
  const bodyFontSize = 9;
  const bodyLineHeight = 12;

  for (const block of blocks) {
    if (block.type === "heading") {
      y = ensureRoom(doc, y, 30);
      y += 4;
      setPdfFont(doc, "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...PDF.teal);
      doc.text(block.text, marginX, y);
      doc.setTextColor(...PDF.text);
      setPdfFont(doc, "normal");
      y += bodyLineHeight;
    } else if (block.type === "bullet") {
      y = ensureRoom(doc, y, bodyLineHeight * 2);
      setPdfFont(doc, "normal");
      doc.setFontSize(bodyFontSize);
      doc.text(block.marker, marginX, y);
      const indent = 14;
      y = drawInlineMarkdown(
        doc,
        block.text,
        marginX + indent,
        y,
        maxWidth - indent,
        bodyFontSize,
        bodyLineHeight
      );
      y += 2;
    } else {
      y = ensureRoom(doc, y, bodyLineHeight * 2);
      y = drawInlineMarkdown(
        doc,
        block.text,
        marginX,
        y,
        maxWidth,
        bodyFontSize,
        bodyLineHeight
      );
      y += 6;
    }
  }

  return y;
}

function fileTimestampSlug(): string {
  return new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-");
}

// Traffic-light coloring used for every progress bar/percentage in the
// executive report: red under 40%, amber 40-74%, green 75%+.
function colorForPercent(
  pct: number
): [number, number, number] {
  if (pct >= 75) {
    return PDF.green;
  }
  if (pct >= 40) {
    return PDF.orange;
  }
  return PDF.red;
}

function drawStatCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  color: [number, number, number]
): void {
  // The app's stat tile: white, hairline border, coloured left edge,
  // big dark value, small uppercase muted label.
  doc.setFillColor(...PDF.card);
  doc.setDrawColor(...PDF.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 5, 5, "FD");
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 3, h, 1.5, 1.5, "F");
  setPdfFont(doc, "bold");
  doc.setFontSize(PDF_SIZE.stat);
  doc.setTextColor(...PDF.text);
  doc.text(value, x + 12, y + h / 2 + 2);
  // Label shrinks to fit the tile rather than running past it.
  setPdfFont(doc, "bold");
  const labelText = label.toUpperCase();
  const room = w - 18;
  let size = 6.4;
  doc.setFontSize(size);
  while (size > 4.8 && doc.getTextWidth(labelText) + labelText.length * 0.3 > room) {
    size -= 0.2;
    doc.setFontSize(size);
  }
  doc.setTextColor(...PDF.muted);
  doc.text(labelText, x + 12, y + h - 10, { charSpace: 0.3 });
  doc.setTextColor(...PDF.text);
}

function rawRowValue(
  row: CellHookData["row"],
  columnIndex: number
): unknown {
  const raw = row.raw;
  return Array.isArray(raw) ? raw[columnIndex] : undefined;
}

// Blanks the default cell text and instead draws a colored progress
// bar with a centered percentage label -- used for every "% Complete"
// column in the executive report. Reads/writes through data.doc
// (the same jsPDF instance the table itself is drawing into) rather
// than closing over an outer variable, since autoTable invokes these
// hooks itself.
function progressBarColumn(
  columnIndex: number,
  // Bar colour; defaults to the completion traffic light. Share-of-total
  // columns pass the row's own colour instead.
  colorFor: (pct: number, row: CellHookData["row"]) => [number, number, number] = (pct) => colorForPercent(pct)
) {
  return {
    didParseCell: (data: CellHookData) => {
      if (
        data.section === "body" &&
        data.column.index === columnIndex
      ) {
        data.cell.text = [""];
      }
    },
    didDrawCell: (data: CellHookData) => {
      if (
        data.section !== "body" ||
        data.column.index !== columnIndex
      ) {
        return;
      }

      const doc = data.doc as jsPDF;
      const pctStr = String(
        rawRowValue(data.row, columnIndex) ?? "0%"
      );
      const pct = parseInt(pctStr, 10) || 0;
      const { x, y, width, height } = data.cell;
      const padX = 4;
      const barH = 7;
      const barY = y + height - padX - barH;
      const barW = width - padX * 2;

      doc.setFillColor(...PDF.divider);
      doc.roundedRect(
        x + padX,
        barY,
        barW,
        barH,
        2,
        2,
        "F"
      );

      const color = colorFor(pct, data.row);
      doc.setFillColor(...color);
      doc.roundedRect(
        x + padX,
        barY,
        (barW * Math.min(pct, 100)) / 100,
        barH,
        2,
        2,
        "F"
      );

      setPdfFont(doc, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF.text);
      doc.text(pctStr, x + width / 2, y + padX + 6, {
        align: "center",
      });
      doc.setTextColor(...PDF.text);
    },
  };
}

// Comprehensive single-application export: every context field, the
// application-level evidence-vs-data summary, work progress and Argos
// rollups, and a full detail section for every
// control -- objective/risk/rationale/strategy, uploads, evidence-vs-testing-data
// analysis, the complete checklist with per-task notes, control notes,
// and the checklist change log. Nothing on the Application or
// ComplianceControl types is left out.
export function generateApplicationSummaryPdf(
  application: Application
): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  registerPdfFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  const { appName, context } = splitApplicationName(
    application.name
  );
  const title = context ? `${appName} (${context})` : appName;

  doc.setFillColor(...PDF.teal);
  doc.rect(0, 0, pageWidth, 5, "F");
  setPdfFont(doc, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF.teal);
  doc.text("CONTROL GOVERNOR · COMPLIANCE HUB", marginX, 30, { charSpace: 0.8 });
  doc.setTextColor(...PDF.text);
  setPdfFont(doc, "bold");
  doc.setFontSize(PDF_SIZE.title - 2);
  doc.text(`${title} — Application Summary`, marginX, 52);

  setPdfFont(doc, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF.muted);
  doc.text(
    `Hosting: ${application.hosting || "Unknown"}   |   Context: ${application.contextStatus}   |   ${application.controls.length} control${application.controls.length === 1 ? "" : "s"}`,
    marginX,
    68
  );
  doc.text(
    `Generated ${formatGeneratedTimestamp()} — Developed by Manoj`,
    marginX,
    84
  );
  doc.setTextColor(...PDF.text);

  let y = 104;

  y = drawSectionBanner(
    doc,
    "Application Context",
    marginX,
    y,
    pageWidth,
    [37, 99, 235]
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    body: [
      ["Purpose", application.applicationPurpose || "—"],
      ["Business Process", application.businessProcess || "—"],
      ["Application Owner", application.applicationOwner || "—"],
      ["Technical Owner", application.technicalOwner || "—"],
      [
        "Contacts",
        application.applicationContacts.join(", ") || "—",
      ],
      [
        "Integrations",
        application.integrations.join(", ") || "—",
      ],
      [
        "Identity Types",
        application.identityTypes.join(", ") || "—",
      ],
      ["Hosting Details", application.hostingDetails || "—"],
      [
        "Data Classification",
        application.dataClassification || "—",
      ],
      [
        "Financial Relevance",
        application.financialRelevance || "—",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 150, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 20;

  y = drawSectionBanner(
    doc,
    "Evidence vs. Testing Data Summary",
    marginX,
    y,
    pageWidth,
    [5, 150, 105]
  );
  if (application.evidenceDataGapSummaryStale) {
    setPdfFont(doc, "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF.orange);
    doc.text(
      "Stale — a source document was deleted since this was written.",
      marginX,
      y
    );
    doc.setTextColor(...PDF.text);
    y += 14;
  }
  y =
    drawMarkdownField(
      doc,
      application.evidenceDataGapSummary ||
        "No evidence-vs-testing-data summary has been generated yet.",
      marginX,
      y,
      pageWidth - marginX * 2
    ) + 10;

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Work Progress",
    marginX,
    y,
    pageWidth,
    [217, 119, 6]
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Control", "Uploads", "Progress Summary"]],
    body:
      application.controls.length > 0
        ? application.controls.map((control) => [
            control.name,
            uploadsSummary(control),
            control.progressSummary ||
              "No work notes captured yet.",
          ])
        : [["—", "—", "No controls have been added yet."]],
    styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 110 },
      2: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 20;

  // Access requests -- every "Access" checklist item across this
  // application's controls (open and granted), with the control each
  // one is for: the same list as the in-app Access requests pop-out.
  const accessRows = application.controls.flatMap((control) =>
    control.nextTasks
      .filter((task) => task.category === "Access" && !task.irrelevant)
      .map((task) => {
        const code = control.clientContext.split(" - ")[0]?.trim();
        return [task.text, `${code ? `${code} · ` : ""}${control.name}`, task.completed ? "Granted" : "Open"];
      })
  );

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(doc, "Access Requests", marginX, y, pageWidth);

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Request", "For Control", "Status"]],
    body: accessRows.length > 0 ? accessRows : [["No access or credential requests yet.", "—", "—"]],
    styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 170 },
      2: { cellWidth: 60 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        if (data.cell.raw === "Open") data.cell.styles.textColor = PDF.orange;
        if (data.cell.raw === "Granted") data.cell.styles.textColor = PDF.green;
      }
    },
  });
  y = getFinalY(doc) + 20;

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Rule Logic",
    marginX,
    y,
    pageWidth,
    [8, 145, 178]
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Control", "Rule Logic"]],
    body:
      application.controls.length > 0
        ? application.controls.map((control) => [
            control.name,
            control.argosObjective ||
              "Not yet defined.",
          ])
        : [["—", "No controls have been added yet."]],
    styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 20;

  y = getFinalY(doc) + 24;

  for (const control of application.controls) {
    y = renderControlDetailSection(doc, marginX, pageWidth, y, {
      name: control.name,
      framework: control.framework,
      stage: control.stage,
      controlStatus: control.controlStatus,
      checklistStatus: control.checklistStatus,
      globalControlReference: control.globalControlReference,
      clientContext: control.clientContext,
      controlObjective: control.controlObjective,
      controlRisk: control.controlRisk,
      applicabilityRationale: control.applicabilityRationale,
      evidenceStrategy: control.evidenceStrategy,
      evidenceDataGapAnalysis: control.evidenceDataGapAnalysis,
      evidenceDataGapAnalysisStale:
        control.evidenceDataGapAnalysisStale,
      notes: control.notes,
      nextTasks: control.nextTasks,
      checklistChangeLog: control.checklistChangeLog,
    });
  }

  drawPageFooters(doc, marginX);

  const slug = `${appName}${context ? `-${context}` : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  doc.save(
    `${slug || "application"}-summary-${fileTimestampSlug()}.pdf`
  );
}

// Detailed single-control export -- same completeness as one control's
// section inside generateApplicationSummaryPdf, standalone. Takes a
// structural subset matching what ControlCard already has in scope
// locally, so callers don't need to construct a full ComplianceControl.
export function generateControlSummaryPdf(
  applicationName: string,
  control: ControlDetailInput
): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  registerPdfFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  doc.setFillColor(...PDF.teal);
  doc.rect(0, 0, pageWidth, 5, "F");
  setPdfFont(doc, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF.teal);
  doc.text("CONTROL GOVERNOR · COMPLIANCE HUB", marginX, 30, { charSpace: 0.8 });
  doc.setTextColor(...PDF.text);
  setPdfFont(doc, "bold");
  doc.setFontSize(PDF_SIZE.title - 2);
  doc.text("Control Summary", marginX, 52);

  setPdfFont(doc, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF.muted);
  doc.text(`Application: ${applicationName}`, marginX, 68);
  doc.text(
    `Generated ${formatGeneratedTimestamp()} — Developed by Manoj`,
    marginX,
    84
  );
  doc.setTextColor(...PDF.text);

  const finalY = renderControlDetailSection(
    doc,
    marginX,
    pageWidth,
    104,
    control
  );
  void finalY;

  drawPageFooters(doc, marginX);

  const slug = `${applicationName}-${control.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  doc.save(
    `${slug || "control"}-summary-${fileTimestampSlug()}.pdf`
  );
}

export function generateExecutiveProgressPdf(
  applications: Application[]
): void {
  const { doc, fileName } =
    buildExecutiveProgressPdf(applications);
  doc.save(fileName);
}

// Builds the executive progress PDF without saving it, so the UI can
// show a preview first and download on confirmation.
export function buildExecutiveProgressPdf(
  applications: Application[]
): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });
  registerPdfFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Same numbers and narrative as the New UI dashboard.
  const metrics = computeExecutiveMetrics(applications);
  const totalControls = metrics.controls;
  // Header -- the app's look: teal top strip, dark title, muted meta.
  doc.setFillColor(...PDF.teal);
  doc.rect(0, 0, pageWidth, 5, "F");
  setPdfFont(doc, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF.teal);
  doc.text("CONTROL GOVERNOR · COMPLIANCE HUB", marginX, 34, { charSpace: 0.8 });
  doc.setFontSize(PDF_SIZE.title);
  doc.setTextColor(...PDF.text);
  doc.text("Executive Progress Report", marginX, 58);
  setPdfFont(doc, "normal");
  doc.setFontSize(PDF_SIZE.subtitle);
  doc.setTextColor(...PDF.muted);
  doc.text(
    `CORE Compliance Program · ${metrics.controls} controls across ${metrics.applications} applications${metrics.frameworks.length ? ` · ${metrics.frameworks.join(", ")}` : ""}`,
    marginX,
    76
  );
  doc.text(
    `Generated ${formatGeneratedTimestamp()} — Developed by Manoj`,
    marginX,
    90
  );
  doc.setDrawColor(...PDF.border);
  doc.setLineWidth(0.6);
  doc.line(marginX, 102, pageWidth - marginX, 102);
  doc.setTextColor(...PDF.text);

  // Colorful KPI stat cards
  const cardY = 116;
  const cardH = 58;
  const cardGap = 10;
  const cardW =
    (pageWidth - marginX * 2 - cardGap * 5) / 6;

  const cards: [string, string, [number, number, number]][] = [
    [
      "Applications",
      String(metrics.applications),
      PDF.teal,
    ],
    [
      "Controls",
      String(metrics.controls),
      PDF.blue,
    ],
    [
      "Tasks Complete",
      `${metrics.taskPct}%`,
      PDF.green,
    ],
    [
      "Controls Complete",
      `${metrics.completedPct}%`,
      PDF.green,
    ],
    [
      "Evidence + Testing",
      `${metrics.fullyUploaded}/${metrics.controls}`,
      PDF.orange,
    ],
    [
      "Needs Attention",
      String(metrics.attention.length),
      PDF.red,
    ],
  ];

  cards.forEach(([label, value, color], index) => {
    drawStatCard(
      doc,
      marginX + index * (cardW + cardGap),
      cardY,
      cardW,
      cardH,
      label,
      value,
      color
    );
  });

  let y = cardY + cardH + 26;

  // Executive summary -- the dashboard's computed narrative.
  y = drawSectionBanner(
    doc,
    "Executive Summary",
    marginX,
    y,
    pageWidth,
    [15, 125, 140]
  );
  {
    const TONE: Record<string, [number, number, number]> = {
      progress: PDF.orange,
      risk: PDF.red,
      flow: PDF.teal,
      coverage: PDF.orange,
    };
    const textWidth = pageWidth - marginX * 2 - 16;
    setPdfFont(doc, "normal");
    doc.setFontSize(9.5);
    doc.setLineHeightFactor(1.35);
    for (const line of executiveNarrative(metrics)) {
      const text = line.parts.map((part) => part.text).join("");
      const wrapped = doc.splitTextToSize(text, textWidth) as string[];
      y = ensureRoom(doc, y, wrapped.length * 13 + 6);
      doc.setFillColor(...TONE[line.tone]);
      doc.circle(marginX + 4, y - 3, 2.4, "F");
      doc.setTextColor(...PDF.body);
      doc.text(wrapped, marginX + 14, y);
      y += wrapped.length * 13 + 6;
    }
    doc.setTextColor(...PDF.text);
    y += 12;
  }

  // Control status breakdown, colored bar chart
  y = drawSectionBanner(
    doc,
    "Control Status Breakdown",
    marginX,
    y,
    pageWidth,
    [67, 56, 202]
  );

  const STATUS_COLOR: Record<
    string,
    [number, number, number]
  > = Object.fromEntries(
    Object.entries(PDF_STATUS).map(([k, v]) => [k, v.fg])
  );
  // Share-of-total bars in each status's own colour (a large share is
  // not "bad", so the completion traffic light would mislead here).
  const statusBars = progressBarColumn(
    2,
    (_pct, row) => STATUS_COLOR[String(rawRowValue(row, 0))] ?? PDF.gray
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Control Status", "Count", "% of Total"]],
    body: CONTROL_STATUS_ORDER.map((status) => {
      const count = countControlsByStatus(
        applications,
        status
      );

      return [
        status,
        String(count),
        formatPercent(count, totalControls),
      ];
    }),
    didParseCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 0
      ) {
        const status = String(data.cell.raw);
        const color = STATUS_COLOR[status];
        if (color) {
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = "bold";
        }
      }
      statusBars.didParseCell(data);
    },
    didDrawCell: (data) => {
      statusBars.didDrawCell(data);
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });
  y = getFinalY(doc) + 24;

  // Coverage by control type -- the controls matrix's columns rolled
  // up: how many applications have each control type, how many are
  // done, and how far evidence and testing data have got.
  y = ensureRoom(doc, y, 80);
  y = drawSectionBanner(
    doc,
    "Coverage by Control Type",
    marginX,
    y,
    pageWidth,
    [15, 125, 140]
  );
  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Code", "Control", "Apps", "Done", "Evidence", "Testing Data", "Tasks", "Evidence + Testing"]],
    // Done / Evidence / Testing are out of the controls of this type;
    // Apps shows "2 (3)" when one application has two of them.
    body: metrics.byType.map((t) => [
      t.isCode ? t.key : "—",
      t.title,
      t.controls === t.apps ? String(t.apps) : `${t.apps} (${t.controls})`,
      `${t.completed}/${t.controls}`,
      `${t.withEvidence}/${t.controls}`,
      `${t.withTesting}/${t.controls}`,
      `${t.tasks.done}/${t.tasks.total}`,
      formatPercent(t.both, t.controls),
    ]),
    ...progressBarColumn(7),
    styles: { fontSize: 8.5, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold" },
      7: { cellWidth: 90 },
    },
  });
  y = getFinalY(doc) + 24;

  // Control matrix -- the /controls page as a table: one row per
  // application, one column per control type; each cell is that
  // application's control status plus what has been uploaded.
  if (metrics.byType.length > 0 && applications.length > 0) {
    const MATRIX_LABEL: Record<ControlStatus, string> = {
      Completed: "Done",
      "Ready for Review": "Ready",
      "In Progress": "Prog.",
      "Checklist Review Pending": "Review",
      New: "New",
      "On Hold": "Hold",
    };
    const MATRIX_STATUS = Object.fromEntries(
      Object.entries(MATRIX_LABEL).map(([k, label]) => [k, { label, fill: PDF_STATUS[k].bg, text: PDF_STATUS[k].fg }])
    ) as Record<ControlStatus, { label: string; fill: [number, number, number]; text: [number, number, number] }>;
    const keys = metrics.byType.map((t) => t.key);
    // One line pair per control: an application can have more than one
    // control under the same code (e.g. two IS05 reviews).
    const cellFor = (controls: ComplianceControl[]) => {
      if (controls.length === 0) return "—";
      return controls
        .map((control) => {
          const u = controlUploadState(control);
          const up = u.evidence.uploaded && u.testing.uploaded ? "E+T" : u.evidence.uploaded ? "E" : u.testing.uploaded ? "T" : "none";
          return `${MATRIX_STATUS[control.controlStatus].label}\n${up}`;
        })
        .join("\n");
    };
    // Cell colour follows the control furthest from done.
    const STATUS_RANK: ControlStatus[] = ["On Hold", "New", "Checklist Review Pending", "In Progress", "Ready for Review", "Completed"];
    const leadControl = (controls: ComplianceControl[]) =>
      [...controls].sort((x, y) => Number(needsAttention(y)) - Number(needsAttention(x)) || STATUS_RANK.indexOf(x.controlStatus) - STATUS_RANK.indexOf(y.controlStatus))[0];
    const matrixRows = [...applications]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((application) => {
        const byKey = new Map<string, ComplianceControl[]>();
        for (const c of application.controls) {
          const k = controlTypeKey(c);
          byKey.set(k, [...(byKey.get(k) ?? []), c]);
        }
        return { application, cells: keys.map((k) => byKey.get(k) ?? []) };
      });

    y = ensureRoom(doc, y, 90);
    y = drawSectionBanner(
      doc,
      "Control Matrix",
      marginX,
      y,
      pageWidth,
      [30, 41, 59]
    );
    setPdfFont(doc, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF.muted);
    doc.text(
      "Status per application and control type. Second line: uploads on file (E = evidence, T = testing data). — = not applicable.",
      marginX,
      y
    );
    doc.setTextColor(...PDF.text);
    y += 8;

    themedTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [["Application", ...keys]],
      body: matrixRows.map((r) => [splitApplicationName(r.application.name).appName, ...r.cells.map(cellFor)]),
      headStyles: { halign: "center" },
      styles: { fontSize: 6.5, cellPadding: 3, halign: "center", valign: "middle" },
      columnStyles: { 0: { cellWidth: 104, halign: "left", fontStyle: "bold", fontSize: 7.5 } },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index === 0) return;
        const controls = matrixRows[data.row.index]?.cells[data.column.index - 1] ?? [];
        const control = controls.length ? leadControl(controls) : undefined;
        if (!control) {
          data.cell.styles.textColor = PDF.gray;
          return;
        }
        const tone = MATRIX_STATUS[control.controlStatus];
        data.cell.styles.fillColor = tone.fill;
        data.cell.styles.textColor = needsAttention(control) ? PDF.red : tone.text;
        data.cell.styles.fontStyle = "bold";
      },
    });
    y = getFinalY(doc) + 24;
  }

  // Application progress, one colored bar per application
  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Application Progress",
    marginX,
    y,
    pageWidth,
    [37, 99, 235]
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "striped",
    head: [
      [
        "Application",
        "Context",
        "Controls",
        "Completed",
        "Evidence",
        "Testing Data",
        "Attention",
        "% Complete",
      ],
    ],
    body: applications.map((application) => {
      const applicationCompleted =
        application.controls.filter(
          (control) =>
            control.controlStatus === "Completed"
        ).length;

      const uploads = application.controls.map(
        controlUploadState
      );
      const n = application.controls.length;

      return [
        application.name || application.id,
        application.contextStatus,
        String(n),
        String(applicationCompleted),
        `${uploads.filter((u) => u.evidence.uploaded).length}/${n}`,
        `${uploads.filter((u) => u.testing.uploaded).length}/${n}`,
        String(
          application.controls.filter(needsAttention)
            .length
        ),
        formatPercent(applicationCompleted, n),
      ];
    }),
    ...progressBarColumn(7),
    styles: { fontSize: 9, cellPadding: 6 },
  });
  y = getFinalY(doc) + 24;

  // Work progress summary — upload state and progress for every
  // control in every application, drawn from the user's own notes.
  const workSummaryRows = applications.flatMap(
    (application) =>
      application.controls.map((control) => [
        application.name || application.id,
        control.name,
        uploadsSummary(control),
        control.progressSummary ||
          "No work notes captured yet.",
      ])
  );

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Work Progress",
    marginX,
    y,
    pageWidth,
    [217, 119, 6]
  );

  themedTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [
      [
        "Application",
        "Control",
        "Uploads",
        "Progress Summary",
      ],
    ],
    body:
      workSummaryRows.length > 0
        ? workSummaryRows
        : [
            [
              "—",
              "—",
              "—",
              "No controls have been added yet.",
            ],
          ],
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 110 },
      2: { cellWidth: 95 },
      3: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 24;

  // Open access requests — every not-yet-completed "Access" checklist
  // task across every control, the same list the in-app Access
  // requests pop-out shows per application,
  // surfaced here at the executive level as concrete open asks toward
  // the shared credential each application needs for real-time Argos
  // pulls.
  const outstandingAccessRows = applications.flatMap(
    (application) =>
      application.controls.flatMap((control) =>
        control.nextTasks
          .filter(
            (task) =>
              task.category === "Access" &&
              !task.completed &&
              !task.irrelevant
          )
          .map((task) => [
            application.name || application.id,
            control.name,
            task.text,
          ])
      )
  );

  if (outstandingAccessRows.length > 0) {
    y = ensureRoom(doc, y, 60);
    y = drawSectionBanner(
      doc,
      "Open Access Requests",
      marginX,
      y,
      pageWidth,
      [124, 58, 237]
    );

    themedTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [["Application", "Control", "Request"]],
      body: outstandingAccessRows,
      styles: {
        fontSize: 8.5,
        cellPadding: 6,
        valign: "top",
      },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 110 },
        2: { cellWidth: "auto" },
      },
    });
    y = getFinalY(doc) + 24;
  }

  // Attention items — controls that need executive visibility
  const attentionRows = applications.flatMap(
    (application) =>
      application.controls
        .filter(
          (control) =>
            control.controlStatus === "On Hold" ||
            control.checklistStatus ===
              "Needs Revision"
        )
        .map((control) => [
          application.name || application.id,
          control.name,
          control.controlStatus,
          control.checklistStatus,
        ])
  );

  if (attentionRows.length > 0) {
    y = ensureRoom(doc, y, 60);
    y = drawSectionBanner(
      doc,
      "Attention Required",
      marginX,
      y,
      pageWidth,
      [220, 38, 38]
    );

    themedTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [
        [
          "Application",
          "Control",
          "Control Status",
          "Checklist Status",
        ],
      ],
      body: attentionRows,
      styles: { fontSize: 9, cellPadding: 6 },
    });
    y = getFinalY(doc) + 24;
  }

  // Recent activity -- the latest notes and checklist changes, as on
  // the dashboard.
  const recent = metrics.recentActivity.slice(0, 15);
  if (recent.length > 0) {
    y = ensureRoom(doc, y, 60);
    y = drawSectionBanner(
      doc,
      "Recent Activity",
      marginX,
      y,
      pageWidth,
      [59, 130, 196]
    );
    themedTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "striped",
      head: [["Date", "Application", "Control", "Type", "Activity"]],
      body: recent.map((a) => [
        new Date(a.when).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        splitApplicationName(a.application.name).appName,
        a.control.name,
        a.kind,
        a.text.length > 160 ? `${a.text.slice(0, 157)}…` : a.text,
      ]),
      styles: { fontSize: 8, cellPadding: 5, valign: "top" },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 90 },
        2: { cellWidth: 100 },
        3: { cellWidth: 62 },
      },
    });
    y = getFinalY(doc) + 24;
  }

  // Items marked irrelevant — full transparency on every checklist item
  // that was tagged as no longer applicable, whether by the assistant
  // or manually, and why.
  const irrelevantRows = applications.flatMap(
    (application) =>
      application.controls.flatMap((control) =>
        control.nextTasks
          .filter((task) => task.irrelevant)
          .map((task) => [
            application.name || application.id,
            control.name,
            task.text,
            task.irrelevantReason ||
              "No reason recorded.",
          ])
      )
  );

  if (irrelevantRows.length > 0) {
    y = ensureRoom(doc, y, 60);
    y = drawSectionBanner(
      doc,
      "Items Marked Irrelevant",
      marginX,
      y,
      pageWidth,
      [100, 116, 139]
    );

    themedTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [
        [
          "Application",
          "Control",
          "Checklist Item",
          "Reason",
        ],
      ],
      body: irrelevantRows,
      styles: {
        fontSize: 8.5,
        cellPadding: 6,
        valign: "top",
      },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 110 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 140 },
      },
    });
  }

  drawPageFooters(doc, marginX);

  return {
    doc,
    fileName: `control-governor-progress-${fileTimestampSlug()}.pdf`,
  };
}
