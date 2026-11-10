"use client";

// New UI home: the application dashboard from the Untitled.png
// reference -- search + filter selects + Export, All Apps / Favorites /
// + New tabs, "Showing X of Y" + Legend, then a card grid. Rendered
// only after app state has loaded (see page.tsx), so the lazy
// localStorage read below never runs during server rendering.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/components/AppStateProvider";
import { buildControlDrillDownFilters } from "@/services/applicationFilters";
import { generateExecutiveProgressPdf } from "@/services/exportReport";
import { HubAppCard, I, Icon, T, needsAttention } from "./hubUi";
import { useHubChat } from "./HubShell";

const FAVORITES_KEY = "control-governor-favorites";

function readFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function Select({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: string[] }) {
  return (
    <label className="relative flex h-[30px] items-center rounded-md border bg-white text-[13px]" style={{ borderColor: T.border }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-full appearance-none bg-transparent pl-3 pr-9 outline-none" style={{ color: T.text }}>
        <option value="all">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3" style={{ color: T.text }}><Icon d={I.chevron} size={14} /></span>
    </label>
  );
}

function Legend() {
  const [open, setOpen] = useState(false);
  const row = "flex items-center gap-2";
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-1" style={{ color: T.text }}>
        <Icon d={I.info} size={14} /> Legend
      </button>
      {open ? (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute right-0 top-full z-50 mt-2 block w-64 space-y-2 rounded-lg border bg-white p-3 text-[12.5px] shadow-lg" style={{ borderColor: T.border, color: T.body }}>
            <span className="block font-semibold" style={{ color: T.text }}>Task bar</span>
            <span className={row}><span className="h-2 w-4 rounded-sm" style={{ background: T.green }} /> Done</span>
            <span className={row}><span className="h-2 w-4 rounded-sm" style={{ background: T.blue }} /> Open, with evidence notes</span>
            <span className={row}><span className="h-2 w-4 rounded-sm" style={{ background: T.gray }} /> Open, no evidence yet</span>
            <span className="block pt-1 font-semibold" style={{ color: T.text }}>Control rows</span>
            <span className={row}><span className="rounded-full border px-1.5 text-[11px] font-semibold" style={{ borderColor: T.border }}>3</span> Open tasks on the control</span>
            <span className={row}><Icon d={I.lock} size={14} color={T.orange} /> Homework waiting (green = done)</span>
            <span className={row}><Icon d={I.check} size={14} color={T.gray} /> Control status (green = completed)</span>
            <span className={row}><Icon d={I.warn} size={14} color={T.orange} /> Needs attention</span>
            <span className={row}><Icon d={I.db} size={14} color={T.teal} /> Has evidence / data notes</span>
          </span>
        </>
      ) : null}
    </span>
  );
}

export default function HubDashboard() {
  const { applications, setFilters } = useAppState();
  const { openChat } = useHubChat();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState("all");
  const [context, setContext] = useState("all");
  const [stage, setStage] = useState("all");
  const [tab, setTab] = useState<"all" | "favorites">("all");
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const controls = applications.flatMap((a) => a.controls);
  const frameworks = [...new Set(controls.map((c) => c.framework))];
  const stages = [...new Set(controls.map((c) => c.stage))];
  const favoriteCount = applications.filter((a) => favorites.includes(a.id)).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications
      .filter((a) => {
        if (tab === "favorites" && !favorites.includes(a.id)) return false;
        if (framework !== "all" && !a.controls.some((c) => c.framework === framework)) return false;
        if (context !== "all" && a.contextStatus !== context) return false;
        if (stage !== "all" && !a.controls.some((c) => c.stage === stage)) return false;
        if (!q) return true;
        return [
          a.name,
          a.applicationOwner,
          a.technicalOwner,
          a.businessProcess,
          ...a.applicationContacts,
          ...a.controls.flatMap((c) => [c.name, c.clientContext, c.globalControlReference]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      // Applications needing attention first, like the reference's
      // failing-first ordering; otherwise alphabetical.
      .sort((x, y) => {
        const ax = x.controls.some(needsAttention) ? 0 : 1;
        const ay = y.controls.some(needsAttention) ? 0 : 1;
        return ax - ay || x.name.localeCompare(y.name);
      });
  }, [applications, query, framework, context, stage, tab, favorites]);

  const tabClass = (active: boolean) => `-mb-px flex items-center gap-1.5 border-b-2 pb-2 ${active ? "font-semibold" : ""}`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-[30px] min-w-[240px] flex-1 items-center gap-2 rounded-md border bg-white px-3 text-[13px]" style={{ borderColor: T.border }}>
          <Icon d={I.search} size={15} color={T.faint} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps, owners, contacts, controls…"
            className="h-full flex-1 bg-transparent outline-none"
            style={{ color: T.text, boxShadow: "none" }}
          />
        </label>
        <Select value={framework} onChange={setFramework} all="All frameworks" options={frameworks} />
        <Select value={context} onChange={setContext} all="All context" options={["Complete", "Partial", "Missing"]} />
        <Select value={stage} onChange={setStage} all="All stages" options={stages} />
        <button
          type="button"
          onClick={() => generateExecutiveProgressPdf(applications)}
          title="Download the executive progress PDF"
          className="flex h-[30px] items-center gap-2 rounded-md border bg-white px-3 text-[13px]"
          style={{ borderColor: T.border, color: T.text }}
        >
          <Icon d={I.download} size={14} /> Export
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-5 border-b text-[12.5px]" style={{ borderColor: T.border }}>
        <button type="button" onClick={() => setTab("all")} className={tabClass(tab === "all")} style={{ borderColor: tab === "all" ? T.teal : "transparent", color: T.text }}>
          All Apps
        </button>
        <button type="button" onClick={() => setTab("favorites")} className={tabClass(tab === "favorites")} style={{ borderColor: tab === "favorites" ? T.teal : "transparent", color: T.body }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={T.body} aria-hidden><path d={I.star} /></svg>
          Favorites <span className="text-[11px]" style={{ color: T.faint }}>{favoriteCount}</span>
        </button>
        <button type="button" onClick={openChat} title="Applications are created through the assistant" className="-mb-px flex items-center gap-1 pb-2 font-medium" style={{ color: T.teal }}>
          <Icon d={I.plus} size={14} /> New
        </button>
        <span className="ml-auto flex items-center gap-4 pb-2 text-[12px]" style={{ color: T.faint }}>
          Showing {visible.length} of {applications.length} applications
          <Legend />
        </span>
      </div>

      {applications.length === 0 ? (
        <div className="mt-10 rounded-[10px] border border-dashed p-10 text-center text-[14px]" style={{ borderColor: T.border, color: T.muted }}>
          No applications yet.{" "}
          <button type="button" onClick={openChat} className="font-medium underline" style={{ color: T.teal }}>
            Open the assistant
          </button>{" "}
          to create one.
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-10 text-center text-[14px]" style={{ color: T.faint }}>
          {tab === "favorites" && favoriteCount === 0 ? "No favorites yet — click the star on an application card." : "No applications match these filters."}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-[18px] min-[760px]:grid-cols-2 min-[1150px]:grid-cols-3 min-[1500px]:grid-cols-4">
          {visible.map((a) => (
            <HubAppCard
              key={a.id}
              app={a}
              mono="font-mono"
              favorite={favorites.includes(a.id)}
              onToggleFavorite={() => toggleFavorite(a.id)}
              onOpen={() => router.push(`/applications?app=${encodeURIComponent(a.id)}`)}
              onOpenControl={(cid) => {
                // Open the control list on exactly this control.
                const control = a.controls.find((c) => c.id === cid);
                if (control) setFilters(buildControlDrillDownFilters(a, control));
                router.push(`/controls?control=${encodeURIComponent(cid)}`);
              }}
            />
          ))}
        </div>
      )}

      <footer className="mt-10 border-t pt-4 text-center text-[11.5px]" style={{ borderColor: T.border, color: T.faint }}>
        Control Governor · Developed by Manoj | Version {process.env.NEXT_PUBLIC_APP_VERSION}
      </footer>
    </div>
  );
}
