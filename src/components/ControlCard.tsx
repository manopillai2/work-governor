"use client";

import { useMemo, useState } from "react";

import CollapsibleSection from "@/components/CollapsibleSection";
import type {
  ChecklistChangeLogEntry,
  ChecklistStatus,
  ChecklistTask,
  ControlStatus,
  Framework,
  HomeworkStatus,
  QaScoreLevel,
  TaskCategory,
  WorkflowStage,
} from "@/services/commandEngine";

type ControlCardProps = {
  controlName: string;
  framework: Framework;

  homeworkStatus: HomeworkStatus;
  stage: WorkflowStage;

  controlStatus: ControlStatus;
  checklistStatus: ChecklistStatus;

  controlObjective: string;
  controlRisk: string;
  applicabilityRationale: string;
  evidenceStrategy: string;

  qaScore?: QaScoreLevel;
  qaScoreRationale?: string;
  checklistChangeLog?: ChecklistChangeLogEntry[];

  notes?: string[];
  nextTasks?: ChecklistTask[];

  onToggleTask: (
    taskId: string
  ) => void;

  onAddTaskNote?: (
    taskText: string,
    note: string
  ) => void;

  onApproveChecklist: () => void;
  onRequestChecklistRevision: () => void;
  onCompleteControl: () => void;
};

const CATEGORY_ORDER: TaskCategory[] = [
  "Homework",
  "Discovery",
  "Access",
  "Evidence Collection",
  "Validation",
  "Approval",
  "Argos Design",
  "Next Steps",
];

export default function ControlCard({
  controlName,
  framework,

  homeworkStatus,
  stage,

  controlStatus,
  checklistStatus,

  controlObjective,
  controlRisk,
  applicabilityRationale,
  evidenceStrategy,

  qaScore = "Not Started",
  qaScoreRationale = "",
  checklistChangeLog = [],

  notes = [],
  nextTasks = [],

  onToggleTask,
  onAddTaskNote,
  onApproveChecklist,
  onRequestChecklistRevision,
  onCompleteControl,
}: ControlCardProps) {
  const [expanded, setExpanded] =
    useState(false);

  const completedTasks = nextTasks.filter(
    (task) => task.completed
  ).length;

  const totalTasks = nextTasks.length;

  const groupedTasks = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      tasks: nextTasks.filter(
        (task) => task.category === category
      ),
    })).filter(
      (group) => group.tasks.length > 0
    );
  }, [nextTasks]);

  const currentFocus = useMemo(() => {
    const firstIncompleteTask = nextTasks.find(
      (task) => !task.completed
    );

    if (firstIncompleteTask) {
      return firstIncompleteTask.category;
    }

    if (nextTasks.length > 0) {
      return "Review";
    }

    return "Not Started";
  }, [nextTasks]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() =>
          setExpanded((current) => !current)
        }
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900">
            {controlName}
          </h4>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              {framework}
            </span>

            <ControlStatusBadge
              status={controlStatus}
            />

            <ChecklistStatusBadge
              status={checklistStatus}
            />

            <QaScoreBadge score={qaScore} />
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {completedTasks} of {totalTasks} tasks
            completed · Current focus:{" "}
            {currentFocus}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Stage: {stage}
          </span>

          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-lg text-slate-500">
            {expanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-200 p-4">
          <CollapsibleSection
            title="QA Assessment"
            description="Why the QA badge above is what it is right now."
            tint="accent"
          >
            <p className="text-sm leading-6 text-indigo-800">
              {qaScoreRationale ||
                "No work notes captured yet. Add a note against a checklist item below to get started."}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Control Details">
            <div className="grid gap-3 xl:grid-cols-2">
              <ControlContextBox
                title="Control Objective"
                content={controlObjective}
              />

              <ControlContextBox
                title="Risk Addressed"
                content={controlRisk}
              />

              <ControlContextBox
                title="Why This Control Applies"
                content={applicabilityRationale}
              />

              <ControlContextBox
                title="Evidence Strategy"
                content={evidenceStrategy}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Checklist Review"
            description="Confirm that the checklist reflects the application context, control risk, authoritative evidence, identity population, and Argos objective."
          >
            <div className="flex flex-wrap gap-2">
              {checklistStatus !==
                "Approved" &&
                checklistStatus !==
                  "Completed" && (
                  <button
                    type="button"
                    onClick={onApproveChecklist}
                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500"
                  >
                    Approve Checklist
                  </button>
                )}

              {checklistStatus !==
                "Completed" && (
                <button
                  type="button"
                  onClick={
                    onRequestChecklistRevision
                  }
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Needs Revision
                </button>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Contextual Checklist"
            description={`${completedTasks} of ${totalTasks} tasks completed · Current focus: ${currentFocus}`}
          >
            {groupedTasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No checklist tasks have been created.
              </p>
            ) : (
              <div className="space-y-5">
                {groupedTasks.map((group) => (
                  <div key={group.category}>
                    <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.category}
                    </h6>

                    <div className="space-y-2">
                      {group.tasks.map((task) => (
                        <ChecklistTaskRow
                          key={task.id}
                          task={task}
                          onToggleTask={onToggleTask}
                          onAddTaskNote={onAddTaskNote}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Checklist Change Log"
            description="Every item Claude adds or removes based on your notes is recorded here permanently, with the reason why."
            badge={
              checklistChangeLog.length > 0 ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {checklistChangeLog.length}
                </span>
              ) : undefined
            }
          >
            {checklistChangeLog.length === 0 ? (
              <p className="text-sm text-slate-500">
                No checklist changes have been logged yet.
              </p>
            ) : (
              <div className="space-y-2">
                {[...checklistChangeLog]
                  .reverse()
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            entry.changeType ===
                            "ADDED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {entry.changeType}
                        </span>

                        <span className="font-medium text-slate-800">
                          {entry.taskText}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {entry.reason}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(
                          entry.timestamp
                        ).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="General Control Notes">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">
                No general notes have been recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((note, index) => (
                  <div
                    key={`${note}-${index}`}
                    className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                  >
                    {note}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Final Control Review"
            description="Complete the control only after reviewing the evidence, open exceptions, and proposed Argos rule."
          >
            <button
              type="button"
              onClick={onCompleteControl}
              disabled={
                controlStatus !==
                  "Ready for Review" &&
                controlStatus !== "Completed"
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {controlStatus === "Completed"
                ? "Control Completed"
                : "Mark Control Completed"}
            </button>
          </CollapsibleSection>

          <CollapsibleSection
            title="Homework Status"
            tint="warning"
          >
            <p className="text-sm text-amber-800">
              Homework {homeworkStatus}
            </p>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

function ControlContextBox({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h5 className="font-medium text-slate-900">
        {title}
      </h5>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {content ||
          "Not yet defined. Regenerate the contextual checklist after completing the application context."}
      </p>
    </div>
  );
}

function ControlStatusBadge({
  status,
}: {
  status: ControlStatus;
}) {
  const classes: Record<
    ControlStatus,
    string
  > = {
    New: "bg-slate-100 text-slate-700",
    "Checklist Review Pending":
      "bg-amber-100 text-amber-800",
    "In Progress":
      "bg-blue-100 text-blue-700",
    "Ready for Review":
      "bg-purple-100 text-purple-700",
    Completed:
      "bg-green-100 text-green-700",
    "On Hold": "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[status]}`}
    >
      Control: {status}
    </span>
  );
}

function ChecklistStatusBadge({
  status,
}: {
  status: ChecklistStatus;
}) {
  const classes: Record<
    ChecklistStatus,
    string
  > = {
    "Review Pending":
      "bg-amber-100 text-amber-800",
    Approved:
      "bg-blue-100 text-blue-700",
    "Needs Revision":
      "bg-red-100 text-red-700",
    Completed:
      "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[status]}`}
    >
      Checklist: {status}
    </span>
  );
}

function QaScoreBadge({
  score,
}: {
  score: QaScoreLevel;
}) {
  const classes: Record<
    QaScoreLevel,
    string
  > = {
    "Not Started":
      "bg-slate-100 text-slate-700",
    "Surface Level":
      "bg-amber-100 text-amber-800",
    Developing:
      "bg-blue-100 text-blue-700",
    "Well Researched":
      "bg-indigo-100 text-indigo-700",
    "Argos Ready":
      "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${classes[score]}`}
    >
      QA: {score}
    </span>
  );
}

function ChecklistTaskRow({
  task,
  onToggleTask,
  onAddTaskNote,
}: {
  task: ChecklistTask;
  onToggleTask: (taskId: string) => void;
  onAddTaskNote?: (
    taskText: string,
    note: string
  ) => void;
}) {
  const [draftNote, setDraftNote] =
    useState("");

  function handleSubmitNote() {
    const trimmedNote = draftNote.trim();

    if (!trimmedNote || !onAddTaskNote) {
      return;
    }

    onAddTaskNote(task.text, trimmedNote);
    setDraftNote("");
  }

  return (
    <div
      className={`rounded-lg border p-3 transition ${
        task.completed
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() =>
            onToggleTask(task.id)
          }
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />

        <div className="min-w-0">
          <span
            className={`text-sm leading-6 ${
              task.completed
                ? "text-slate-500 line-through"
                : "text-slate-700"
            }`}
          >
            {task.text}
          </span>

          <div className="mt-1 text-xs text-slate-400">
            {task.required
              ? "Required"
              : "Optional"}
          </div>
        </div>
      </label>

      {task.notes.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
          {task.notes.map((note, index) => (
            <p
              key={`${task.id}-note-${index}`}
              className="rounded-md bg-white px-2.5 py-1.5 text-xs leading-5 text-slate-600"
            >
              {note}
            </p>
          ))}
        </div>
      ) : null}

      {onAddTaskNote ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <textarea
            value={draftNote}
            onChange={(event) =>
              setDraftNote(event.target.value)
            }
            placeholder="Add a note against this checklist item at any time..."
            rows={2}
            className="w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />

          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={handleSubmitNote}
              disabled={!draftNote.trim()}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Note
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
