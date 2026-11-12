import type { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

// The PDF exports' design tokens, mirroring the New UI (components/hub
// hubUi `T` + the control status tones) so every exported document
// reads like the app: Figtree, cool grey canvas, teal accent, the same
// status colours, small uppercase muted table headers, white stat
// tiles with a coloured left edge.

type RGB = [number, number, number];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const PDF = {
  canvas: hex("#f4f6f8"),
  card: hex("#ffffff"),
  border: hex("#dfe4ea"),
  divider: hex("#eceff3"),
  headBg: hex("#f7f9fb"),
  text: hex("#1b2430"),
  body: hex("#3c4652"),
  muted: hex("#6b7684"),
  faint: hex("#9aa3ae"),
  teal: hex("#0f7d8c"),
  tealSoft: hex("#e2f2f5"),
  green: hex("#0f8a5f"),
  greenSoft: hex("#e6f5ee"),
  blue: hex("#3b82c4"),
  blueSoft: hex("#e8f1fa"),
  orange: hex("#e5730f"),
  orangeSoft: hex("#fdf1e6"),
  red: hex("#d42a3c"),
  redSoft: hex("#fdeef0"),
  gray: hex("#c5cbd3"),
  graySoft: hex("#eef1f4"),
};

// Same tones as the app's status pills (controlViews STATUS_TONE).
export const PDF_STATUS: Record<string, { fg: RGB; bg: RGB }> = {
  New: { fg: PDF.muted, bg: PDF.graySoft },
  "Checklist Review Pending": { fg: PDF.orange, bg: PDF.orangeSoft },
  "In Progress": { fg: PDF.blue, bg: PDF.blueSoft },
  "Ready for Review": { fg: PDF.teal, bg: PDF.tealSoft },
  Completed: { fg: PDF.green, bg: PDF.greenSoft },
  "On Hold": { fg: PDF.red, bg: PDF.redSoft },
};

// Type scale (pt), matching the app's hierarchy at print size.
export const PDF_SIZE = {
  title: 20,
  subtitle: 10,
  section: 9.5,
  body: 8.5,
  small: 7.5,
  head: 7,
  stat: 18,
};

// ---------- Figtree ----------
// The app's UI font. Loaded once from /fonts/figtree (OFL licensed,
// see OFL.txt there) and embedded into each PDF; until it has loaded --
// or if it can't be -- PDFs fall back to Helvetica.
const FONT_FILES = [
  { file: "Figtree-Regular.ttf", style: "normal" },
  { file: "Figtree-Bold.ttf", style: "bold" },
] as const;

let fontData: { file: string; style: string; base64: string }[] | null = null;
let loading: Promise<void> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function preloadPdfFonts(): Promise<void> {
  if (fontData) return Promise.resolve();
  if (!loading) {
    loading = Promise.all(
      FONT_FILES.map(async (f) => {
        const res = await fetch(`/fonts/figtree/${f.file}`);
        if (!res.ok) throw new Error(`${f.file}: ${res.status}`);
        return { ...f, base64: toBase64(await res.arrayBuffer()) };
      })
    )
      .then((data) => {
        fontData = data;
      })
      .catch((error) => {
        console.warn("PDF font not loaded; exports will use Helvetica.", error);
        loading = null;
      });
  }
  return loading ?? Promise.resolve();
}

const FAMILY = "Figtree";
const hasFigtree = new WeakSet<jsPDF>();

// Call right after `new jsPDF(...)`.
export function registerPdfFonts(doc: jsPDF): void {
  if (!fontData) return;
  for (const f of fontData) {
    doc.addFileToVFS(f.file, f.base64);
    doc.addFont(f.file, FAMILY, f.style);
  }
  hasFigtree.add(doc);
  doc.setFont(FAMILY, "normal");
}

export const pdfFontFamily = (doc: jsPDF) => (hasFigtree.has(doc) ? FAMILY : "helvetica");

// Figtree ships no italic here; italic falls back to regular.
export function setPdfFont(doc: jsPDF, weight: "normal" | "bold" | "italic" = "normal"): void {
  const family = pdfFontFamily(doc);
  doc.setFont(family, family === FAMILY && weight === "italic" ? "normal" : weight);
}

// ---------- tables ----------
// Every exported table in the app's table style: white rows, hairline
// borders, small uppercase muted header on light grey. Per-table
// sizing / column widths / cell hooks pass through; header colours are
// always the theme's.
export function themedTable(doc: jsPDF, options: UserOptions): void {
  const family = pdfFontFamily(doc);
  const head = Array.isArray(options.head)
    ? options.head.map((row) => (Array.isArray(row) ? row.map((cell) => (typeof cell === "string" ? cell.toUpperCase() : cell)) : row))
    : options.head;
  autoTable(doc, {
    ...options,
    head,
    theme: "grid",
    styles: {
      fontSize: PDF_SIZE.body,
      cellPadding: 5,
      textColor: PDF.body,
      lineColor: PDF.border,
      lineWidth: 0.5,
      ...options.styles,
      font: family,
    },
    headStyles: {
      ...options.headStyles,
      fillColor: PDF.headBg,
      textColor: PDF.muted,
      fontStyle: "bold",
      fontSize: PDF_SIZE.head,
      font: family,
    },
    bodyStyles: { fillColor: PDF.card, ...options.bodyStyles },
    alternateRowStyles: { fillColor: PDF.card },
  });
}
