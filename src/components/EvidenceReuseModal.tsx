"use client";

type EvidenceReuseModalDocument = {
  filename: string;
  kind: "evidence" | "data";
};

type EvidenceReuseModalProps = {
  applicationName: string;
  controlName: string;
  documents: EvidenceReuseModalDocument[];
  onApply: () => void;
  onSkip: () => void;
};

export default function EvidenceReuseModal({
  applicationName,
  controlName,
  documents,
  onApply,
  onSkip,
}: EvidenceReuseModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onSkip}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-blue-700/60 bg-slate-900 p-6 shadow-2xl"
      >
        <h4 className="text-base font-semibold text-blue-300">
          Use existing evidence for &quot;{controlName}&quot;?
        </h4>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          {applicationName} already has {documents.length}{" "}
          {documents.length === 1 ? "file" : "files"} on file.
          Apply {documents.length === 1 ? "it" : "them"} to the
          checklist notes and next steps for the control you just
          added?
        </p>

        <ul className="mt-4 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
          {documents.map((document, index) => (
            <li
              key={`${document.filename}-${index}`}
              className="flex items-center justify-between gap-2 text-xs text-slate-300"
            >
              <span className="truncate">
                {document.filename}
              </span>
              <span
                className={
                  document.kind === "evidence"
                    ? "shrink-0 rounded-full bg-blue-900/60 px-2 py-0.5 text-[10px] font-semibold text-blue-300"
                    : "shrink-0 rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                }
              >
                {document.kind}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Apply to this control
          </button>
        </div>
      </div>
    </div>
  );
}
