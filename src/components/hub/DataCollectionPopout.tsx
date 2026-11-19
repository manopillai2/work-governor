"use client";

// "Data collection" for one application: pull testing data straight from
// the application instead of uploading exports by hand.
//   1. Connection -- URL / client ID / secret, username / password, or
//      database details. Secrets are encrypted server-side and never
//      shown again.
//   2. Collector script -- written by the AI following the
//      collect-app-data skill (or imported from an existing
//      collect_users.py), updated by your instructions; every version is
//      security-checked and must be approved before it runs.
//   3. Collect data -- runs the approved script; its output files are
//      attached to the application as testing data.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAppState } from "@/components/AppStateProvider";
import type { Application } from "@/services/commandEngine";
import {
  AUTH_PRESETS,
  PLATFORMS,
  envPrefix,
  matchByTail,
  scriptEnvVars,
  type AppConnection,
  type CollectorRun,
  type CollectorScript,
  type ConnectionVariable,
} from "@/services/collectors";
import { diffLines, hunks } from "@/services/lineDiff";
import { isTopmostDialog } from "./controlViews";
import { I, Icon, T } from "./hubUi";

const field = "h-[32px] w-full rounded-md border bg-white px-2.5 text-[13px] outline-none";
const btn = "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40";
const primary = { background: T.teal, color: "#fff" };
const secondary = { background: "#fff", color: T.body, border: `1px solid ${T.border}` };

async function api<R>(url: string, init?: RequestInit): Promise<R> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "The request failed.");
  return data as R;
}
const post = <R,>(url: string, body: unknown) => api<R>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function Section({ n, title, subtitle, children, right }: { n: number; title: string; subtitle: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white" style={{ borderColor: T.border }}>
      <header className="flex flex-wrap items-start gap-3 border-b px-4 py-3" style={{ borderColor: T.divider }}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: T.tealSoft, color: T.teal }}>{n}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold" style={{ color: T.text }}>{title}</h3>
          <p className="text-[12px]" style={{ color: T.muted }}>{subtitle}</p>
        </div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ---------- 1. connection ----------

type Draft = { id?: string; label: string; environment: string; platform: string; authMethod: string; variables: ConnectionVariable[] };

const guessSecret = (name: string) => /SECRET|PASSWORD|PASSWD|TOKEN|API_?KEY|PRIVATE/.test(name);

function ConnectionForm({
  application,
  initial,
  onSaved,
  onCancel,
}: {
  application: Application;
  initial: Draft;
  onSaved: (c: AppConnection) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyPreset(key: string) {
    const preset = AUTH_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const prefix = envPrefix(application.name, d.environment);
    setD((cur) => ({
      ...cur,
      authMethod: key,
      platform: preset.platform,
      variables: preset.variables.length ? preset.variables.map((v) => ({ name: `${prefix}_${v.suffix}`, secret: v.secret, value: "" })) : cur.variables,
    }));
  }

  const setVar = (i: number, patch: Partial<ConnectionVariable>) =>
    setD((cur) => ({ ...cur, variables: cur.variables.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { connection } = await post<{ connection: AppConnection }>("/api/connections", { ...d, applicationId: application.id });
      onSaved(connection);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: T.border, background: "#fafbfc" }}>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11.5px] font-medium" style={{ color: T.muted }}>
          Name
          <input className={field} style={{ borderColor: T.border, color: T.text }} value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder="e.g. Prod REST API" />
        </label>
        <label className="text-[11.5px] font-medium" style={{ color: T.muted }}>
          Environment
          <input className={field} style={{ borderColor: T.border, color: T.text }} value={d.environment} onChange={(e) => setD({ ...d, environment: e.target.value })} placeholder="Prod / Dev / UAT" />
        </label>
        <label className="text-[11.5px] font-medium" style={{ color: T.muted }}>
          Platform
          <select className={field} style={{ borderColor: T.border, color: T.text }} value={d.platform} onChange={(e) => setD({ ...d, platform: e.target.value })}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-[11.5px] font-medium" style={{ color: T.muted }}>
        How it connects
        <select className={field} style={{ borderColor: T.border, color: T.text }} value={d.authMethod} onChange={(e) => applyPreset(e.target.value)}>
          <option value="">Choose…</option>
          {AUTH_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>

      <div>
        <p className="mb-1 text-[11.5px] font-medium" style={{ color: T.muted }}>
          Values — each is given to the script as an environment variable with this name
        </p>
        <div className="space-y-1.5">
          {d.variables.map((v, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto_auto] items-center gap-1.5">
              <input className={`${field} font-mono text-[12px]`} style={{ borderColor: T.border, color: T.text }} value={v.name} onChange={(e) => setVar(i, { name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} />
              <input
                className={field}
                style={{ borderColor: T.border, color: T.text }}
                type={v.secret ? "password" : "text"}
                autoComplete="off"
                value={v.value}
                onChange={(e) => setVar(i, { value: e.target.value })}
                placeholder={v.secret ? (v.hasValue ? "Saved — leave blank to keep" : "Secret value") : "Value"}
              />
              <label className="flex items-center gap-1 text-[11.5px]" style={{ color: T.body }} title="Secrets are encrypted and never shown again">
                <input type="checkbox" checked={v.secret} onChange={(e) => setVar(i, { secret: e.target.checked })} /> secret
              </label>
              <button type="button" onClick={() => setD({ ...d, variables: d.variables.filter((_, j) => j !== i) })} className="rounded p-1 hover:bg-[#eef1f4]" aria-label="Remove">
                <Icon d={I.close} size={13} color={T.muted} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setD({ ...d, variables: [...d.variables, { name: `${envPrefix(application.name, d.environment)}_`, secret: false, value: "" }] })}
          className="mt-1.5 text-[12px] font-medium"
          style={{ color: T.teal }}
        >
          + Add value
        </button>
      </div>

      <p className="flex items-start gap-1.5 text-[11.5px]" style={{ color: T.muted }}>
        <Icon d={I.lock} size={12} color={T.muted} />
        Secrets are encrypted on save, never shown again, never sent to the AI, and only handed to the collector script while it runs.
      </p>
      {error ? <p className="text-[12.5px]" style={{ color: T.red }}>{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving || !d.label.trim()} className={btn} style={primary}>{saving ? "Saving…" : "Save connection"}</button>
        <button type="button" onClick={onCancel} className={btn} style={secondary}>Cancel</button>
      </div>
    </div>
  );
}

// ---------- 2. script review ----------

function ScriptReview({ script, approved, onDecide, busy }: { script: CollectorScript; approved: CollectorScript | undefined; onDecide: (a: "approve" | "reject") => void; busy: boolean }) {
  const [view, setView] = useState<"changes" | "full" | "notes">(approved && approved.id !== script.id ? "changes" : "full");
  const diff = useMemo(() => (approved && approved.id !== script.id ? diffLines(approved.code, script.code) : null), [approved, script]);
  const r = script.securityReport;
  const isDraft = script.status === "draft";

  if (script.status === "needs_input") {
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: "#f3d9bf", background: T.orangeSoft }}>
        <p className="text-[12.5px] font-semibold" style={{ color: "#7a4a1a" }}>The assistant needs a few details before it can write the script:</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12.5px]" style={{ color: T.text }}>
          {script.questions.map((q) => <li key={q}>{q}</li>)}
        </ol>
        <p className="mt-2 text-[12px]" style={{ color: T.muted }}>Answer in the instruction box below and send again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold" style={{ color: T.text }}>Version {script.version}</span>
        <span className="rounded-full px-2 py-[1px] text-[10.5px] font-semibold" style={{ background: script.status === "approved" ? T.greenSoft : script.status === "rejected" ? T.redSoft : T.orangeSoft, color: script.status === "approved" ? T.green : script.status === "rejected" ? T.red : T.orange }}>
          {script.status === "draft" ? "Waiting for your review" : script.status}
        </span>
        <span className="text-[11.5px]" style={{ color: T.muted }}>
          {script.source === "imported" ? "imported" : "written by the assistant"} · {new Date(script.createdAt).toLocaleString()}
        </span>
      </div>
      {script.instruction ? <p className="text-[12px]" style={{ color: T.muted }}><b>Instruction:</b> {script.instruction}</p> : null}
      {script.changeSummary ? <p className="whitespace-pre-wrap rounded-md p-2.5 text-[12.5px] leading-5" style={{ background: "#f7f9fb", color: T.body }}>{script.changeSummary}</p> : null}

      <div className="rounded-md border p-2.5 text-[12px]" style={{ borderColor: r.passed ? "#bfe3d1" : "#f2c4ca", background: r.passed ? T.greenSoft : T.redSoft }}>
        <p className="font-semibold" style={{ color: r.passed ? T.green : T.red }}>{r.passed ? "Security checks passed" : "Security checks failed — can't be approved"}</p>
        {r.blockers.map((b) => <p key={b} style={{ color: T.red }}>• {b}</p>)}
        {r.warnings.map((w) => <p key={w} style={{ color: "#7a4a1a" }}>• {w}</p>)}
      </div>
      {script.requirements.length ? (
        <p className="text-[12px]" style={{ color: T.muted }}>
          <b>Python packages:</b> {script.requirements.join(", ")} {isDraft ? "— approving installs them into the app's collectors environment." : ""}
        </p>
      ) : null}

      <div className="flex gap-1 border-b text-[12px]" style={{ borderColor: T.divider }}>
        {(diff ? (["changes", "full", "notes"] as const) : (["full", "notes"] as const)).map((k) => (
          <button key={k} type="button" onClick={() => setView(k)} className="-mb-px border-b-2 px-2.5 py-1.5 font-medium" style={{ borderColor: view === k ? T.teal : "transparent", color: view === k ? T.text : T.muted }}>
            {k === "changes" ? `Changes vs. v${approved?.version}` : k === "full" ? "Full script" : "app-notes.md"}
          </button>
        ))}
      </div>
      <pre className="max-h-[420px] overflow-auto rounded-md border p-2 font-mono text-[11.5px] leading-[1.45]" style={{ borderColor: T.border, background: "#fbfcfd", color: T.text }}>
        {view === "notes"
          ? script.appNotes || "(no app notes)"
          : view === "changes" && diff
            ? hunks(diff).map((h, i) =>
                "count" in h ? (
                  <div key={i} style={{ color: T.faint }}>… {h.count} unchanged lines …</div>
                ) : (
                  <div key={i} style={{ background: h.kind === "add" ? "#e6f5ee" : h.kind === "del" ? "#fdeef0" : undefined }}>
                    {h.kind === "add" ? "+ " : h.kind === "del" ? "- " : "  "}
                    {h.text}
                  </div>
                )
              )
            : script.code}
      </pre>

      {isDraft ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!r.passed || busy} onClick={() => onDecide("approve")} className={btn} style={primary} title={r.passed ? "Allow this version to run against the application" : "Fix the security blockers first"}>
            Approve version {script.version}
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide("reject")} className={btn} style={secondary}>Reject</button>
        </div>
      ) : null}
    </div>
  );
}

// ---------- popout ----------

export default function DataCollectionPopout({ application, onClose }: { application: Application; onClose: () => void }) {
  const { markReadinessStale } = useAppState();
  const ref = useRef<HTMLDivElement | null>(null);
  const [connections, setConnections] = useState<AppConnection[]>([]);
  const [scripts, setScripts] = useState<CollectorScript[]>([]);
  const [runs, setRuns] = useState<CollectorRun[]>([]);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [connectionId, setConnectionId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [writing, setWriting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [importFolder, setImportFolder] = useState("");
  const [controlName, setControlName] = useState("");
  const [liveRun, setLiveRun] = useState<CollectorRun | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearParts, setClearParts] = useState({ connections: true, scripts: true, runs: true, files: true });
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        api<{ connections: AppConnection[] }>(`/api/connections?applicationId=${encodeURIComponent(application.id)}`),
        api<{ scripts: CollectorScript[]; runs: CollectorRun[]; importCandidates: string[]; running: string | null }>(
          `/api/collectors?applicationId=${encodeURIComponent(application.id)}&applicationName=${encodeURIComponent(application.name)}`
        ),
      ]);
      setConnections(c.connections);
      setConnectionId((cur) => cur || c.connections[0]?.id || "");
      setScripts(s.scripts);
      setRuns(s.runs);
      setCandidates(s.importCandidates);
      setImportFolder((cur) => cur || s.importCandidates[0] || "");
      if (s.running) setLiveRun((cur) => cur ?? ({ id: s.running, status: "running" } as CollectorRun));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Loading failed.");
    }
    setLoading(false);
  }, [application.id, application.name]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Poll a running collection.
  const running = liveRun?.status === "running";
  useEffect(() => {
    if (!liveRun || liveRun.status !== "running") return;
    const timer = window.setInterval(async () => {
      try {
        const { run } = await api<{ run: CollectorRun }>(`/api/collectors/run?runId=${encodeURIComponent(liveRun.id)}`);
        setLiveRun(run);
        if (run.status !== "running") {
          if (run.outputFiles.length) markReadinessStale(application.id, run.controlName || undefined);
          void load();
        }
      } catch {}
    }, 2000);
    return () => window.clearInterval(timer);
  }, [liveRun, application.id, load, markReadinessStale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || writing) return;
      if (!isTopmostDialog(ref.current)) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, writing]);

  const approved = scripts.find((s) => s.status === "approved");
  const latest = scripts[0];
  const shown = scripts.find((s) => s.id === selectedScriptId) ?? latest;
  const connection = connections.find((c) => c.id === connectionId);
  const missingValues = connection ? connection.variables.filter((v) => (v.secret ? !v.hasValue : !v.value)).map((v) => v.name) : [];

  // The variables the current script reads vs. what the connection has.
  const scriptForVars = approved ?? latest;
  const scriptVars = useMemo(() => (scriptForVars?.code ? scriptEnvVars(scriptForVars.code) : []), [scriptForVars]);
  const connNames = new Set(connection?.variables.map((v) => v.name) ?? []);
  const notInConnection = scriptVars.filter((v) => !v.optional && !connNames.has(v.name));

  // Rename connection values to the script's names where the endings
  // match (keeping saved secrets), add the rest empty.
  function matchConnectionToScript() {
    if (!connection) return;
    const available = connection.variables.map((v) => v.name).filter((n) => !scriptVars.some((sv) => sv.name === n));
    const used = new Set<string>();
    const vars: ConnectionVariable[] = connection.variables
      .filter((v) => scriptVars.some((sv) => sv.name === v.name))
      .map((v) => ({ ...v, previousName: v.name }));
    for (const sv of scriptVars.filter((x) => !x.optional && !connNames.has(x.name))) {
      const from = matchByTail(sv.name, available.filter((n) => !used.has(n)));
      const old = from ? connection.variables.find((v) => v.name === from) : undefined;
      if (old) {
        used.add(old.name);
        vars.push({ ...old, name: sv.name, previousName: old.name });
      } else {
        vars.push({ name: sv.name, secret: guessSecret(sv.name), value: "" });
      }
    }
    // Keep any other values the user added that the script doesn't read.
    for (const v of connection.variables) if (!used.has(v.name) && !vars.some((x) => x.name === v.name)) vars.push({ ...v, previousName: v.name });
    setEditing({ id: connection.id, label: connection.label, environment: connection.environment, platform: connection.platform, authMethod: connection.authMethod, variables: vars });
  }

  // What the readiness profiles say is still missing -- offered as
  // instructions for the script.
  const dataGaps = useMemo(
    () =>
      [
        ...new Set(
          application.controls.flatMap((c) =>
            c.readinessProfile ? c.readinessProfile.nextDataRequests.map((q) => `${q.request}${q.accessNeeded ? ` (access: ${q.accessNeeded})` : ""}`) : []
          )
        ),
      ].slice(0, 12),
    [application.controls]
  );

  async function writeScript() {
    setWriting(true);
    setError("");
    try {
      await post("/api/collectors", { action: "generate", applicationId: application.id, applicationName: application.name, connectionId, instruction, dataGaps });
      setInstruction("");
      setSelectedScriptId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Writing the script failed.");
    }
    setWriting(false);
  }

  async function importScript() {
    setWriting(true);
    setError("");
    try {
      const res = await post<{ envNames: string[] }>("/api/collectors", { action: "import", applicationId: application.id, folder: importFolder, connectionId });
      // No connection yet: start one with the variables the script reads.
      if (!connections.length && res.envNames.length) {
        setEditing({
          label: importFolder,
          environment: /prod/i.test(importFolder) ? "Prod" : "",
          platform: "REST",
          authMethod: "custom",
          variables: res.envNames.filter((n) => n !== "REQUESTS_CA_BUNDLE").map((name) => ({ name, secret: guessSecret(name), value: "" })),
        });
      }
      setSelectedScriptId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
    setWriting(false);
  }

  async function decide(id: string, action: "approve" | "reject") {
    setDeciding(true);
    setError("");
    try {
      await post("/api/collectors", { action, applicationId: application.id, scriptId: id });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    }
    setDeciding(false);
  }

  async function collect() {
    if (!approved) return;
    setError("");
    try {
      const { runId } = await post<{ runId: string }>("/api/collectors/run", { applicationId: application.id, scriptId: approved.id, connectionId, controlName });
      setLiveRun({ id: runId, status: "running", log: "", outputFiles: [], blockers: [] } as unknown as CollectorRun);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the collection.");
    }
  }

  // Everything Data collection holds for this application (see DELETE
  // /api/collectors). Hand-uploaded files are kept.
  const collectedFiles = runs.reduce((n, r) => n + r.evidenceIds.length, 0);
  async function clearAll() {
    setClearing(true);
    setError("");
    try {
      const parts = (Object.keys(clearParts) as Array<keyof typeof clearParts>).filter((k) => clearParts[k]).join(",");
      const { cleared } = await api<{ cleared: { connections: number; scripts: number; runs: number; files: number } }>(
        `/api/collectors?applicationId=${encodeURIComponent(application.id)}&parts=${parts}`,
        { method: "DELETE" }
      );
      if (cleared.files) markReadinessStale(application.id);
      setConfirmClear(false);
      if (clearParts.connections) {
        setEditing(null);
        setConnectionId("");
      }
      if (clearParts.runs) setLiveRun(null);
      if (clearParts.scripts) {
        setSelectedScriptId(null);
        setInstruction("");
      }
      setNotice(
        `Cleared: ${[
          clearParts.connections && `${cleared.connections} connection(s)`,
          clearParts.scripts && `${cleared.scripts} script version(s)`,
          clearParts.runs && `${cleared.runs} run(s)`,
          clearParts.files && `${cleared.files} collected file(s)`,
        ]
          .filter(Boolean)
          .join(", ")}.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clearing failed.");
    }
    setClearing(false);
  }

  async function removeConnection(id: string) {
    if (!window.confirm("Delete this connection and its saved secrets?")) return;
    await api(`/api/connections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setConnectionId("");
    await load();
  }

  return createPortal(
    <div className="fixed inset-0 z-[47] flex items-start justify-center overflow-y-auto bg-[rgba(15,30,45,0.45)] p-3 sm:p-6" onClick={() => !writing && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dc-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl rounded-2xl p-4 shadow-2xl sm:p-5" style={{ background: T.canvas }}>
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="dc-title" className="text-[18px] font-semibold" style={{ color: T.text }}>Data collection · {application.name}</h2>
            <p className="text-[12.5px]" style={{ color: T.muted }}>
              Pull the real data straight from the application with your service account. Output files become this application&apos;s testing data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setConfirmClear(true);
            }}
            disabled={writing || running || clearing || loading}
            className="rounded-md border bg-white px-2.5 py-1 text-[12.5px] font-medium disabled:opacity-50"
            style={{ borderColor: T.red, color: T.red }}
            title="Delete this application's connections, scripts, runs and collected data"
          >
            Clear data collection…
          </button>
          <button type="button" onClick={onClose} disabled={writing} className="flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 text-[12.5px] font-medium disabled:opacity-50" style={{ borderColor: T.border, color: T.body }}>
            Close <Icon d={I.close} size={13} />
          </button>
        </div>

        {confirmClear ? (
          <div className="mb-3 rounded-xl border-2 bg-white p-4" style={{ borderColor: T.red }} role="alertdialog" aria-labelledby="dc-clear-title">
            <p id="dc-clear-title" className="text-[14px] font-semibold" style={{ color: T.red }}>Clear data collection for {application.name}</p>
            <p className="mt-0.5 text-[12px]" style={{ color: T.muted }}>Choose what to delete:</p>
            <div className="mt-2 space-y-1.5 text-[12.5px]" style={{ color: T.body }}>
              {(
                [
                  ["connections", `Connections (${connections.length}) — including their saved secrets`],
                  ["scripts", `Collector scripts (${scripts.length} version${scripts.length === 1 ? "" : "s"}) — approved, drafts and rejected`],
                  ["runs", `Run history (${runs.length}) — logs, blocker files and run folders`],
                  ["files", `Collected data (${collectedFiles} file${collectedFiles === 1 ? "" : "s"}) — the testing data those runs attached`],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={clearParts[key]} onChange={(e) => setClearParts((cur) => ({ ...cur, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[12px]" style={{ color: T.muted }}>
              Files you uploaded by hand are always kept.{clearParts.files ? " Readiness profiles stay, flagged for a rebuild." : ""} This can&apos;t be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={clearAll}
                disabled={clearing || !Object.values(clearParts).some(Boolean)}
                className={btn}
                style={{ background: T.red, color: "#fff" }}
              >
                {clearing ? "Clearing…" : Object.values(clearParts).every(Boolean) ? "Delete everything" : "Delete selected"}
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} disabled={clearing} className={btn} style={secondary}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {notice ? <p className="mb-3 rounded-md px-3 py-2 text-[12.5px]" style={{ background: T.greenSoft, color: T.green }}>{notice}</p> : null}

        {error ? <p className="mb-3 rounded-md px-3 py-2 text-[12.5px]" style={{ background: T.redSoft, color: T.red }}>{error}</p> : null}
        {loading ? <p className="text-[13px]" style={{ color: T.muted }}>Loading…</p> : (
          <div className="space-y-4">
            {/* 1. Connection */}
            <Section
              n={1}
              title="Connection"
              subtitle="How the collector reaches the application: API URL and client ID / secret, username / password, or database details."
              right={!editing ? (
                <button type="button" className={btn} style={secondary} onClick={() => setEditing({ label: "", environment: "Prod", platform: "REST", authMethod: "", variables: [] })}>
                  + Add connection
                </button>
              ) : null}
            >
              {editing ? (
                <ConnectionForm
                  application={application}
                  initial={editing}
                  onCancel={() => setEditing(null)}
                  onSaved={(c) => {
                    setEditing(null);
                    setConnectionId(c.id);
                    void load();
                  }}
                />
              ) : connections.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: T.faint }}>No connection yet.</p>
              ) : (
                <div className="space-y-2">
                  {connection && scriptVars.length ? (
                    <div className="rounded-lg border p-2.5 text-[12px]" style={{ borderColor: notInConnection.length ? "#f3d9bf" : T.border, background: notInConnection.length ? T.orangeSoft : "#fafbfc" }}>
                      <p className="font-semibold" style={{ color: notInConnection.length ? "#7a4a1a" : T.text }}>
                        {notInConnection.length
                          ? `The script (v${scriptForVars?.version}) reads ${notInConnection.length} value${notInConnection.length === 1 ? "" : "s"} this connection doesn't have`
                          : `This connection provides every value the script (v${scriptForVars?.version}) reads`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {scriptVars.map((v) => (
                          <span key={v.name} className="rounded px-1.5 py-[1px] font-mono text-[10.5px]" style={{ background: connNames.has(v.name) ? T.greenSoft : v.optional ? "#eef1f4" : "#fff", color: connNames.has(v.name) ? T.green : v.optional ? T.muted : T.orange, border: connNames.has(v.name) || v.optional ? "none" : `1px solid ${T.orange}` }} title={v.optional ? "Optional — the script has a default" : connNames.has(v.name) ? "In this connection" : "Not in this connection"}>
                            {v.name}{v.optional ? " (optional)" : connNames.has(v.name) ? " ✓" : ""}
                          </span>
                        ))}
                      </div>
                      {notInConnection.length ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button type="button" className={btn} style={primary} onClick={matchConnectionToScript}>Match this connection to the script</button>
                          <span style={{ color: T.muted }}>Renames matching values (saved secrets are kept) and adds the rest for you to fill in. Leave a value empty if your sign-in method doesn&apos;t use it.</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {connections.map((c) => {
                    const unset = c.variables.filter((v) => (v.secret ? !v.hasValue : !v.value));
                    return (
                      <label key={c.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5" style={{ borderColor: connectionId === c.id ? T.teal : T.border, background: connectionId === c.id ? "#f4fafb" : "#fff" }}>
                        <input type="radio" name="conn" checked={connectionId === c.id} onChange={() => setConnectionId(c.id)} className="mt-1" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold" style={{ color: T.text }}>
                            {c.label} <span className="font-normal" style={{ color: T.muted }}>· {c.environment || "—"} · {c.platform} · {AUTH_PRESETS.find((p) => p.key === c.authMethod)?.label.split(" (")[0] ?? c.authMethod}</span>
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {c.variables.map((v) => {
                              const set = v.secret ? v.hasValue : Boolean(v.value);
                              return (
                                <span key={v.name} className="rounded px-1.5 py-[1px] font-mono text-[10.5px]" style={{ background: set ? "#eef1f4" : T.orangeSoft, color: set ? T.body : T.orange }} title={set ? (v.secret ? "Secret saved" : v.value) : "No value yet"}>
                                  {v.name} {set ? "✓" : "— missing"}
                                </span>
                              );
                            })}
                          </span>
                          {unset.length ? <span className="mt-1 block text-[11.5px]" style={{ color: T.orange }}>Some values are empty — fine if the script doesn&apos;t need them for your sign-in method.</span> : null}
                        </span>
                        <span className="flex shrink-0 gap-2 text-[12px]">
                          <button type="button" style={{ color: T.teal }} onClick={() => setEditing({ id: c.id, label: c.label, environment: c.environment, platform: c.platform, authMethod: c.authMethod, variables: c.variables.map((v) => ({ ...v, previousName: v.name })) })}>Edit</button>
                          <button type="button" style={{ color: T.red }} onClick={() => removeConnection(c.id)}>Delete</button>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* 2. Script */}
            <Section
              n={2}
              title="Collector script"
              subtitle="Written by the assistant with your collect-app-data skill. Ask for more data any time — it updates the script; you approve each version before it runs."
              right={approved ? <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: T.greenSoft, color: T.green }}>Approved: v{approved.version}</span> : null}
            >
              <div className="space-y-3">
                {candidates.length && !approved && !scripts.some((x) => x.status === "draft") ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-[12.5px]" style={{ borderColor: T.border, background: "#fafbfc" }}>
                    <span style={{ color: T.body }}>{scripts.length ? "Start again from an existing collector:" : "An existing collector was found:"}</span>
                    <select className={`${field} w-auto`} style={{ borderColor: T.border, color: T.text }} value={importFolder} onChange={(e) => setImportFolder(e.target.value)}>
                      {candidates.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    <button type="button" className={btn} style={secondary} disabled={writing} onClick={importScript}>Start from this script</button>
                  </div>
                ) : null}

                {shown ? (
                  <>
                    {scripts.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]" style={{ color: T.muted }}>
                        Versions:
                        {scripts.map((s) => (
                          <button key={s.id} type="button" onClick={() => setSelectedScriptId(s.id)} className="rounded-full border px-2 py-[1px]" style={{ borderColor: s.id === shown.id ? T.teal : T.border, color: s.status === "approved" ? T.green : s.status === "rejected" ? T.faint : T.body }}>
                            v{s.version}{s.status === "approved" ? " ✓" : s.status === "draft" ? " •" : ""}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <ScriptReview script={shown} approved={approved} busy={deciding} onDecide={(a) => decide(shown.id, a)} />
                  </>
                ) : null}

                <div className="rounded-lg border p-3" style={{ borderColor: T.border }}>
                  <p className="mb-1.5 text-[12.5px] font-semibold" style={{ color: T.text }}>{latest ? "Ask for changes or more data" : "Write the collector"}</p>
                  {dataGaps.length ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="text-[11.5px]" style={{ color: T.muted }}>From the readiness profiles:</span>
                      {dataGaps.map((g) => (
                        <button key={g} type="button" onClick={() => setInstruction((cur) => (cur ? `${cur}\n- ${g}` : `- ${g}`))} className="max-w-[340px] truncate rounded-full border px-2 py-[1px] text-left text-[11px]" style={{ borderColor: T.border, color: T.body, background: "#fff" }} title={g}>
                          + {g}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={3}
                    disabled={writing}
                    placeholder={latest ? "e.g. Pull LoginHistory for the last 180 days without the 10,000 cap, and add My Domain sign-in settings." : "Anything specific to collect? Leave blank for the skill's full identity, access and password data set."}
                    className="w-full resize-y rounded-md border px-2.5 py-2 text-[13px] leading-5 outline-none"
                    style={{ borderColor: T.border, color: T.text }}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className={btn} style={primary} disabled={writing || !connection} onClick={writeScript} title={connection ? "" : "Add and select a connection first"}>
                      {writing ? "Writing the script…" : latest ? "Update the script" : "Write the script"}
                    </button>
                    {writing ? <span className="text-[12px]" style={{ color: T.muted }}>This can take a few minutes — the assistant follows the full skill, including its security checklist.</span> : null}
                  </div>
                </div>
              </div>
            </Section>

            {/* 3. Collect */}
            <Section n={3} title="Collect data" subtitle="Runs the approved script with the selected connection. Output files are attached to this application as testing data.">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[11.5px] font-medium" style={{ color: T.muted }}>
                    Attach the data to
                    <select className={`${field} w-auto min-w-[260px]`} style={{ borderColor: T.border, color: T.text }} value={controlName} onChange={(e) => setControlName(e.target.value)}>
                      <option value="">All controls on this application</option>
                      {application.controls.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>
                  <button type="button" className={btn} style={primary} disabled={!approved || !connection || running} onClick={collect}>
                    {running ? "Collecting…" : "Collect data"}
                  </button>
                  {!approved ? (
                    <span className="text-[12px]" style={{ color: T.muted }}>Approve a script version first.</span>
                  ) : notInConnection.length ? (
                    <span className="text-[12px]" style={{ color: T.orange }}>The connection doesn&apos;t match the script yet (see step 1).</span>
                  ) : missingValues.length ? (
                    <span className="text-[12px]" style={{ color: T.muted }}>Empty: {missingValues.join(", ")}</span>
                  ) : null}
                </div>

                {liveRun ? (
                  <div className="rounded-lg border" style={{ borderColor: T.border }}>
                    <div className="flex items-center gap-2 border-b px-3 py-2 text-[12.5px]" style={{ borderColor: T.divider }}>
                      <b style={{ color: T.text }}>{running ? "Collecting…" : liveRun.status === "succeeded" ? "Collection finished" : liveRun.status === "blocked" ? "Finished with blockers" : "Collection failed"}</b>
                      {!running ? <span style={{ color: T.muted }}>{liveRun.outputFiles.length} file(s) attached as testing data{liveRun.blockers.length ? ` · ${liveRun.blockers.length} blocker file(s)` : ""}</span> : null}
                    </div>
                    <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap p-2.5 font-mono text-[11px] leading-[1.45]" style={{ color: T.body, background: "#fbfcfd" }}>
                      {(liveRun.log || "Starting…").split("\n").slice(-80).join("\n")}
                    </pre>
                    {!running && liveRun.outputFiles.length ? (
                      <p className="border-t px-3 py-2 text-[12px]" style={{ borderColor: T.divider, color: T.body }}>
                        Next: open <b>Work progress</b> and <b>Rebuild with latest data</b> on the affected controls to update their readiness profiles.
                      </p>
                    ) : null}
                    {liveRun.blockers?.map((b) => (
                      <details key={b.name} className="border-t px-3 py-2 text-[12px]" style={{ borderColor: T.divider }}>
                        <summary className="cursor-pointer font-medium" style={{ color: T.orange }}>{b.name}</summary>
                        <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[11px]" style={{ color: T.body }}>{b.text}</pre>
                      </details>
                    ))}
                  </div>
                ) : null}

                {runs.length ? (
                  <div>
                    <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.05em]" style={{ color: T.faint }}>Recent runs</p>
                    <div className="divide-y rounded-lg border text-[12px]" style={{ borderColor: T.border }}>
                      {runs.slice(0, 8).map((r) => (
                        <button key={r.id} type="button" onClick={() => setLiveRun(r)} className="flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-[#f7f9fb]">
                          <span className="w-[150px] shrink-0" style={{ color: T.muted }}>{new Date(r.startedAt).toLocaleString()}</span>
                          <span className="w-[54px] shrink-0" style={{ color: T.body }}>v{r.scriptVersion ?? "?"}</span>
                          <span className="w-[90px] shrink-0 font-medium" style={{ color: r.status === "succeeded" ? T.green : r.status === "running" ? T.orange : T.red }}>{r.status}</span>
                          <span className="min-w-0 flex-1 truncate" style={{ color: T.body }}>{r.outputFiles.length} file(s){r.blockers.length ? ` · ${r.blockers.length} blocker(s)` : ""}{r.controlName ? ` · ${r.controlName}` : ""}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
