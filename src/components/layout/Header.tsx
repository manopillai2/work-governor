// ======================================================
// Component Name : Header
// Purpose        : Displays application title,
//                  workspace, framework, and a compact
//                  progress summary strip
// Author         : Manoj
// ======================================================

import Link from "next/link";

import ProgressSummary from "@/components/ProgressSummary";

type HeaderProps = {
  progress?: {
    applications: number;
    controls: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    needsAttention: number;
    argosReady: number;
  };
};

export default function Header({ progress }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-[1900px] gap-4 px-5 py-3 xl:grid-cols-[3fr_1fr] xl:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold leading-tight text-slate-900">
                Work Governor
              </h1>

              <Link
                href="/guide"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline underline-offset-2"
              >
                What is Work Governor?
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1 9L9 1M9 1H2.5M9 1V7.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              Workspace: CORE
            </span>

            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700">
              Framework: SOX
            </span>
          </div>

          <div className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm leading-6 text-slate-600">
              An AI-powered compliance workspace that turns plain-language
              application context into framework-aware SOX and PCI DSS
              checklists, adapts them from real findings with a fully
              auditable change history, and — through the Learning
              Engine — automatically carries validated knowledge across
              every application, driving toward authoritative,
              system-generated evidence and continuous Argos monitoring.
            </p>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Developed by Manoj
          </p>
        </div>

        {progress ? (
          <div className="flex items-center justify-center xl:justify-end">
            <ProgressSummary {...progress} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
