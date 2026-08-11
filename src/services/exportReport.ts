import { jsPDF } from "jspdf";
import autoTable, {
  type CellHookData,
} from "jspdf-autotable";

import type {
  Application,
  ChecklistTask,
  ControlStatus,
  Note,
} from "./commandEngine";
import { splitApplicationName } from "./applicationName";

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
  color: [number, number, number]
): number {
  const bannerHeight = 22;
  doc.setFillColor(...color);
  doc.roundedRect(
    marginX,
    y,
    pageWidth - marginX * 2,
    bannerHeight,
    3,
    3,
    "F"
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(text, marginX + 10, y + bannerHeight / 2 + 4);
  doc.setTextColor(0, 0, 0);
  return y + bannerHeight + 12;
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
  qaScore: string;
  qaScoreRationale: string;
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

  autoTable(doc, {
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
        "QA Score",
        control.qaScore,
        "",
        "",
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
    ["QA Rationale", control.qaScoreRationale],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Field", "Detail"]],
    body: narrativeFields.map(([label, value]) => [
      label,
      value || "Not yet captured.",
    ]),
    headStyles: { fillColor: [67, 56, 202], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 140, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 14;

  y = ensureRoom(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(67, 56, 202);
  doc.text(
    `Evidence vs. Data Gap Analysis${
      control.evidenceDataGapAnalysisStale
        ? " (stale — a source document was deleted since this was written)"
        : ""
    }`,
    marginX,
    y
  );
  doc.setTextColor(0, 0, 0);
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(67, 56, 202);
  doc.text(
    `Checklist (${
      control.nextTasks.filter((t) => t.completed).length
    }/${control.nextTasks.length} completed)`,
    marginX,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  autoTable(doc, {
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
          data.cell.styles.textColor = [21, 128, 61];
        } else if (value.startsWith("Irrelevant")) {
          data.cell.styles.textColor = [148, 163, 184];
        } else if (value === "Required") {
          data.cell.styles.textColor = [180, 83, 9];
        }
      }
    },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(67, 56, 202);
  doc.text("Control Notes", marginX, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  autoTable(doc, {
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
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(67, 56, 202);
    doc.text("Checklist Change Log", marginX, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    autoTable(doc, {
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
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Control Governor — Page ${page} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
    doc.setTextColor(0);
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
  doc.setFont("helvetica", "normal");
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
    doc.setFont("helvetica", token.bold ? "bold" : "normal");
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

  doc.setFont("helvetica", "normal");
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(67, 56, 202);
      doc.text(block.text, marginX, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += bodyLineHeight;
    } else if (block.type === "bullet") {
      y = ensureRoom(doc, y, bodyLineHeight * 2);
      doc.setFont("helvetica", "normal");
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
    return [16, 185, 129];
  }
  if (pct >= 40) {
    return [245, 158, 11];
  }
  return [239, 68, 68];
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
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, h, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(value, x + w / 2, y + h / 2 - 2, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label, x + w / 2, y + h - 10, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);
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
function progressBarColumn(columnIndex: number) {
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

      doc.setFillColor(226, 232, 240);
      doc.roundedRect(
        x + padX,
        barY,
        barW,
        barH,
        2,
        2,
        "F"
      );

      const color = colorForPercent(pct);
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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(pctStr, x + width / 2, y + padX + 6, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
    },
  };
}

// Comprehensive single-application export: every context field, the
// application-level evidence-vs-data summary, work progress and Argos
// rollups, application notes, and a full detail section for every
// control -- objective/risk/rationale/strategy, QA, evidence-vs-data
// analysis, the complete checklist with per-task notes, control notes,
// and the checklist change log. Nothing on the Application or
// ComplianceControl types is left out.
export function generateApplicationSummaryPdf(
  application: Application
): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  const { appName, context } = splitApplicationName(
    application.name
  );
  const title = context ? `${appName} (${context})` : appName;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${title} — Application Summary`, marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90);
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
  doc.setTextColor(0);

  let y = 104;

  y = drawSectionBanner(
    doc,
    "Application Context",
    marginX,
    y,
    pageWidth,
    [37, 99, 235]
  );

  autoTable(doc, {
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
    "Evidence vs. Data Summary",
    marginX,
    y,
    pageWidth,
    [5, 150, 105]
  );
  if (application.evidenceDataGapSummaryStale) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text(
      "Stale — a source document was deleted since this was written.",
      marginX,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 14;
  }
  y =
    drawMarkdownField(
      doc,
      application.evidenceDataGapSummary ||
        "No evidence-vs-data summary has been generated yet.",
      marginX,
      y,
      pageWidth - marginX * 2
    ) + 10;

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Work Progress Summary",
    marginX,
    y,
    pageWidth,
    [217, 119, 6]
  );

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Control", "QA Score", "Progress Summary"]],
    body:
      application.controls.length > 0
        ? application.controls.map((control) => [
            control.name,
            control.qaScore,
            control.progressSummary ||
              "No work notes captured yet.",
          ])
        : [["—", "—", "No controls have been added yet."]],
    headStyles: { fillColor: [217, 119, 6], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 90 },
      2: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 20;

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Argos Rule Logic",
    marginX,
    y,
    pageWidth,
    [8, 145, 178]
  );

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Control", "Argos Objective"]],
    body:
      application.controls.length > 0
        ? application.controls.map((control) => [
            control.name,
            control.argosObjective ||
              "Not yet defined.",
          ])
        : [["—", "No controls have been added yet."]],
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 20;

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Application Notes",
    marginX,
    y,
    pageWidth,
    [190, 24, 93]
  );

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Date", "Source", "Note"]],
    body:
      application.notes.length > 0
        ? application.notes.map((note) => [
            new Date(note.createdAt).toLocaleDateString(),
            note.sourceKind,
            note.text,
          ])
        : [["—", "—", "No application-level notes recorded."]],
    headStyles: { fillColor: [190, 24, 93], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 60 },
      2: { cellWidth: "auto" },
    },
  });
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
      qaScore: control.qaScore,
      qaScoreRationale: control.qaScoreRationale,
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Control Summary", marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90);
  doc.text(`Application: ${applicationName}`, marginX, 68);
  doc.text(
    `Generated ${formatGeneratedTimestamp()} — Developed by Manoj`,
    marginX,
    84
  );
  doc.setTextColor(0);

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
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  const totalApplications = applications.length;

  const totalControls = applications.reduce(
    (total, application) =>
      total + application.controls.length,
    0
  );

  const completedControls = countControlsByStatus(
    applications,
    "Completed"
  );

  const onHoldControls = countControlsByStatus(
    applications,
    "On Hold"
  );

  const applicationsMissingContext =
    applications.filter(
      (application) =>
        application.contextStatus !== "Complete"
    ).length;

  const overallPercent =
    totalControls === 0
      ? 0
      : Math.round(
          (completedControls / totalControls) * 100
        );

  // Header banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "Executive Progress Report",
    marginX,
    42
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    "CORE Compliance Program — Control Governor",
    marginX,
    62
  );
  doc.text(
    `Generated ${formatGeneratedTimestamp()} — Developed by Manoj`,
    marginX,
    78
  );
  doc.setTextColor(0, 0, 0);

  // Colorful KPI stat cards
  const cardY = 116;
  const cardH = 66;
  const cardGap = 10;
  const cardW =
    (pageWidth - marginX * 2 - cardGap * 4) / 5;

  const cards: [string, string, [number, number, number]][] = [
    [
      "Applications",
      String(totalApplications),
      [37, 99, 235],
    ],
    [
      "Total Controls",
      String(totalControls),
      [8, 145, 178],
    ],
    [
      "% Complete",
      `${overallPercent}%`,
      colorForPercent(overallPercent),
    ],
    [
      "On Hold",
      String(onHoldControls),
      onHoldControls > 0
        ? [220, 38, 38]
        : [100, 116, 139],
    ],
    [
      "Missing Context",
      String(applicationsMissingContext),
      applicationsMissingContext > 0
        ? [217, 119, 6]
        : [100, 116, 139],
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
  > = {
    Completed: [16, 185, 129],
    "Ready for Review": [37, 99, 235],
    "In Progress": [8, 145, 178],
    "Checklist Review Pending": [217, 119, 6],
    New: [100, 116, 139],
    "On Hold": [220, 38, 38],
  };

  autoTable(doc, {
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
      progressBarColumn(2).didParseCell(data);
    },
    didDrawCell: (data) => {
      progressBarColumn(2).didDrawCell(data);
    },
    headStyles: {
      fillColor: [67, 56, 202],
      textColor: 255,
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });
  y = getFinalY(doc) + 24;

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

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "striped",
    head: [
      [
        "Application",
        "Hosting",
        "Context",
        "Controls",
        "Completed",
        "% Complete",
      ],
    ],
    body: applications.map((application) => {
      const applicationCompleted =
        application.controls.filter(
          (control) =>
            control.controlStatus === "Completed"
        ).length;

      return [
        application.name || application.id,
        application.hosting || "Unknown",
        application.contextStatus,
        String(application.controls.length),
        String(applicationCompleted),
        formatPercent(
          applicationCompleted,
          application.controls.length
        ),
      ];
    }),
    ...progressBarColumn(5),
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });
  y = getFinalY(doc) + 24;

  // Work progress summary — current status and QA score for every
  // control in every application, drawn from the user's own notes.
  const workSummaryRows = applications.flatMap(
    (application) =>
      application.controls.map((control) => [
        application.name || application.id,
        control.name,
        control.qaScore,
        control.progressSummary ||
          "No work notes captured yet.",
      ])
  );

  y = ensureRoom(doc, y, 60);
  y = drawSectionBanner(
    doc,
    "Work Progress Summary",
    marginX,
    y,
    pageWidth,
    [217, 119, 6]
  );

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [
      [
        "Application",
        "Control",
        "QA Score",
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
    headStyles: {
      fillColor: [217, 119, 6],
      textColor: 255,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 110 },
      2: { cellWidth: 65 },
      3: { cellWidth: "auto" },
    },
  });
  y = getFinalY(doc) + 24;

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

    autoTable(doc, {
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
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
      },
      styles: { fontSize: 9, cellPadding: 6 },
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

    autoTable(doc, {
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
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: 255,
      },
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

  doc.save(
    `control-governor-progress-${fileTimestampSlug()}.pdf`
  );
}
