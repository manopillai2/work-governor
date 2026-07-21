"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ApplicationCard from "@/components/ApplicationCard";
import ChatPanel, {
  type ChatMessage,
} from "@/components/ChatPanel";
import ControlCard from "@/components/ControlCard";
import FilterBar from "@/components/FilterBar";
import Header from "@/components/layout/Header";
import LearningNotifications, {
  type PendingLearning,
} from "@/components/LearningNotifications";
import ProgressSummary from "@/components/ProgressSummary";

import {
  addApplicationNote,
  deriveApplicationContextStatus,
  executeCommand,
  findApplication,
  findControl,
  inferTaskCategory,
  markTaskIrrelevant,
  normalizeApplicationId,
  refreshControlState,
  restoreTaskRelevance,
  updateApplicationContextValues,
  type Application,
  type ApplicationContextInput,
  type ChecklistTask,
  type Command,
  type ComplianceControl,
} from "@/services/commandEngine";
import {
  EMPTY_APPLICATION_FILTERS,
  filterApplications,
  type ApplicationFilterState,
} from "@/services/applicationFilters";
import { generateExecutiveProgressPdf } from "@/services/exportReport";
import {
  createAndSaveBackup,
  downloadApplicationBackup,
  findBackupByVersion,
  formatBackupList,
  formatBackupSummary,
  loadBackupHistory,
  type BackupEntry,
} from "@/services/backup";

// Placeholder-only local gate for destructive chat actions. This is
// not real authentication (checked client-side, never sent to the
// API) — swap for a proper auth mechanism before this app is ever
// shared beyond a single trusted user.
const ROOT_PASSWORD = "123";

const PRIVILEGED_ACTIONS = new Set<
  Command["action"]
>([
  "DELETE_APPLICATION",
  "DELETE_ALL_APPLICATIONS",
  "ROLLBACK_BACKUP",
  "CLEAR_CHAT_HISTORY",
]);

function describePrivilegedAction(
  action: Command["action"]
): string {
  switch (action) {
    case "DELETE_APPLICATION":
      return "delete this application";
    case "DELETE_ALL_APPLICATIONS":
      return "delete all applications";
    case "ROLLBACK_BACKUP":
      return "roll back to this backup";
    case "CLEAR_CHAT_HISTORY":
      return "clear the chat history";
    default:
      return "continue";
  }
}

type AssistantApiResponse = {
  command?: Command;
  assistantMessage?: string;
  error?: string;
};

type StoredWorkGovernorData = {
  applications: Application[];
  messages: ChatMessage[];
};

function createMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    role,
    content,
  };
}

function createTaskFromStoredValue(
  value: unknown,
  index: number
): ChecklistTask | null {
  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return null;
    }

    return {
      id: `migrated-task-${Date.now()}-${index}`,
      text,
      category: inferTaskCategory(text),
      completed: false,
      required: true,
      notes: [],
    };
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "text" in value
  ) {
    const task =
      value as Partial<ChecklistTask>;

    const text = String(
      task.text ?? ""
    ).trim();

    if (!text) {
      return null;
    }

    return {
      id:
        task.id ||
        `migrated-task-${Date.now()}-${index}`,
      text,
      category:
        task.category ||
        inferTaskCategory(text),
      completed: task.completed === true,
      required: task.required !== false,
      notes: Array.isArray(task.notes)
        ? task.notes
        : [],
      learningId: task.learningId,
      irrelevant: task.irrelevant === true,
      irrelevantReason: task.irrelevantReason,
    };
  }

  return null;
}

function normalizeStoredControl(
  control: ComplianceControl
): ComplianceControl {
  const normalizedTasks = Array.isArray(
    control.nextTasks
  )
    ? control.nextTasks
        .map(createTaskFromStoredValue)
        .filter(
          (
            task
          ): task is ChecklistTask =>
            Boolean(task)
        )
    : [];

  return refreshControlState({
    ...control,

    id:
      control.id ||
      `control-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    name: control.name,

    framework:
      control.framework || "SOX",

    homeworkStatus:
      control.homeworkStatus || "Waiting",

    stage:
      control.stage || "Homework",

    controlStatus:
      control.controlStatus || "New",

    checklistStatus:
      control.checklistStatus ||
      "Review Pending",

    controlObjective:
      control.controlObjective || "",

    controlRisk:
      control.controlRisk || "",

    applicabilityRationale:
      control.applicabilityRationale || "",

    evidenceStrategy:
      control.evidenceStrategy || "",

    argosObjective:
      control.argosObjective || "",

    notes: Array.isArray(control.notes)
      ? control.notes
      : [],

    nextTasks: normalizedTasks,
  });
}

function normalizeStoredApplication(
  application: Application
): Application {
  const normalizedApplication: Application = {
    ...application,

    id:
      application.id ||
      application.name,

    name:
      application.name ||
      application.id,

    hosting:
      application.hosting || "Unknown",

    applicationPurpose:
      application.applicationPurpose || "",

    businessProcess:
      application.businessProcess || "",

    applicationOwner:
      application.applicationOwner || "",

    technicalOwner:
      application.technicalOwner || "",

    applicationContacts:
      Array.isArray(
        application.applicationContacts
      )
        ? application.applicationContacts
        : [],

    integrations:
      Array.isArray(application.integrations)
        ? application.integrations
        : [],

    identityTypes:
      Array.isArray(
        application.identityTypes
      )
        ? application.identityTypes
        : [],

    hostingDetails:
      application.hostingDetails || "",

    dataClassification:
      application.dataClassification || "",

    financialRelevance:
      application.financialRelevance || "",

    contextStatus:
      application.contextStatus || "Missing",

    notes: Array.isArray(application.notes)
      ? application.notes
      : [],

    controls: Array.isArray(
      application.controls
    )
      ? application.controls.map(
          normalizeStoredControl
        )
      : [],
  };

  return {
    ...normalizedApplication,
    contextStatus:
      deriveApplicationContextStatus(
        normalizedApplication
      ),
  };
}

function normalizeStoredApplications(
  applications: Application[]
): Application[] {
  if (!Array.isArray(applications)) {
    return [];
  }

  return applications
    .filter(
      (application) =>
        application &&
        Boolean(
          application.id ||
            application.name
        )
    )
    .map(normalizeStoredApplication);
}

export default function Home() {
  const [applications, setApplications] =
    useState<Application[]>([]);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [
    expandedApplication,
    setExpandedApplication,
  ] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [filters, setFilters] =
    useState<ApplicationFilterState>(
      EMPTY_APPLICATION_FILTERS
    );

  const [backups, setBackups] = useState<
    BackupEntry[]
  >([]);

  const [pendingLearnings, setPendingLearnings] =
    useState<PendingLearning[]>([]);

  useEffect(() => {
    async function loadPendingLearnings() {
      try {
        const response = await fetch(
          "/api/learnings/pending"
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (Array.isArray(data.learnings)) {
          setPendingLearnings(data.learnings);
        }
      } catch (error) {
        console.error(
          "Unable to load pending learnings:",
          error
        );
      }
    }

    loadPendingLearnings();

    function handleFocus() {
      loadPendingLearnings();
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  async function handleLearningRespond(
    id: string,
    response: {
      status: "accepted" | "rejected";
      framework?: string | null;
      hosting?: string | null;
      note?: string;
    }
  ) {
    setPendingLearnings((current) =>
      current.filter(
        (learning) => learning.id !== id
      )
    );

    try {
      await fetch(`/api/learnings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(response),
      });
    } catch (error) {
      console.error(
        "Unable to respond to learning:",
        error
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const response = await fetch("/api/state");

        if (!response.ok) {
          throw new Error(
            "Unable to load Work Governor data from the database."
          );
        }

        const data =
          (await response.json()) as StoredWorkGovernorData;

        if (cancelled) {
          return;
        }

        setApplications(
          normalizeStoredApplications(
            data.applications || []
          )
        );

        setMessages(
          Array.isArray(data.messages)
            ? data.messages
            : []
        );
      } catch (error) {
        console.error(
          "Unable to restore Work Governor data:",
          error
        );

        if (!cancelled) {
          setApplications([]);
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    loadState();
    loadBackupHistory().then((history) => {
      if (!cancelled) {
        setBackups(history);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    fetch("/api/state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        applications,
        messages,
      } satisfies StoredWorkGovernorData),
    }).catch((error) => {
      console.error(
        "Unable to save Work Governor data:",
        error
      );
    });
  }, [applications, messages, isLoaded]);

  const progress = useMemo(() => {
    const controls = applications.flatMap(
      (application) =>
        application.controls
    );

    return {
      applications: applications.length,

      controls: controls.length,

      notStarted: controls.filter(
        (control) =>
          control.controlStatus === "New" ||
          control.controlStatus ===
            "Checklist Review Pending"
      ).length,

      inProgress: controls.filter(
        (control) =>
          control.controlStatus ===
            "In Progress" ||
          control.controlStatus ===
            "Ready for Review"
      ).length,

      completed: controls.filter(
        (control) =>
          control.controlStatus ===
          "Completed"
      ).length,

      needsAttention: controls.filter(
        (control) =>
          control.controlStatus ===
            "On Hold" ||
          control.checklistStatus ===
            "Needs Revision"
      ).length,

      argosReady: controls.filter(
        (control) =>
          control.qaScore === "Argos Ready"
      ).length,
    };
  }, [applications]);

  const visibleApplications = useMemo(
    () =>
      filterApplications(
        applications,
        filters
      ),
    [applications, filters]
  );

  const matchedControlCount = useMemo(
    () =>
      visibleApplications.reduce(
        (total, application) =>
          total + application.controls.length,
        0
      ),
    [visibleApplications]
  );

  function updateControl(
    applicationId: string,
    controlId: string,
    updater: (
      control: ComplianceControl
    ) => ComplianceControl
  ) {
    setApplications(
      (currentApplications) =>
        currentApplications.map(
          (application) =>
            application.id ===
            applicationId
              ? {
                  ...application,

                  controls:
                    application.controls.map(
                      (control) =>
                        control.id ===
                        controlId
                          ? refreshControlState(
                              updater(control)
                            )
                          : control
                    ),
                }
              : application
        )
    );
  }

  function saveApplicationContext(
    applicationId: string,
    context: ApplicationContextInput
  ) {
    setApplications(
      (currentApplications) =>
        currentApplications.map(
          (application) => {
            if (
              application.id !==
              applicationId
            ) {
              return application;
            }

            const updatedApplication =
              updateApplicationContextValues(
                application,
                context
              );

            return {
              ...updatedApplication,

              controls:
                updatedApplication.controls.map(
                  (control) => {
                    if (
                      control.controlStatus ===
                      "Completed"
                    ) {
                      return control;
                    }

                    return {
                      ...control,
                      checklistStatus:
                        "Review Pending",
                      controlStatus:
                        "Checklist Review Pending",
                    };
                  }
                ),
            };
          }
        )
    );

    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage(
        "assistant",
        `${applicationId} context was saved. Use "Regenerate contextual checklists for ${applicationId}" to apply the new context to every control.`
      ),
    ]);
  }

  function toggleChecklistTask(
    applicationId: string,
    controlId: string,
    taskId: string
  ) {
    updateControl(
      applicationId,
      controlId,
      (control) => ({
        ...control,

        nextTasks:
          control.nextTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  completed:
                    !task.completed,
                }
              : task
          ),
      })
    );
  }

  function approveChecklist(
    applicationId: string,
    controlId: string
  ) {
    updateControl(
      applicationId,
      controlId,
      (control) => ({
        ...control,
        checklistStatus: "Approved",
      })
    );
  }

  function requestChecklistRevision(
    applicationId: string,
    controlId: string
  ) {
    updateControl(
      applicationId,
      controlId,
      (control) => ({
        ...control,
        checklistStatus:
          "Needs Revision",
      })
    );
  }

  function completeControl(
    applicationId: string,
    controlId: string
  ) {
    updateControl(
      applicationId,
      controlId,
      (control) => ({
        ...control,
        controlStatus: "Completed",
        stage: "Completed",
        checklistStatus: "Completed",
      })
    );
  }

  function addTaskNote(
    applicationName: string,
    controlName: string,
    taskText: string,
    note: string
  ) {
    void handleSend(
      `For application "${applicationName}", control "${controlName}", add this note against the checklist item "${taskText}": ${note}`
    );
  }

  function markTaskIrrelevantHandler(
    applicationId: string,
    controlId: string,
    taskId: string,
    reason: string
  ) {
    updateControl(
      applicationId,
      controlId,
      (control) =>
        markTaskIrrelevant(
          control,
          taskId,
          reason
        )
    );
  }

  function restoreTaskHandler(
    applicationId: string,
    controlId: string,
    taskId: string
  ) {
    updateControl(
      applicationId,
      controlId,
      (control) =>
        restoreTaskRelevance(
          control,
          taskId
        )
    );
  }

  function addApplicationNoteHandler(
    applicationId: string,
    note: string
  ) {
    setApplications(
      (currentApplications) =>
        currentApplications.map(
          (application) =>
            application.id ===
            applicationId
              ? addApplicationNote(
                  application,
                  note
                )
              : application
        )
    );
  }

  function regenerateChecklistHandler(
    applicationId: string,
    controlName: string
  ) {
    void handleSend(
      `Regenerate the contextual checklist for control "${controlName}" on application "${applicationId}".`
    );
  }

  async function triggerLearningAnalysis(
    command: Command,
    resultApplications: Application[]
  ) {
    if (
      command.action !== "UPDATE_TASK_NOTES" ||
      !command.payload.changeLogEntries ||
      command.payload.changeLogEntries.length === 0
    ) {
      return;
    }

    const application = findApplication(
      resultApplications,
      command.payload.application
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return;
    }

    try {
      const response = await fetch(
        "/api/learnings/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: application.id,
            controlId: control.id,
            framework: control.framework,
            hosting: application.hosting,
            controlObjective:
              control.controlObjective,
            changeLogEntries:
              command.payload.changeLogEntries,
          }),
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (
        Array.isArray(data.learnings) &&
        data.learnings.length > 0
      ) {
        setPendingLearnings((current) => [
          ...current,
          ...data.learnings,
        ]);
      }
    } catch (error) {
      console.error(
        "Unable to analyze checklist change for learnings:",
        error
      );
    }
  }

  async function handleSend(
    userInput: string
  ) {
    const trimmedInput =
      String(userInput ?? "").trim();

    if (
      !trimmedInput ||
      isProcessing
    ) {
      return;
    }

    const userMessage = createMessage(
      "user",
      trimmedInput
    );

    const historyBeforeRequest =
      messages.slice(-10);

    setMessages(
      (currentMessages) => [
        ...currentMessages,
        userMessage,
      ]
    );

    setIsProcessing(true);

    try {
      const response = await fetch(
        "/api/assistant",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: trimmedInput,
            applications,

            history:
              historyBeforeRequest.map(
                (message) => ({
                  role: message.role,
                  content:
                    message.content,
                })
              ),
          }),
        }
      );

      const data =
        (await response.json()) as AssistantApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "The assistant request failed."
        );
      }

      if (!data.command) {
        throw new Error(
          "The assistant did not return a valid command."
        );
      }

      if (
        PRIVILEGED_ACTIONS.has(
          data.command.action
        )
      ) {
        const enteredPassword =
          window.prompt(
            `Enter the root password to ${describePrivilegedAction(
              data.command.action
            )}:`
          );

        if (
          enteredPassword !== ROOT_PASSWORD
        ) {
          setMessages(
            (currentMessages) => [
              ...currentMessages,

              createMessage(
                "assistant",
                enteredPassword === null
                  ? "Root password entry was cancelled. No action was taken."
                  : "Incorrect root password. No action was taken."
              ),
            ]
          );

          return;
        }
      }

      if (
        data.command.action ===
        "CLEAR_CHAT_HISTORY"
      ) {
        setMessages([]);
        return;
      }

      if (
        data.command.action ===
        "EXPORT_PROGRESS_REPORT"
      ) {
        generateExecutiveProgressPdf(
          applications
        );

        const exportMessage =
          data.command.payload.message ||
          data.assistantMessage ||
          "The executive progress report was generated and downloaded as a PDF.";

        setMessages(
          (currentMessages) => [
            ...currentMessages,

            createMessage(
              "assistant",
              exportMessage
            ),
          ]
        );

        return;
      }

      if (
        data.command.action ===
        "BACKUP_APPLICATION_DATA"
      ) {
        const newBackupEntry =
          await createAndSaveBackup(
            applications,
            [...messages, userMessage]
          );

        setBackups(
          (currentBackups) => [
            ...currentBackups,
            newBackupEntry,
          ]
        );

        downloadApplicationBackup(
          newBackupEntry.applications,
          newBackupEntry.messages
        );

        setMessages(
          (currentMessages) => [
            ...currentMessages,

            createMessage(
              "assistant",
              `Backup ${formatBackupSummary(
                newBackupEntry
              )} was created and downloaded. Say "list backups" to see all backups or "rollback to backup ${
                newBackupEntry.version
              }" to restore this one.`
            ),
          ]
        );

        return;
      }

      if (
        data.command.action ===
        "LIST_BACKUPS"
      ) {
        setMessages(
          (currentMessages) => [
            ...currentMessages,

            createMessage(
              "assistant",
              formatBackupList(backups)
            ),
          ]
        );

        return;
      }

      if (
        data.command.action ===
        "ROLLBACK_BACKUP"
      ) {
        const targetVersion =
          data.command.payload.version;

        const targetBackup =
          findBackupByVersion(
            backups,
            targetVersion
          );

        if (!targetBackup) {
          setMessages(
            (currentMessages) => [
              ...currentMessages,

              createMessage(
                "assistant",
                `Backup #${targetVersion} was not found.`
              ),
            ]
          );

          return;
        }

        if (
          !data.command.payload.confirmed
        ) {
          setMessages(
            (currentMessages) => [
              ...currentMessages,

              createMessage(
                "assistant",
                `Please confirm: say "yes, rollback to backup ${targetVersion}" to replace current data with ${formatBackupSummary(
                  targetBackup
                )}. Your current state will be saved as a new backup first.`
              ),
            ]
          );

          return;
        }

        const safetyEntry =
          await createAndSaveBackup(
            applications,
            [...messages, userMessage]
          );

        const restoredApplications =
          normalizeStoredApplications(
            targetBackup.applications
          );

        setBackups(
          (currentBackups) => [
            ...currentBackups,
            safetyEntry,
          ]
        );

        setApplications(
          restoredApplications
        );

        setMessages([
          ...targetBackup.messages,

          createMessage(
            "assistant",
            `Rolled back to ${formatBackupSummary(
              targetBackup
            )}. Your previous state was saved as backup #${
              safetyEntry.version
            } before rolling back.`
          ),
        ]);

        setExpandedApplication(null);

        return;
      }

      const result = executeCommand(
        data.command,
        applications
      );

      setApplications(
        result.applications.map(
          normalizeStoredApplication
        )
      );

      setMessages(
        (currentMessages) => [
          ...currentMessages,

          createMessage(
            "assistant",
            result.message ||
              data.assistantMessage ||
              "The request was completed."
          ),
        ]
      );

      void triggerLearningAnalysis(
        data.command,
        result.applications
      );

      if (
        data.command.action ===
        "RENAME_APPLICATION"
      ) {
        const newApplicationId =
          normalizeApplicationId(
            data.command.payload.newName
          );

        if (newApplicationId) {
          setExpandedApplication(
            newApplicationId
          );
        }
      } else if (
        "application" in
        data.command.payload
      ) {
        const applicationName =
          data.command.payload
            .application;

        if (applicationName) {
          setExpandedApplication(
            normalizeApplicationId(
              applicationName
            )
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The assistant request failed.";

      setMessages(
        (currentMessages) => [
          ...currentMessages,

          createMessage(
            "assistant",
            errorMessage
          ),
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
        <div className="shrink-0">
          <Header />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">
            Loading Work Governor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <LearningNotifications
        learnings={pendingLearnings}
        onRespond={handleLearningRespond}
      />

      <div className="shrink-0">
        <Header />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 xl:px-4 xl:py-4">
        <div className="grid h-full min-h-0 w-full gap-3 xl:grid-cols-[minmax(220px,17%)_minmax(500px,55%)_minmax(320px,28%)] xl:gap-4">
          <aside className="hidden h-full min-h-0 overflow-hidden xl:block">
            <div className="h-full overflow-hidden">
              <ProgressSummary
                applications={
                  progress.applications
                }
                controls={progress.controls}
                notStarted={
                  progress.notStarted
                }
                inProgress={
                  progress.inProgress
                }
                completed={progress.completed}
                needsAttention={
                  progress.needsAttention
                }
                argosReady={
                  progress.argosReady
                }
              />
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="mb-3 flex shrink-0 items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-white">
                  Applications
                </h2>

                <p className="mt-1 truncate text-sm text-slate-400">
                  Connect application context,
                  SOX risk, authoritative
                  evidence, and Argos monitoring.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                {applications.length} application
                {applications.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="mb-3 shrink-0 xl:hidden">
              <ProgressSummary
                applications={
                  progress.applications
                }
                controls={progress.controls}
                notStarted={
                  progress.notStarted
                }
                inProgress={
                  progress.inProgress
                }
                completed={progress.completed}
                needsAttention={
                  progress.needsAttention
                }
                argosReady={
                  progress.argosReady
                }
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 xl:pr-2">
              {applications.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                  <div>
                    <h3 className="font-medium text-slate-200">
                      No applications yet
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Use the chat to create an
                      application and its controls.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <FilterBar
                    applications={applications}
                    filters={filters}
                    onChange={setFilters}
                    matchedApplicationCount={
                      visibleApplications.length
                    }
                    totalApplicationCount={
                      applications.length
                    }
                    matchedControlCount={
                      matchedControlCount
                    }
                    totalControlCount={
                      progress.controls
                    }
                  />

                  {visibleApplications.length ===
                  0 ? (
                    <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                      <div>
                        <h3 className="font-medium text-slate-200">
                          No matches
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                          No applications or controls
                          match the current filters.
                        </p>
                      </div>
                    </div>
                  ) : (
                <div className="space-y-4 pb-4">
                  {visibleApplications.map(
                    (application) => (
                      <ApplicationCard
                        key={application.id}
                        applicationName={
                          application.name
                        }
                        hosting={
                          application.hosting
                        }
                        totalControls={
                          application.controls
                            .length
                        }
                        contextStatus={
                          application.contextStatus
                        }
                        applicationPurpose={
                          application.applicationPurpose
                        }
                        businessProcess={
                          application.businessProcess
                        }
                        applicationOwner={
                          application.applicationOwner
                        }
                        technicalOwner={
                          application.technicalOwner
                        }
                        applicationContacts={
                          application.applicationContacts
                        }
                        integrations={
                          application.integrations
                        }
                        identityTypes={
                          application.identityTypes
                        }
                        hostingDetails={
                          application.hostingDetails
                        }
                        dataClassification={
                          application.dataClassification
                        }
                        financialRelevance={
                          application.financialRelevance
                        }
                        controls={
                          application.controls
                        }
                        notes={
                          application.notes
                        }
                        onAddNote={(note) =>
                          addApplicationNoteHandler(
                            application.id,
                            note
                          )
                        }
                        expanded={
                          expandedApplication ===
                          application.id
                        }
                        onToggle={() =>
                          setExpandedApplication(
                            (
                              currentApplication
                            ) =>
                              currentApplication ===
                              application.id
                                ? null
                                : application.id
                          )
                        }
                        onSaveContext={(
                          context
                        ) =>
                          saveApplicationContext(
                            application.id,
                            context
                          )
                        }
                      >
                        {application.controls.length ===
                        0 ? (
                          <p className="text-sm text-slate-400">
                            No controls have been added.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {application.controls.map(
                              (control) => (
                                <ControlCard
                                  key={control.id}
                                  controlName={
                                    control.name
                                  }
                                  framework={
                                    control.framework
                                  }
                                  homeworkStatus={
                                    control.homeworkStatus
                                  }
                                  stage={
                                    control.stage
                                  }
                                  controlStatus={
                                    control.controlStatus
                                  }
                                  checklistStatus={
                                    control.checklistStatus
                                  }
                                  controlObjective={
                                    control.controlObjective
                                  }
                                  controlRisk={
                                    control.controlRisk
                                  }
                                  applicabilityRationale={
                                    control.applicabilityRationale
                                  }
                                  evidenceStrategy={
                                    control.evidenceStrategy
                                  }
                                  qaScore={
                                    control.qaScore
                                  }
                                  qaScoreRationale={
                                    control.qaScoreRationale
                                  }
                                  checklistChangeLog={
                                    control.checklistChangeLog
                                  }
                                  notes={
                                    control.notes
                                  }
                                  nextTasks={
                                    control.nextTasks
                                  }
                                  onToggleTask={(
                                    taskId
                                  ) =>
                                    toggleChecklistTask(
                                      application.id,
                                      control.id,
                                      taskId
                                    )
                                  }
                                  onAddTaskNote={(
                                    taskText,
                                    note
                                  ) =>
                                    addTaskNote(
                                      application.name,
                                      control.name,
                                      taskText,
                                      note
                                    )
                                  }
                                  onMarkTaskIrrelevant={(
                                    taskId,
                                    reason
                                  ) =>
                                    markTaskIrrelevantHandler(
                                      application.id,
                                      control.id,
                                      taskId,
                                      reason
                                    )
                                  }
                                  onRestoreTask={(
                                    taskId
                                  ) =>
                                    restoreTaskHandler(
                                      application.id,
                                      control.id,
                                      taskId
                                    )
                                  }
                                  onRegenerateChecklist={() =>
                                    regenerateChecklistHandler(
                                      application.id,
                                      control.name
                                    )
                                  }
                                  onApproveChecklist={() =>
                                    approveChecklist(
                                      application.id,
                                      control.id
                                    )
                                  }
                                  onRequestChecklistRevision={() =>
                                    requestChecklistRevision(
                                      application.id,
                                      control.id
                                    )
                                  }
                                  onCompleteControl={() =>
                                    completeControl(
                                      application.id,
                                      control.id
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                        )}
                      </ApplicationCard>
                    )
                  )}
                </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="h-full min-h-0 min-w-0 overflow-hidden">
            <div className="h-full min-h-0 overflow-hidden">
              <ChatPanel
                messages={messages}
                onSend={handleSend}
                assistantMessage={
                  isProcessing
                    ? "Work Governor is analyzing the application context, SOX control risk, evidence sources, identities, and Argos objective..."
                    : undefined
                }
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
