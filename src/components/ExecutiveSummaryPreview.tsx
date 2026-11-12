"use client";

// Preview-before-download for the executive progress PDF. Callers use
// the hook: `open(applications)` builds the PDF and shows it in a modal;
// the user then downloads it or closes the preview.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { jsPDF } from "jspdf";

import CloseIcon from "@/components/CloseIcon";
import { useTheme } from "@/components/ThemeProvider";
import { buildExecutiveProgressPdf } from "@/services/exportReport";
import { preloadPdfFonts } from "@/services/pdfTheme";
import type { Application } from "@/services/commandEngine";

type Preview = { doc: jsPDF; fileName: string; url: string };

function ExecutiveSummaryPreviewModal({
  preview,
  onClose,
}: {
  preview: Preview;
  onClose: () => void;
}) {
  // Light in the New UI (matching its dialogs), dark in Classic.
  const hub = useTheme().uiMode === "hub";
  const ui = hub
    ? {
        panel: "border-[#dfe4ea] bg-white",
        bar: "border-[#dfe4ea]",
        title: "text-[#1b2430]",
        sub: "text-[#6b7684]",
        secondary: "border-[#dfe4ea] text-[#3c4652] hover:bg-[#eef1f4]",
        primary: "bg-[#0f7d8c] hover:bg-[#0c6b78]",
        close: "text-[#6b7684] hover:bg-[#eef1f4] hover:text-[#1b2430]",
        frame: "bg-[#eef2f5]",
        overlay: "bg-[rgba(15,30,45,0.45)]",
      }
    : {
        panel: "border-slate-700 bg-slate-900",
        bar: "border-slate-700",
        title: "text-white",
        sub: "text-slate-400",
        secondary: "border-slate-700 text-slate-300 hover:bg-slate-800",
        primary: "bg-emerald-600 hover:bg-emerald-500",
        close: "text-slate-400 hover:bg-slate-800 hover:text-white",
        frame: "bg-slate-800",
        overlay: "bg-black/60",
      };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${ui.overlay}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Executive summary preview"
        onClick={(event) => event.stopPropagation()}
        className={`flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl ${ui.panel}`}
      >
        <div className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 ${ui.bar}`}>
          <div className="min-w-0">
            <h4 className={`text-base font-semibold ${ui.title}`}>
              Executive summary preview
            </h4>
            <p className={`truncate text-xs ${ui.sub}`}>
              {preview.fileName}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${ui.secondary}`}
            >
              Open in new tab
            </a>
            <button
              type="button"
              onClick={() => {
                preview.doc.save(preview.fileName);
                onClose();
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${ui.primary}`}
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${ui.close}`}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <iframe
          src={preview.url}
          title="Executive summary PDF preview"
          className={`min-h-0 w-full flex-1 ${ui.frame}`}
        />
      </div>
    </div>
  );
}

export function useExecutiveSummaryPreview(): {
  openPreview: (applications: Application[]) => void | Promise<void>;
  previewModal: ReactNode;
} {
  const [preview, setPreview] = useState<Preview | null>(null);

  const openPreview = useCallback(async (applications: Application[]) => {
    // Embed the app's font (Figtree); falls back to Helvetica if it
    // can't load.
    await preloadPdfFonts();
    const { doc, fileName } = buildExecutiveProgressPdf(applications);
    const url = URL.createObjectURL(doc.output("blob"));
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { doc, fileName, url };
    });
  }, []);

  const close = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  return {
    openPreview,
    previewModal: preview ? (
      <ExecutiveSummaryPreviewModal preview={preview} onClose={close} />
    ) : null,
  };
}
