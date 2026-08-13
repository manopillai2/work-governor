"use client";

import { useEffect, useState } from "react";

import CloseIcon from "@/components/CloseIcon";
import type { Application } from "@/services/commandEngine";

type EvidenceDocumentRow = {
  id: string;
  applicationId: string;
  filename: string;
  fileType: string;
  kind: "evidence" | "data";
  scope: "all" | "selected";
  controlNames: string[];
  uploadedAt: string;
};

type AttachmentManagerModalProps = {
  application: Application | null;
  onClose: () => void;
  onDelete: (documentId: string) => void | Promise<void>;
};

function findReferencingNotes(
  application: Application,
  documentId: string
): Array<{ id: string; controlName?: string }> {
  const matches: Array<{
    id: string;
    controlName?: string;
  }> = [];

  for (const note of application.notes) {
    if (note.sourceDocumentId === documentId) {
      matches.push({ id: note.id });
    }
  }

  for (const control of application.controls) {
    for (const note of control.notes) {
      if (note.sourceDocumentId === documentId) {
        matches.push({
          id: note.id,
          controlName: control.name,
        });
      }
    }

    for (const task of control.nextTasks) {
      for (const note of task.notes) {
        if (note.sourceDocumentId === documentId) {
          matches.push({
            id: note.id,
            controlName: control.name,
          });
        }
      }
    }
  }

  return matches;
}

export default function AttachmentManagerModal({
  application,
  onClose,
  onDelete,
}: AttachmentManagerModalProps) {
  const [documents, setDocuments] = useState<
    EvidenceDocumentRow[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);
  const [kindFilter, setKindFilter] = useState<
    "all" | "evidence" | "data"
  >("all");

  useEffect(() => {
    if (!application) {
      return;
    }

    let cancelled = false;

    async function loadDocuments() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/evidence?applicationId=${encodeURIComponent(application!.id)}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load attached files."
          );
        }

        const data = await response.json();

        if (!cancelled) {
          setDocuments(
            Array.isArray(data.evidence)
              ? data.evidence
              : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load attached files."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [application]);

  if (!application) {
    return null;
  }

  const filteredDocuments = documents.filter(
    (document) =>
      kindFilter === "all" ||
      document.kind === kindFilter
  );

  async function handleDeleteClick(
    document: EvidenceDocumentRow
  ) {
    const referencingNotes = findReferencingNotes(
      application!,
      document.id
    );

    const confirmed = window.confirm(
      referencingNotes.length > 0
        ? `Delete "${document.filename}"? The ${referencingNotes.length} note${
            referencingNotes.length === 1 ? "" : "s"
          } that came from it (${referencingNotes
            .map((note) => note.id)
            .join(
              ", "
            )}) will be struck through and marked as deleted, not removed. Affected controls will need their checklist regenerated manually.`
        : `Delete "${document.filename}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(document.id);

    try {
      await onDelete(document.id);
      setDocuments((current) =>
        current.filter(
          (row) => row.id !== document.id
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-white">
              Attachments — {application.name}
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              Every evidence and data file uploaded for
              this application. Deleting one strikes
              through the notes it produced instead of
              removing them, and flags affected controls
              for manual checklist regeneration.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex shrink-0 items-center justify-center rounded-full border border-slate-700 px-2.5 py-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-3 flex shrink-0 gap-1.5">
          {(
            [
              {
                key: "all",
                label: "All",
                count: documents.length,
              },
              {
                key: "evidence",
                label: "Evidence",
                count: documents.filter(
                  (document) =>
                    document.kind === "evidence"
                ).length,
              },
              {
                key: "data",
                label: "Data",
                count: documents.filter(
                  (document) =>
                    document.kind === "data"
                ).length,
              },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                setKindFilter(option.key)
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                kindFilter === option.key
                  ? "bg-blue-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-slate-400">
              Loading…
            </p>
          ) : error ? (
            <p className="text-sm font-medium text-rose-400">
              {error}
            </p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-500">
              No files attached yet.
            </p>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No {kindFilter} files attached.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredDocuments.map((document) => {
                const referencingNotes =
                  findReferencingNotes(
                    application,
                    document.id
                  );

                return (
                  <li
                    key={document.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-100">
                            {document.filename}
                          </span>

                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              document.kind ===
                              "data"
                                ? "bg-indigo-950 text-indigo-300"
                                : "bg-blue-950 text-blue-300"
                            }`}
                          >
                            {document.kind ===
                            "data"
                              ? "Data"
                              : "Evidence"}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[11px] text-slate-500">
                          Document ID:{" "}
                          {document.id}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Uploaded{" "}
                          {new Date(
                            document.uploadedAt
                          ).toLocaleString()}{" "}
                          &middot;{" "}
                          {referencingNotes.length}{" "}
                          note
                          {referencingNotes.length ===
                          1
                            ? ""
                            : "s"}{" "}
                          from this file
                        </p>

                        {referencingNotes.length >
                        0 ? (
                          <p className="mt-1 truncate text-[11px] font-mono text-slate-600">
                            Note IDs:{" "}
                            {referencingNotes
                              .map(
                                (note) => note.id
                              )
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteClick(
                            document
                          )
                        }
                        disabled={
                          deletingId ===
                          document.id
                        }
                        className="shrink-0 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === document.id
                          ? "Deleting…"
                          : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
