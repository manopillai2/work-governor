import type { Application, ComplianceControl } from "./commandEngine";
import { CLIENT_REFERENCE_TABLE } from "./clientReference";
import { controlTypeKey, needsAttention, taskStats } from "./controlMetrics";
import { controlUploadState } from "./uploads";

// One source of truth for the executive numbers, shared by the New UI
// dashboard and the executive summary PDF so they always agree:
// portfolio KPIs, status buckets, evidence / testing data coverage,
// coverage per control type (the controls matrix's columns), the
// attention list, recent activity and the computed narrative.

export type StatusBucket = "done" | "progress" | "notStarted" | "hold";

export function bucketOf(c: ComplianceControl): StatusBucket {
  switch (c.controlStatus) {
    case "Completed":
      return "done";
    case "In Progress":
    case "Ready for Review":
      return "progress";
    case "On Hold":
      return "hold";
    default:
      return "notStarted";
  }
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export type ControlTypeCoverage = {
  key: string;
  title: string;
  isCode: boolean;
  apps: number;
  completed: number;
  withEvidence: number;
  withTesting: number;
  both: number;
  attention: number;
  tasks: { total: number; done: number };
};

export type ActivityItem = {
  when: string;
  application: Application;
  control: ComplianceControl;
  kind: string;
  text: string;
};

// A narrative line as text segments; `bold` marks the figures.
export type NarrativeLine = { tone: "progress" | "risk" | "flow" | "coverage"; parts: { text: string; bold?: boolean }[] };

export function computeExecutiveMetrics(applications: Application[]) {
  const pairs = applications.flatMap((application) => application.controls.map((control) => ({ application, control })));
  const controls = pairs.map((p) => p.control);
  const tasks = taskStats(controls);

  const buckets: Record<StatusBucket, number> = { done: 0, progress: 0, notStarted: 0, hold: 0 };
  for (const c of controls) buckets[bucketOf(c)]++;

  const uploads = controls.map(controlUploadState);
  const withEvidence = uploads.filter((u) => u.evidence.uploaded).length;
  const withTesting = uploads.filter((u) => u.testing.uploaded).length;
  const fullyUploaded = uploads.filter((u) => u.evidence.uploaded && u.testing.uploaded).length;
  const nothingUploaded = uploads.filter((u) => !u.evidence.uploaded && !u.testing.uploaded).length;
  const uploadFiles = new Set(uploads.flatMap((u) => [...u.evidence.files, ...u.testing.files])).size;

  const attention = pairs.filter((p) => needsAttention(p.control));
  const contextComplete = applications.filter((a) => a.contextStatus === "Complete").length;
  const frameworks = [...new Set(controls.map((c) => c.framework))];

  // Coverage per control type, in the fixed client reference order
  // (IS02 ... OP23), then any other types alphabetically.
  const byKey = new Map<string, ComplianceControl[]>();
  for (const c of controls) {
    const k = controlTypeKey(c);
    byKey.set(k, [...(byKey.get(k) ?? []), c]);
  }
  const refOrder = CLIENT_REFERENCE_TABLE.map((e) => e.code);
  const rank = (k: string) => (refOrder.includes(k) ? refOrder.indexOf(k) : refOrder.length);
  const byType: ControlTypeCoverage[] = [...byKey.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, list]) => {
      const ref = CLIENT_REFERENCE_TABLE.find((e) => e.code === key);
      const u = list.map(controlUploadState);
      const t = taskStats(list);
      return {
        key,
        title: ref ? list[0].name || ref.title : key,
        isCode: !!ref,
        apps: list.length,
        completed: list.filter((c) => c.controlStatus === "Completed").length,
        withEvidence: u.filter((x) => x.evidence.uploaded).length,
        withTesting: u.filter((x) => x.testing.uploaded).length,
        both: u.filter((x) => x.evidence.uploaded && x.testing.uploaded).length,
        attention: list.filter(needsAttention).length,
        tasks: { total: t.total, done: t.done },
      };
    });

  // Activity: every timestamped note and checklist change, newest first.
  const activity: ActivityItem[] = [];
  for (const { application, control } of pairs) {
    for (const n of [...control.notes, ...control.nextTasks.flatMap((t) => t.notes)]) {
      activity.push({ when: n.createdAt, application, control, kind: n.sourceKind === "manual" ? "Note" : n.sourceKind === "evidence" ? "Evidence" : "Testing data", text: n.text });
    }
    for (const e of control.checklistChangeLog) {
      const verb = e.changeType === "ADDED" ? "Task added" : e.changeType === "MARKED_IRRELEVANT" ? "Task marked N/A" : "Task restored";
      activity.push({ when: e.timestamp, application, control, kind: verb, text: e.taskText });
    }
  }
  const recentActivity = activity
    .filter((a) => !Number.isNaN(new Date(a.when).getTime()))
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  return {
    applications: applications.length,
    controls: controls.length,
    pairs,
    tasks,
    taskPct: pct(tasks.done, tasks.total),
    buckets,
    completedPct: pct(buckets.done, controls.length),
    withEvidence,
    withTesting,
    fullyUploaded,
    nothingUploaded,
    uploadFiles,
    attention,
    contextComplete,
    frameworks,
    byType,
    recentActivity,
  };
}

export type ExecutiveMetrics = ReturnType<typeof computeExecutiveMetrics>;

const typeLabel = (t: ControlTypeCoverage) => (t.isCode ? `${t.key} ${t.title}` : t.title);

// The executive narrative, computed -- shown on the dashboard and at the
// top of the executive PDF.
export function executiveNarrative(m: ExecutiveMetrics): NarrativeLine[] {
  const top = m.byType
    .filter((t) => t.tasks.total > 0 && t.tasks.done > 0)
    .sort((a, b) => pct(b.tasks.done, b.tasks.total) - pct(a.tasks.done, a.tasks.total))
    .slice(0, 2);
  const gaps = m.byType
    .filter((t) => t.apps > 0 && t.withTesting < t.apps)
    .sort((a, b) => a.withTesting / a.apps - b.withTesting / b.apps)
    .slice(0, 2);
  const b = (text: string | number) => ({ text: String(text), bold: true });
  const t = (text: string) => ({ text });

  return [
    {
      tone: "progress",
      parts: [
        b(`${m.taskPct}%`),
        t(` of checklist tasks complete (${m.tasks.done}/${m.tasks.total}); `),
        b(m.buckets.done),
        t(` of ${m.controls} controls completed.`),
        t(top.length ? ` Progress is concentrated in ${top.map((x) => `${typeLabel(x)} (${pct(x.tasks.done, x.tasks.total)}%)`).join(", ")}.` : " No control has completed tasks yet."),
      ],
    },
    {
      tone: "risk",
      parts: m.attention.length
        ? [t("Top risks: "), b(plural(m.attention.length, "control")), t(" need attention (on hold or checklist needs revision).")]
        : [t("No controls are on hold or waiting on a checklist revision.")],
    },
    {
      tone: "flow",
      parts: [
        b(m.buckets.progress),
        t(" controls in progress, "),
        b(m.buckets.notStarted),
        t(" not started; "),
        b(m.fullyUploaded),
        t(` of ${m.controls} have both evidence and testing data uploaded.`),
        t(gaps.length ? ` Biggest testing data gaps: ${gaps.map((x) => `${typeLabel(x)} (${x.withTesting}/${x.apps})`).join(", ")}.` : ""),
      ],
    },
    {
      tone: "coverage",
      parts: [
        t("Coverage: "),
        b(m.contextComplete),
        t(` of ${plural(m.applications, "application")} have complete context; `),
        b(m.withEvidence),
        t(" controls have evidence, "),
        b(m.withTesting),
        t(" have testing data, "),
        b(m.nothingUploaded),
        t(` have nothing uploaded yet (${plural(m.uploadFiles, "source file")} on file).`),
      ],
    },
  ];
}
