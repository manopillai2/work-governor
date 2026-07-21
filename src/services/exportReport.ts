import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type {
  Application,
  ControlStatus,
} from "./commandEngine";

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

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(
    "Work Governor — Executive Progress Report",
    marginX,
    54
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text("CORE Compliance Program", marginX, 72);
  doc.text(
    `Generated ${formatGeneratedTimestamp()} — Developed by Manoj`,
    marginX,
    88
  );
  doc.setTextColor(0);

  // Executive summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Executive Summary", marginX, 118);

  autoTable(doc, {
    startY: 128,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [
      [
        "Applications",
        "Total Controls",
        "Completed",
        "% Complete",
        "On Hold",
        "Apps Missing Context",
      ],
    ],
    body: [
      [
        String(totalApplications),
        String(totalControls),
        String(completedControls),
        formatPercent(
          completedControls,
          totalControls
        ),
        String(onHoldControls),
        String(applicationsMissingContext),
      ],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  const afterSummaryY = (
    doc as unknown as {
      lastAutoTable: { finalY: number };
    }
  ).lastAutoTable.finalY;

  // Control status breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    "Control Status Breakdown",
    marginX,
    afterSummaryY + 28
  );

  autoTable(doc, {
    startY: afterSummaryY + 38,
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
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  const afterBreakdownY = (
    doc as unknown as {
      lastAutoTable: { finalY: number };
    }
  ).lastAutoTable.finalY;

  // Application progress
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    "Application Progress",
    marginX,
    afterBreakdownY + 28
  );

  autoTable(doc, {
    startY: afterBreakdownY + 38,
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
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });

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

  const afterApplicationProgressY = (
    doc as unknown as {
      lastAutoTable: { finalY: number };
    }
  ).lastAutoTable.finalY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    "Work Progress Summary",
    marginX,
    afterApplicationProgressY + 28
  );

  autoTable(doc, {
    startY: afterApplicationProgressY + 38,
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
      fillColor: [30, 41, 59],
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
    const afterProgressY = (
      doc as unknown as {
        lastAutoTable: { finalY: number };
      }
    ).lastAutoTable.finalY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(
      "Attention Required",
      marginX,
      afterProgressY + 28
    );

    autoTable(doc, {
      startY: afterProgressY + 38,
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
        fillColor: [153, 27, 27],
        textColor: 255,
      },
      styles: { fontSize: 9, cellPadding: 6 },
    });
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Work Governor — Page ${page} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  const fileTimestamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-");

  doc.save(
    `work-governor-progress-${fileTimestamp}.pdf`
  );
}
