// ======================================================
// Component Name : Header
// Purpose        : Displays application title,
//                  workspace, framework, and a compact
//                  progress summary strip
// Author         : Manoj
// ======================================================

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
      <div className="mx-auto grid w-full max-w-[1900px] gap-4 px-5 py-3 xl:grid-cols-2 xl:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Work Governor
            </h1>

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
