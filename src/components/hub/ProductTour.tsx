"use client";

// Guided product tour for the New UI ("Take the tour"): dims the page,
// spotlights one element at a time (found by its data-tour attribute)
// with a short explanation, and moves between pages where needed. Steps
// whose element isn't on screen (e.g. no applications yet) are skipped.
// The current step lives in sessionStorage because each page mounts its
// own HubShell -- navigating mid-tour resumes on the new page.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { T } from "./hubUi";

type Step = {
  path: string;
  target?: string; // data-tour value; none = centred card
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    path: "/",
    title: "Welcome to Control Governor",
    body: "A one-minute tour of where everything is. Use the buttons or ← → keys; Esc ends the tour.",
  },
  {
    path: "/",
    target: "nav",
    title: "Three views",
    body: "Dashboard — the executive overview. Applications — each application as a tile. Controls — every control in one list. The counts show how many of each you have.",
  },
  {
    path: "/",
    target: "main",
    title: "Dashboard",
    body: "Where every application and control type stands at a glance — the view to share with management.",
  },
  {
    path: "/applications",
    target: "kpis",
    title: "Your numbers",
    body: "Applications, controls needing attention and checklist progress. Click a number to drill into the matching controls.",
  },
  {
    path: "/applications",
    target: "kpi-readiness",
    title: "Verified by real data",
    body: "The share of readiness items (identities, policy layers, access…) that the real testing data proves, across every control with a readiness profile. This is the number to grow.",
  },
  {
    path: "/applications",
    target: "kpi-conflicts",
    title: "Evidence vs. data conflicts",
    body: "Places where the real data contradicts what the evidence claims. Red means there's something to raise with the application team.",
  },
  {
    path: "/applications",
    target: "app-filters",
    title: "Find an application",
    body: "Search by application, owner, contact or control; filter by framework, context or stage. Export downloads the executive PDF.",
  },
  {
    path: "/applications",
    target: "new-app",
    title: "+ New — onboarding",
    body: "Paste the details from your compliance tool (plain text is fine) to onboard a new application or add controls to an existing one. The assistant checks it, asks questions, and nothing is saved until you click Proceed.",
  },
  {
    path: "/applications",
    target: "app-tile",
    title: "Application tile",
    body: "Each row is a control: open tasks, its client code, its readiness score (% verified by real data; – not built yet; an orange dot means new uploads since), then homework, status and evidence icons.",
  },
  {
    path: "/applications",
    target: "view-details",
    title: "View details",
    body: "Opens the application: its context, Work progress with each control's readiness profile (what the evidence says vs. what the data shows, gaps, next data to request), uploads for evidence and testing data, and prep emails.",
  },
  {
    path: "/applications",
    target: "assistant",
    title: "Assistant",
    body: "Ask questions or give instructions in plain English. One-click actions (prep email, uploads, gap analysis) open in their own result window instead.",
  },
  {
    path: "/applications",
    target: "tour-button",
    title: "That's the tour",
    body: "Restart it here any time. The Guide (left sidebar) has the full reference.",
  },
];

const STORAGE_KEY = "control-governor-tour-step";
const PAD = 6;
const CARD_W = 340;

export function readTourStep(): number | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function saveStep(step: number | null) {
  try {
    if (step === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, String(step));
  } catch {}
}

const findTarget = (name: string) => document.querySelector<HTMLElement>(`[data-tour="${name}"]`);

export default function ProductTour({ initialStep, onClose }: { initialStep: number; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(initialStep);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const direction = useRef(1);
  const step = STEPS[index];

  const finish = useCallback(() => {
    saveStep(null);
    onClose();
  }, [onClose]);

  const go = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= STEPS.length) {
        finish();
        return;
      }
      direction.current = next >= index ? 1 : -1;
      setReady(false);
      setIndex(next);
    },
    [index, finish]
  );

  // Remember progress so a page change mid-tour resumes.
  useEffect(() => saveStep(index), [index]);

  // Go to the step's page, find its element (waiting for it to render),
  // or skip the step when it never appears.
  useEffect(() => {
    if (!step) return;
    if (pathname !== step.path) {
      router.push(step.path);
      return;
    }
    if (!step.target) return; // centred card -- nothing to find
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = findTarget(step.target!);
      if (el && el.getBoundingClientRect().width > 0) {
        window.clearInterval(timer);
        el.scrollIntoView({ block: "center", inline: "nearest" });
        window.setTimeout(() => {
          setRect(el.getBoundingClientRect());
          setReady(true);
        }, 250);
      } else if (++tries > 30) {
        window.clearInterval(timer);
        go(index + direction.current);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [step, pathname, router, index, go]);

  // Follow the element on resize / scroll.
  useLayoutEffect(() => {
    if (!step?.target || !ready) return;
    const update = () => {
      const el = findTarget(step.target!);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, go, finish]);

  // A step without a target is ready as soon as its page is showing.
  const shown = step ? (step.target ? ready : pathname === step.path) : false;
  const spot = step?.target ? rect : null;

  if (!step || !shown) {
    return <div className="fixed inset-0 z-[90]" style={{ background: "rgba(15,30,45,0.35)" }} />;
  }

  // Card placement: below the element if it fits, else above, else
  // beside it; always kept on screen.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(CARD_W, vw - 24);
  let cardStyle: React.CSSProperties;
  if (!spot) {
    cardStyle = { left: (vw - cardW) / 2, top: Math.max(24, vh / 2 - 110) };
  } else if (spot.height > vh * 0.55) {
    // A large area (a whole page section): card inside it, near the top.
    cardStyle = { left: Math.min(Math.max(12, spot.left + (spot.width - cardW) / 2), vw - cardW - 12), top: Math.max(12, spot.top) + 40 };
  } else {
    const estH = 190;
    const left = Math.min(Math.max(12, spot.left), vw - cardW - 12);
    if (spot.bottom + PAD + 12 + estH < vh) cardStyle = { left, top: spot.bottom + PAD + 12 };
    else if (spot.top - PAD - 12 - estH > 0) cardStyle = { left, bottom: vh - spot.top + PAD + 12 };
    else if (spot.right + PAD + 12 + cardW < vw) cardStyle = { left: spot.right + PAD + 12, top: Math.min(Math.max(12, spot.top), vh - estH - 12) };
    else cardStyle = { left: Math.max(12, spot.left - PAD - 12 - cardW), top: Math.min(Math.max(12, spot.top), vh - estH - 12) };
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dim everything except the spotlight; clicks outside do nothing. */}
      {spot ? (
        <div
          className="pointer-events-none fixed rounded-lg transition-all duration-200"
          style={{
            left: spot.left - PAD,
            top: spot.top - PAD,
            width: spot.width + PAD * 2,
            height: spot.height + PAD * 2,
            boxShadow: `0 0 0 9999px rgba(15,30,45,0.55), 0 0 0 2px ${T.teal}`,
          }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: "rgba(15,30,45,0.55)" }} />
      )}

      <div className="fixed rounded-xl border bg-white p-4 shadow-2xl" style={{ ...cardStyle, width: cardW, borderColor: T.border }}>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: T.teal }}>
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-[15px] font-semibold" style={{ color: T.text }}>
          {step.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-5" style={{ color: T.body }}>
          {step.body}
        </p>
        <div className="mt-3.5 flex items-center gap-2">
          <button type="button" onClick={finish} className="mr-auto text-[12.5px] font-medium" style={{ color: T.muted }}>
            {index === STEPS.length - 1 ? "Close" : "Skip tour"}
          </button>
          {index > 0 ? (
            <button type="button" onClick={() => go(index - 1)} className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: T.border, color: T.body }}>
              Back
            </button>
          ) : null}
          <button type="button" autoFocus onClick={() => go(index + 1)} className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: T.teal }}>
            {index === STEPS.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
