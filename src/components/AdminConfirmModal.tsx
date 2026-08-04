"use client";

import { useState, type FormEvent } from "react";

type AdminConfirmModalProps = {
  description: string;
  requiredPassword: string;
  requiredPhrase: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AdminConfirmModal({
  description,
  requiredPassword,
  requiredPhrase,
  onConfirm,
  onCancel,
}: AdminConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (password !== requiredPassword) {
      setError("Incorrect root password.");
      return;
    }

    if (
      phrase.trim().toLowerCase() !==
      requiredPhrase.trim().toLowerCase()
    ) {
      setError(
        `Confirmation text must match exactly: "${requiredPhrase}"`
      );
      return;
    }

    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) =>
          event.stopPropagation()
        }
        className="w-full max-w-md rounded-xl border border-amber-700/60 bg-slate-900 p-6 shadow-2xl"
      >
        <h4 className="text-base font-semibold text-amber-300">
          Confirm: {description}
        </h4>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          This is a destructive admin action.
          Enter the root password and type the
          confirmation text exactly as shown to
          proceed.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3"
        >
          <label className="block text-xs text-slate-400">
            Root password
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-xs text-slate-400">
            Type{" "}
            <span className="font-semibold text-slate-200">
              &quot;{requiredPhrase}&quot;
            </span>{" "}
            to confirm
            <input
              type="text"
              value={phrase}
              onChange={(event) => {
                setPhrase(event.target.value);
                setError("");
              }}
              placeholder={requiredPhrase}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
          </label>

          {error ? (
            <p className="text-xs font-medium text-rose-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
