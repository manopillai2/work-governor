// ======================================================
// Component Name : Header
// Purpose        : Displays application title,
//                  workspace and framework
// Author         : Manoj
// ======================================================

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between gap-4 px-5 py-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Work Governor
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            AI-powered personal compliance work assistant driving every
            application control toward authoritative, system-generated
            evidence and continuous Argos monitoring.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Developed by Manoj
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            Workspace: CORE
          </span>

          <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700">
            Framework: SOX
          </span>
        </div>
      </div>
    </header>
  );
}
