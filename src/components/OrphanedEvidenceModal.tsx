"use client";

type OrphanedEvidenceModalDocument = {
  filename: string;
  kind: "evidence" | "data";
};

type OrphanedEvidenceModalProps = {
  applicationName: string;
  documents: OrphanedEvidenceModalDocument[];
  onReuse: () => void;
  onDelete: () => void;
};

export default function OrphanedEvidenceModal({
  applicationName,
  documents,
  onReuse,
  onDelete,
}: OrphanedEvidenceModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onReuse}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-amber-700/60 bg-slate-900 p-6 shadow-2xl"
      >
        <h4 className="text-base font-semibold text-amber-300">
          Old evidence found for &quot;{applicationName}&quot;
        </h4>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          {applicationName} was deleted and recreated. It still has
          {" "}
          {documents.length}{" "}
          {documents.length === 1 ? "file" : "files"} left over from
          before -- reuse {documents.length === 1 ? "it" : "them"}, or
          delete {documents.length === 1 ? "it" : "them"} permanently?
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
            onClick={onDelete}
            className="rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-950"
          >
            Delete permanently
          </button>

          <button
            type="button"
            onClick={onReuse}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
          >
            Reuse it
          </button>
        </div>
      </div>
    </div>
  );
}
