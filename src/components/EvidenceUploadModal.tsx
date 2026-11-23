"use client";

import { useState, type FormEvent } from "react";

import type { Application } from "@/services/commandEngine";

export type EvidenceKind = "evidence" | "data";

export type EvidenceUploadResult = {
  kind: EvidenceKind;
  applicationId: string;
  applicationName: string;
  scope: "all" | "selected";
  controlName?: string;
  documents: Array<{
    id: string;
    filename: string;
    extractedText: string;
  }>;
};

type EvidenceUploadModalProps = {
  kind: EvidenceKind;
  applications: Application[];
  // Pre-selected from where the upload was started (an application's
  // detail view or one control).
  initialApplicationId?: string;
  initialControlName?: string;
  onClose: () => void;
  onUploaded: (
    result: EvidenceUploadResult
  ) => void;
};

const ACCEPTED_EXTENSIONS =
  ".docx,.pptx,.xlsx,.pdf,.csv,.txt,.md,.json";

export default function EvidenceUploadModal({
  kind,
  applications,
  initialApplicationId,
  initialControlName,
  onClose,
  onUploaded,
}: EvidenceUploadModalProps) {
  const [applicationId, setApplicationId] =
    useState(
      initialApplicationId &&
        applications.some(
          (application) =>
            application.id ===
            initialApplicationId
        )
        ? initialApplicationId
        : applications[0]?.id ?? ""
    );
  const [scope, setScope] = useState<
    "all" | "selected"
  >(initialControlName ? "selected" : "all");
  const [controlName, setControlName] =
    useState(initialControlName ?? "");
  const [files, setFiles] = useState<File[]>(
    []
  );
  const [isUploading, setIsUploading] =
    useState(false);
  const [uploadProgress, setUploadProgress] =
    useState("");
  const [error, setError] = useState("");
  // Every upload is confirmed first: what kind, which application, and
  // which control(s) -- "Upload & Apply" shows this, "Yes, upload" sends.
  const [confirming, setConfirming] = useState(false);

  const kindLabel =
    kind === "evidence" ? "evidence" : "testing data";

  const selectedApplication =
    applications.find(
      (application) =>
        application.id === applicationId
    );

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!applicationId || files.length === 0) {
      setError(
        "Choose an application and at least one file."
      );
      return;
    }

    if (scope === "selected" && !controlName) {
      setError(
        "Choose a control, or switch to All Controls."
      );
      return;
    }

    setError("");
    setConfirming(true);
  }

  async function upload() {
    setIsUploading(true);
    setError("");

    const documents: Array<{
      id: string;
      filename: string;
      extractedText: string;
    }> = [];

    try {
      // Uploaded one at a time (not Promise.all) so
      // uploadProgress reflects real sequence and a failure
      // partway through has a clear "how far did it get"
      // story rather than a pile of concurrent errors.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setUploadProgress(
          `Uploading ${i + 1} of ${files.length}: ${file.name}...`
        );

        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "applicationId",
          applicationId
        );
        formData.append("scope", scope);
        formData.append("kind", kind);

        if (scope === "selected") {
          formData.append(
            "controlNames",
            JSON.stringify([controlName])
          );
        }

        const response = await fetch(
          "/api/evidence",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            `${file.name}: ${data.error || "Upload failed."}`
          );
        }

        documents.push({
          id: data.evidence.id,
          filename: data.evidence.filename,
          extractedText:
            data.evidence.extractedText,
        });
      }

      onUploaded({
        kind,
        applicationId,
        applicationName:
          selectedApplication?.name ||
          applicationId,
        scope,
        controlName:
          scope === "selected"
            ? controlName
            : undefined,
        documents,
      });

      onClose();
    } catch (err) {
      setConfirming(false);
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!isUploading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) =>
          event.stopPropagation()
        }
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <h4 className="text-base font-semibold text-white">
          {kind === "evidence"
            ? "Attach Evidence"
            : "Attach Testing Data"}
        </h4>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          {kind === "evidence"
            ? "Upload a document from the application team (a workpaper, policy, or screenshot export). "
            : "Upload testing data you've collected (a config export, user list, or system data pull). "}
          Its content updates notes for the
          control(s) you choose below (and
          application context, if it addresses
          it), tagged as{" "}
          {kind === "evidence"
            ? "evidence"
            : "testing data"}
          , and is stored so
          you can ask questions about it later.
        </p>

        {confirming ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-sm leading-6 text-slate-200">
              <p className="font-semibold text-white">
                You&apos;re adding{" "}
                {files.length === 1
                  ? `1 ${kindLabel} file`
                  : `${files.length} ${kindLabel} files`}{" "}
                to:
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                <dt className="text-slate-400">Application</dt>
                <dd className="font-medium text-white">
                  {selectedApplication?.name || applicationId}
                </dd>
                <dt className="text-slate-400">
                  {scope === "all" ? "Controls" : "Control"}
                </dt>
                <dd className="font-medium text-white">
                  {scope === "all"
                    ? `All controls (${selectedApplication?.controls.length ?? 0})`
                    : controlName}
                </dd>
              </dl>
              <ul className="mt-2 space-y-0.5 text-[12.5px] text-slate-300">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="truncate">
                    • {file.name}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-medium text-white">Proceed?</p>
            </div>

            {uploadProgress ? (
              <p className="text-xs text-slate-400">
                {uploadProgress}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isUploading}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                No, go back
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => void upload()}
                disabled={isUploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isUploading ? "Uploading…" : "Yes, upload"}
              </button>
            </div>
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3"
        >
          <label className="block text-xs text-slate-400">
            Application
            <select
              value={applicationId}
              onChange={(event) => {
                setApplicationId(
                  event.target.value
                );
                setControlName("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {applications.map(
                (application) => (
                  <option
                    key={application.id}
                    value={application.id}
                  >
                    {application.name ||
                      application.id}
                  </option>
                )
              )}
            </select>
          </label>

          <div className="text-xs text-slate-400">
            Controls
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-slate-200">
                <input
                  type="radio"
                  checked={scope === "all"}
                  onChange={() =>
                    setScope("all")
                  }
                />
                All controls
              </label>

              <label className="flex items-center gap-1.5 text-sm text-slate-200">
                <input
                  type="radio"
                  checked={
                    scope === "selected"
                  }
                  onChange={() =>
                    setScope("selected")
                  }
                />
                Specific control
              </label>
            </div>

            {scope === "selected" ? (
              <select
                value={controlName}
                onChange={(event) =>
                  setControlName(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">
                  Choose a control...
                </option>

                {(
                  selectedApplication?.controls ??
                  []
                ).map((control) => (
                  <option
                    key={control.id}
                    value={control.name}
                  >
                    {control.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <label className="block text-xs text-slate-400">
            Files
            <input
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              onChange={(event) => {
                const picked = Array.from(
                  event.target.files ?? []
                );

                setFiles((current) => [
                  ...current,
                  ...picked,
                ]);

                // Lets the same file be re-picked
                // later if removed and re-added.
                event.target.value = "";
              }}
              className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              .docx, .pptx, .xlsx, .pdf, .csv,
              .json, .txt, .md — no size limit,
              multiple allowed
            </span>
          </label>

          {files.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 text-xs text-slate-300"
                >
                  <span className="truncate">
                    {file.name}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeFile(index)
                    }
                    disabled={isUploading}
                    className="shrink-0 text-rose-400 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {uploadProgress ? (
            <p className="text-xs text-slate-400">
              {uploadProgress}
            </p>
          ) : null}

          {error ? (
            <p className="text-xs font-medium text-rose-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isUploading
                ? "Uploading…"
                : "Upload & Apply"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
