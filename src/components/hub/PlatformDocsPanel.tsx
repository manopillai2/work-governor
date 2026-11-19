"use client";

// Application view: the official-documentation reference for the
// product this application runs on (services/platformDocs.ts) -- what
// was found, on which vendor sites, with every fact linked to its page.

import { useCallback, useEffect, useState } from "react";

import { T } from "@/components/hub/hubUi";
import type { Application } from "@/services/commandEngine";

type Reference = {
  id: string;
  productName: string;
  vendor: string;
  officialDomains: string[];
  status: "researched" | "no_public_docs" | "failed";
  summary: string;
  facts: { topic: string; fact: string; sourceUrl: string }[];
  sources: { url: string; title: string }[];
  note: string;
  researchedAt: string;
};

export default function PlatformDocsPanel({ application }: { application: Application }) {
  const [reference, setReference] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/platform-docs?name=${encodeURIComponent(application.name)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setReference(data.reference ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [application.name]);

  const research = useCallback(
    async (refresh: boolean) => {
      setResearching(true);
      setError("");
      try {
        const response = await fetch("/api/platform-docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refresh,
            application: {
              name: application.name,
              hosting: application.hosting,
              applicationPurpose: application.applicationPurpose,
              hostingDetails: application.hostingDetails,
              integrations: application.integrations,
              identityTypes: application.identityTypes,
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Research failed.");
        setReference(data.reference ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Research failed.");
      } finally {
        setResearching(false);
      }
    },
    [application],
  );

  const researched = reference?.status === "researched";
  const topics = researched ? [...new Set(reference.facts.map((f) => f.topic))] : [];
  const sourceIndex = (url: string) => (reference?.sources.findIndex((s) => s.url === url) ?? -1) + 1;

  return (
    <details className="group rounded-[10px] border border-l-[3px] bg-white p-4" style={{ borderColor: T.border, borderLeftColor: T.blue }}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold" style={{ color: T.text }}>Official documentation</span>
          <span className="block text-[12px]" style={{ color: T.muted }}>
            {loading
              ? "Checking…"
              : researching
                ? "Researching the vendor's official documentation — this can take a minute or two…"
                : researched
                  ? `${reference.productName}: ${reference.facts.length} facts from ${reference.sources.length} official page${reference.sources.length === 1 ? "" : "s"} (${reference.officialDomains.join(", ")}) · researched ${new Date(reference.researchedAt).toLocaleDateString()}`
                  : reference
                    ? `No official documentation reference — ${reference.note || "not a recognised product"}. Checklists use SOX knowledge and the application context.`
                    : "Not researched yet. It's looked up automatically the first time a checklist is generated."}
          </span>
        </span>
        <span className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={researching || loading}
            onClick={(e) => {
              e.preventDefault();
              void research(!!reference);
            }}
            className="rounded-md border px-2.5 py-1 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: T.teal, color: T.teal, background: T.tealSoft }}
            title={reference ? "Identify the product again and re-research its official documentation" : "Research the vendor's official documentation now"}
          >
            {researching ? "Researching…" : reference ? "Refresh" : "Research now"}
          </button>
        </span>
      </summary>

      {error ? <p className="mt-2 text-[12px]" style={{ color: T.red }}>{error}</p> : null}

      {researched ? (
        <div className="mt-3 space-y-3 text-[12.5px]" style={{ color: T.body }}>
          {reference.summary ? <p className="leading-6">{reference.summary}</p> : null}
          {topics.map((topic) => (
            <div key={topic}>
              <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: T.teal }}>{topic}</h5>
              <ul className="ml-4 list-disc space-y-0.5">
                {reference.facts
                  .filter((f) => f.topic === topic)
                  .map((f, i) => (
                    <li key={`${topic}-${i}`}>
                      {f.fact}{" "}
                      <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: T.teal }}>
                        [{sourceIndex(f.sourceUrl)}]
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          <div>
            <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: T.muted }}>Sources</h5>
            <ol className="ml-5 list-decimal space-y-0.5">
              {reference.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all underline" style={{ color: T.teal }}>
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ol>
          </div>
          <p className="text-[11.5px]" style={{ color: T.faint }}>
            Searched only on the vendor&apos;s official sites; each fact links to the page it came from. The documentation says what the product supports, not how this instance is configured — that still comes from the evidence and data.
          </p>
        </div>
      ) : null}
    </details>
  );
}
