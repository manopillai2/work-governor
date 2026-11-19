"use client";

// New UI (Compliance Hub) page shell, modelled on the Untitled.png
// reference: left sidebar (brand, grouped nav with count badges,
// assistant button pinned at the bottom), slim top bar (breadcrumb,
// "Take the tour", notifications, data health, user chip, UI switch),
// a five-cell KPI strip, then the page. The assistant chat lives in a
// right-hand slide-over drawer instead of a fixed column.

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import AppLogo from "@/components/AppLogo";
import ChatPanel from "@/components/ChatPanel";
import { useAppState } from "@/components/AppStateProvider";
import type { ProgressTileKey } from "@/components/ProgressSummary";
import ThemeToggle from "@/components/ThemeToggle";
import OnboardingModal from "./OnboardingModal";
import ProductTour, { readTourStep } from "./ProductTour";
import { readinessCounts } from "@/services/readiness";
import AssistantTaskModal, { type AssistantTask } from "./AssistantTaskModal";
import { useExecutiveSummaryPreview } from "@/components/ExecutiveSummaryPreview";
import {
  I,
  Icon,
  SegBar,
  T,
  taskParts,
  taskStats,
} from "./hubUi";

// ---------- assistant drawer context ----------
// openOnboarding opens the application onboarding pop-out (new app,
// or new controls for the given existing application).
// runTask runs a one-click assistant action (prep email, uploads, ...)
// in a result pop-up instead of the drawer. Undefined outside the New
// UI shell, where callers fall back to sending straight to the chat.
const HubChatContext = createContext<{
  openChat: () => void;
  openOnboarding: (applicationId?: string) => void;
  runTask?: (task: AssistantTask) => void;
}>({
  openChat: () => {},
  openOnboarding: () => {},
});
export const useHubChat = () => useContext(HubChatContext);

type Progress = ReturnType<typeof useAppState>["progress"];

// ---------- KPI strip ----------
function Kpis({ progress, onTile }: { progress: Progress; onTile: (k: ProgressTileKey) => void }) {
  const { applications } = useAppState();
  const controls = applications.flatMap((a) => a.controls);
  const s = taskStats(controls);
  // Readiness profiles (services/readiness.ts): built from the evidence
  // checked against the full testing data.
  const profiles = controls.filter((c) => c.readinessProfile);
  const counts = profiles.map((c) => readinessCounts(c.readinessProfile!));
  const verified = counts.reduce((n, c) => n + c.verified, 0);
  const applicable = counts.reduce((n, c) => n + c.applicable, 0);
  const r = {
    built: profiles.length,
    percent: applicable ? Math.round((verified / applicable) * 100) : 0,
    sufficient: profiles.filter((c) => c.readinessProfile!.sufficiency.verdict === "sufficient").length,
    conflicts: counts.reduce((n, c) => n + c.conflict, 0),
    conflictControls: counts.filter((c) => c.conflict > 0).length,
    stale: profiles.filter((c) => c.readinessStale).length,
  };
  const missingContext = applications.filter((a) => a.contextStatus !== "Complete").length;

  const cell = "flex flex-col justify-center px-4 py-2 text-left transition hover:bg-[#f7f9fb]";
  const big = "text-[22px] font-semibold leading-tight";
  const sub = "text-[11.5px]";

  return (
    <div data-tour="kpis" className="grid grid-cols-2 overflow-hidden rounded-b-[10px] border border-t-0 lg:grid-cols-[1fr_1fr_2fr_1fr_1fr]" style={{ background: T.card, borderColor: T.border }}>
      <button type="button" className={cell} onClick={() => onTile("applications")}>
        <span className="text-[12.5px]" style={{ color: T.text }}>Applications</span>
        <span className={big} style={{ color: T.text }}>{progress.applications}</span>
        <span className={sub} style={{ color: T.teal }}>{missingContext} missing context ›</span>
      </button>

      <button type="button" className={`${cell} border-l`} style={{ borderColor: T.divider }} onClick={() => onTile("needsAttention")}>
        <span className="text-[12.5px]" style={{ color: T.text }}>Needs attention</span>
        <span className={big} style={{ color: progress.needsAttention ? T.red : T.text }}>{progress.needsAttention}</span>
        <span className={sub} style={{ color: T.muted }}>across {progress.controls} controls</span>
      </button>

      <div className="flex flex-col justify-center border-l px-4 py-2" style={{ borderColor: T.divider }}>
        <span className="text-[12.5px]" style={{ color: T.text }}>Checklist results</span>
        <div className="my-1.5 flex"><SegBar parts={taskParts(s)} height={6} /></div>
        <span className={sub} style={{ color: T.muted }}>
          <b style={{ color: T.text }}>{s.done} done</b> · <b style={{ color: T.blue }}>{s.evidenced} evidenced</b> · {s.open} open
        </span>
      </div>

      <div
        data-tour="kpi-readiness"
        className="flex flex-col justify-center border-l px-4 py-2"
        style={{ borderColor: T.divider }}
        title="Share of readiness-profile items (identities, policy layers, access...) that the real testing data verifies, across every control with a profile. Build profiles from an application's View details → Work progress."
      >
        <span className="text-[12.5px]" style={{ color: T.text }}>Verified by real data</span>
        <span className={big} style={{ color: r.built ? T.text : T.faint }}>{r.built ? `${r.percent}%` : "—"}</span>
        <span className={sub} style={{ color: T.muted }}>
          {r.built} of {controls.length} controls profiled{r.built ? ` · ${r.sufficient} data-sufficient` : ""}
        </span>
      </div>

      <div
        data-tour="kpi-conflicts"
        className="flex flex-col justify-center border-l px-4 py-2"
        style={{ borderColor: T.divider }}
        title="Readiness items where the real data contradicts what the evidence claims -- the findings auditors and application teams most need to see."
      >
        <span className="text-[12.5px]" style={{ color: T.text }}>Evidence vs. data conflicts</span>
        <span className={big} style={{ color: r.conflicts ? T.red : r.built ? T.text : T.faint }}>{r.built ? r.conflicts : "—"}</span>
        <span className={sub} style={{ color: r.stale ? T.orange : T.muted }}>
          {r.built ? (r.stale ? `${r.stale} profile${r.stale === 1 ? "" : "s"} need a rebuild (new uploads)` : `across ${r.conflictControls} control${r.conflictControls === 1 ? "" : "s"}`) : "build a readiness profile to see"}
        </span>
      </div>
    </div>
  );
}

// ---------- sidebar ----------
const SIDEBAR_COLLAPSED_KEY = "control-governor-sidebar-collapsed";

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

// One sidebar row -- a link or a button. Collapsed: icon only, centred,
// with the label as a tooltip and any count as a small corner badge.
function NavItem({
  href,
  onClick,
  icon,
  label,
  active = false,
  badge,
  newTab,
  collapsed,
}: {
  href?: string;
  onClick?: () => void;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
  newTab?: boolean;
  collapsed: boolean;
}) {
  const badgeText = badge === undefined ? null : badge > 99 ? "99+" : String(badge);
  const className = `relative mb-0.5 flex w-full items-center rounded-md py-1.5 text-left text-[13.5px] hover:bg-[#e4eaef] ${
    collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
  }`;
  const style = active ? { background: T.tealActive, color: T.text, fontWeight: 500 } : { color: T.body };
  const content = (
    <>
      {active ? <span aria-hidden className="absolute -left-2 top-1 bottom-1 w-[3px] rounded-r" style={{ background: T.teal }} /> : null}
      <Icon d={icon} size={collapsed ? 17 : 15} color={active ? T.text : T.muted} />
      {collapsed ? (
        badgeText ? (
          <span className="absolute right-1 top-0.5 rounded-full px-1 text-[9px] font-semibold leading-[14px]" style={{ background: active ? "#fff" : "#dde3e9", color: T.body }}>
            {badgeText}
          </span>
        ) : null
      ) : (
        <>
          <span className="flex-1">{label}</span>
          {badgeText ? (
            <span className="rounded-full px-1.5 py-[1px] text-[11px] font-medium" style={{ background: active ? "#fff" : "#e3e8ed", color: T.body }}>
              {badgeText}
            </span>
          ) : null}
        </>
      )}
    </>
  );
  const tooltip = collapsed ? (badgeText ? `${label} (${badgeText})` : label) : undefined;

  return href ? (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={className}
      style={style}
      title={tooltip}
      aria-label={collapsed ? label : undefined}
    >
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} style={style} title={tooltip} aria-label={collapsed ? label : undefined}>
      {content}
    </button>
  );
}

export default function HubShell({ title, progress, children }: { title: string; progress?: Progress; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    applications,
    messages,
    isLoaded,
    loadError,
    isProcessing,
    processingSummary,
    handleSend,
    openEvidenceModal,
    applyQuickFilter,
  } = useAppState();
  const [chatOpen, setChatOpen] = useState(false);
  // null = closed; otherwise the pre-selected application ("" for none).
  const [onboarding, setOnboarding] = useState<string | null>(null);
  // Product tour step; resumes after the tour moves to another page
  // (HubShell only mounts on the client, so reading storage here is safe).
  const [tourStep, setTourStep] = useState<number | null>(readTourStep);
  const [task, setTask] = useState<{ id: number; task: AssistantTask } | null>(null);
  const { openPreview, previewModal } = useExecutiveSummaryPreview();
  // Remembered per browser. HubShell only ever mounts on the client
  // (the UI mode comes from localStorage after hydration), so reading
  // it in the initializer can't cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const controlCount = applications.reduce((n, a) => n + a.controls.length, 0);

  // Same drill-down behaviour as the classic Header's tiles; in the
  // New UI the flat control list lives at /controls.
  function handleTile(key: ProgressTileKey) {
    if (key === "applications") {
      router.push("/applications");
      return;
    }
    applyQuickFilter(key);
    if (pathname !== "/controls") router.push("/controls");
  }

  // Same small uppercase label as the dashboard / PDF section headings.
  const sectionLabel = "px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]";

  return (
    <HubChatContext.Provider value={{ openChat: () => setChatOpen(true), openOnboarding: (id) => setOnboarding(id ?? ""), runTask: (t) => setTask({ id: Date.now(), task: t }) }}>
      <div className="flex h-screen w-screen overflow-hidden" style={{ background: T.canvas, color: T.text }}>
        {/* Sidebar */}
        <aside
          className={`hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex ${collapsed ? "w-[56px]" : "w-[195px]"}`}
          style={{ background: T.sidebar, borderColor: T.border }}
        >
          <div className={`flex items-start ${collapsed ? "justify-center px-2 pb-3 pt-4" : "pb-3.5 pl-4 pr-2 pt-4"}`}>
            <Link href="/" className={collapsed ? "flex" : "block min-w-0 flex-1"} title={collapsed ? "Control Governor — Dashboard" : undefined}>
              <div className="flex items-center gap-2">
                <AppLogo size={collapsed ? 22 : 19} />
                {collapsed ? null : (
                  <span className="truncate text-[16.5px] font-bold tracking-tight" style={{ color: "#16324a" }}>Control Governor</span>
                )}
              </div>
              {collapsed ? null : (
                <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]" style={{ color: T.muted }}>Compliance hub</div>
              )}
            </Link>
          </div>

          <nav data-tour="nav" className={`flex-1 overflow-y-auto border-t pt-3 ${collapsed ? "px-1.5" : "px-2"}`} style={{ borderColor: T.border }}>
            {[
              {
                // The three working views, broad to detailed.
                label: "Workspace",
                items: (
                  <>
                    <NavItem collapsed={collapsed} href="/" icon={I.grid} label="Dashboard" active={pathname === "/"} />
                    <NavItem collapsed={collapsed} href="/applications" icon={I.apps} label="Applications" active={!!pathname?.startsWith("/applications")} badge={applications.length} />
                    <NavItem collapsed={collapsed} href="/controls" icon={I.list} label="Controls" active={!!pathname?.startsWith("/controls")} badge={controlCount} />
                  </>
                ),
              },
              {
                label: "Reports",
                items: (
                  <>
                    <NavItem collapsed={collapsed} onClick={() => openPreview(applications)} icon={I.report} label="Executive summary" />
                  </>
                ),
              },
              {
                label: "Support",
                items: (
                  <>
                    <NavItem collapsed={collapsed} href="/guide" icon={I.book} label="Guide" newTab />
                    <NavItem collapsed={collapsed} href="/health" icon={I.pulse} label="Health" active={!!pathname?.startsWith("/health")} />
                  </>
                ),
              },
            ].map((group, index) => (
              <div key={group.label} className="mb-4">
                {collapsed ? (
                  index > 0 ? <div className="mx-2 mb-3 border-t" style={{ borderColor: T.border }} /> : null
                ) : (
                  <div className={sectionLabel} style={{ color: T.faint }}>{group.label}</div>
                )}
                {group.items}
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t p-2" style={{ borderColor: T.border }}>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              title={collapsed ? `Assistant (${messages.length} messages)` : undefined}
              aria-label={collapsed ? "Open assistant" : undefined}
              className="relative flex w-full items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium"
              style={{ background: T.tealActive, color: T.teal }}
            >
              <Icon d={I.chat} size={15} />
              {collapsed ? null : (
                <>
                  Assistant
                  <span className="rounded-full bg-white px-1.5 text-[11px]" style={{ color: T.body }}>{messages.length}</span>
                </>
              )}
            </button>

            <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-[#e4eaef]"
                style={{ color: T.muted }}
              >
                <Icon d={collapsed ? I.expand : I.collapse} size={15} />
              </button>
              {collapsed ? null : (
                <>
                  <Link
                    href="/guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium"
                    style={{ background: "#e3e8ed", color: T.body }}
                  >
                    <Icon d={I.book} size={12} /> Guide
                  </Link>
                  <span className="text-[11.5px]" style={{ color: T.faint }}>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[46px] shrink-0 items-center gap-2 border-b bg-white px-4" style={{ borderColor: T.border }}>
            <span className="text-[15px]" style={{ color: T.faint }}>/</span>
            <span className="truncate text-[14.5px] font-medium" style={{ color: T.text }}>{title}</span>
            <div className="ml-auto flex shrink-0 items-center gap-4">
              <button
                type="button"
                data-tour="tour-button"
                onClick={() => setTourStep(0)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium"
                style={{ background: T.tealSoft, color: T.teal }}
                title="A one-minute guided tour of the app"
              >
                <Icon d={I.play} size={11} /> Take the tour
              </button>
              <span title={isProcessing ? "The assistant is working on your request" : "No background work running"} className="relative">
                <Icon d={I.bell} size={18} color={T.muted} />
                {isProcessing ? <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ background: T.orange }} /> : null}
              </span>
              <span className="h-5 w-px" style={{ background: T.border }} />
              <Link href="/health" className="flex items-center gap-1.5 text-[12.5px]" style={{ color: T.muted }}>
                <span className="h-2 w-2 rounded-full" style={{ background: loadError ? T.red : isLoaded ? "#3fb37f" : T.gray }} />
                Data Health
              </Link>
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10.5px] font-bold" style={{ background: "#e6ebf0", color: "#33404d" }}>M</span>
                <span className="text-[12px] font-semibold leading-tight" style={{ color: T.text }}>
                  Manoj
                  <span className="block text-[10.5px] font-normal" style={{ color: T.muted }}>Workspace: CORE</span>
                </span>
              </span>
              <ThemeToggle />
            </div>
          </header>

          {/* app-canvas-bg/bg-slate-950/text-slate-100 keep the existing
              components' inherited colours mapped by globals.css */}
          <main data-tour="main" className="app-canvas-bg flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950 text-slate-100">
            {progress ? (
              <div className="shrink-0 px-4">
                <Kpis progress={progress} onTile={handleTile} />
              </div>
            ) : null}
            {children}
          </main>
        </div>

        {/* Assistant drawer */}
        {chatOpen ? (
          <div className="fixed inset-0 z-30 flex justify-end" style={{ background: "rgba(20,30,40,0.18)" }} onClick={() => setChatOpen(false)}>
            <div className="flex h-full w-full max-w-[480px] flex-col gap-2 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex shrink-0 justify-end">
                <button type="button" onClick={() => setChatOpen(false)} className="flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 text-[12.5px] font-medium" style={{ borderColor: T.border, color: T.body }}>
                  Close <Icon d={I.close} size={13} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ChatPanel
                  messages={messages}
                  onSend={handleSend}
                  pendingRequest={isProcessing ? processingSummary : undefined}
                  onAttachEvidence={(kind) => openEvidenceModal(kind)}
                />
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            data-tour="assistant"
            onClick={() => setChatOpen(true)}
            className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium shadow-lg"
            style={{ background: T.teal, color: "#fff" }}
          >
            <Icon d={I.chat} size={16} />
            {isProcessing ? "Assistant · working…" : "Assistant"}
          </button>
        )}
      </div>
      {previewModal}
      {onboarding !== null ? (
        <OnboardingModal initialApplicationId={onboarding || undefined} onClose={() => setOnboarding(null)} />
      ) : null}
      {tourStep !== null ? <ProductTour initialStep={tourStep} onClose={() => setTourStep(null)} /> : null}
      {task ? <AssistantTaskModal key={task.id} initialTask={task.task} onClose={() => setTask(null)} /> : null}
    </HubChatContext.Provider>
  );
}
