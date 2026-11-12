"use client";

// Small (i) button that opens a read-only "Control details" dialog --
// objective, risk, why it applies, evidence strategy, plus the global
// reference and client context. Replaces the per-card "Control
// Details" section so the details stay one click away from each
// control without taking space in it.
//
// Accepts one control or several (the same control type across
// applications, from the /controls group header). With several, a
// field whose text is identical everywhere is shown once ("Same for
// all N applications"); a field that differs is listed per
// application -- these are written per application from its own
// context, so nothing is merged away.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type Details = {
  controlName: string;
  applicationName?: string;
  framework?: string;
  globalControlReference?: string;
  clientContext?: string;
  controlObjective: string;
  controlRisk: string;
  applicabilityRationale: string;
  evidenceStrategy: string;
};

type FieldKey = "controlObjective" | "controlRisk" | "applicabilityRationale" | "evidenceStrategy";

const FIELDS: { key: FieldKey; title: string }[] = [
  { key: "controlObjective", title: "Control objective" },
  { key: "controlRisk", title: "Risk addressed" },
  { key: "applicabilityRationale", title: "Why this control applies" },
  { key: "evidenceStrategy", title: "Evidence strategy" },
];

const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();

function Text({ content }: { content: string }) {
  return (
    <p className={`whitespace-pre-wrap text-[13px] leading-6 ${content ? "text-[#1b2430]" : "text-[#9aa3ae]"}`}>
      {content || "Not captured yet."}
    </p>
  );
}

function Field({ title, fieldKey, items }: { title: string; fieldKey: FieldKey; items: Details[] }) {
  const many = items.length > 1;
  const values = items.map((d) => d[fieldKey]);
  const same = new Set(values.map(norm)).size === 1;
  return (
    <section className="rounded-lg border border-[#e3e8ee] bg-[#f8fafc] p-3">
      <h5 className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7684]">
        {title}
        {many && values.some((v) => v.trim()) ? (
          <span className={`rounded-full px-2 py-[1px] text-[10px] font-medium normal-case tracking-normal ${same ? "bg-[#e6f5ee] text-[#0f8a5f]" : "bg-[#fdf1e6] text-[#b45309]"}`}>
            {same ? `Same for all ${items.length} applications` : "Differs by application"}
          </span>
        ) : null}
      </h5>
      <div className="mt-1">
        {!many || same ? (
          <Text content={values[0]} />
        ) : (
          <ul className="space-y-2">
            {items.map((d, i) => (
              <li key={i} className="border-l-2 border-[#cfe3e7] pl-2.5">
                <span className="text-[11px] font-semibold text-[#0f7d8c]">{d.applicationName || "Application"}</span>
                <Text content={values[i]} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const uniq = (xs: (string | undefined)[]) => [...new Set(xs.map((x) => (x ?? "").trim()).filter(Boolean))];

// The reference line + the four detail fields (merged across
// applications as described above). Used inside the dialog, and
// inline wherever details sit on the page.
export function ControlDetailsContent({ details }: { details: Details | Details[] }) {
  const items = Array.isArray(details) ? details : [details];
  return (
    <>
      {(() => {
        const refs = uniq(items.map((d) => d.globalControlReference));
        const ctx = uniq(items.map((d) => d.clientContext));
        return refs.length || ctx.length ? (
          <dl className="mt-3 grid gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-[130px_1fr]">
            {refs.length ? (
              <>
                <dt className="text-[#9aa3ae]">Global reference</dt>
                <dd className="text-[#1b2430]">{refs.join(" · ")}</dd>
              </>
            ) : null}
            {ctx.length ? (
              <>
                <dt className="text-[#9aa3ae]">Client context</dt>
                <dd className="text-[#1b2430]">{ctx.join(" · ")}</dd>
              </>
            ) : null}
          </dl>
        ) : null;
      })()}

      <div className={`mt-4 grid gap-3 ${items.length > 1 ? "" : "sm:grid-cols-2"}`}>
        {FIELDS.map((f) => (
          <Field key={f.key} title={f.title} fieldKey={f.key} items={items} />
        ))}
      </div>
    </>
  );
}

export default function ControlDetailsButton({ details, size = 28, title = "Control details" }: { details: Details | Details[]; size?: number; title?: string }) {
  const items = Array.isArray(details) ? details : [details];
  const first = items[0];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Capture phase + preventDefault: when this dialog sits on top of
    // another (the /controls pop-out), Esc closes only this one.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        title={title}
        aria-label={`${title} for ${first?.controlName ?? "control"}`}
        className="flex shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:bg-slate-100 hover:text-[#0f7d8c]"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      </button>

      {open
        ? createPortal(
            // React portals still bubble events through the component tree, so
            // stop clicks/keys here from reaching the row that hosts the button.
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,30,45,0.45)] p-4"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Control details for ${first?.controlName ?? "control"}`}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#dfe4ea] bg-white p-5 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0f7d8c]">Control details</p>
                    <h4 className="mt-0.5 text-[18px] font-semibold text-[#1b2430]">{first?.controlName}</h4>
                    <p className="mt-0.5 text-[12px] text-[#6b7684]">
                      {[
                        items.length > 1 ? `${items.length} applications: ${uniq(items.map((d) => d.applicationName)).join(", ")}` : first?.applicationName,
                        uniq(items.map((d) => d.framework)).join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-[#6b7684] hover:bg-[#eef1f4]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                <ControlDetailsContent details={items} />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
