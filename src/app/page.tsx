"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminConfirmModal from "@/components/AdminConfirmModal";
import ApplicationCard from "@/components/ApplicationCard";
import ChatPanel, {
  type ChatMessage,
} from "@/components/ChatPanel";
import ControlCard from "@/components/ControlCard";
import AttachmentManagerModal from "@/components/AttachmentManagerModal";
import EvidenceUploadModal, {
  type EvidenceKind,
  type EvidenceUploadResult,
} from "@/components/EvidenceUploadModal";
import FilterBar from "@/components/FilterBar";
import Header from "@/components/layout/Header";
import LearningNotifications, {
  type PendingClientReferenceLearning,
  type PendingLearning,
} from "@/components/LearningNotifications";

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
  type NoteSource,
} from "@/services/commandEngine";
import {
  EMPTY_APPLICATION_FILTERS,
  filterApplications,
  type ApplicationFilterState,
} from "@/services/applicationFilters";
import { generateExecutiveProgressPdf } from "@/services/exportReport";
import { formatClientReferenceEntry } from "@/services/clientReference";
import { formatMeetingPrepEmailText } from "@/services/meetingPrepEmail";
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

// The exact text the AdminConfirmModal requires the user to type,
// matching what commandEngine.ts's own confirmation messages ask for
// (kept here too since confirmation is now decided entirely client
// side in a single modal, before any second round trip).
function computeRequiredPhrase(
  command: Command
): string {
  switch (command.action) {
    case "DELETE_APPLICATION":
      return `yes, delete ${command.payload.application}`;
    case "DELETE_ALL_APPLICATIONS":
      return "yes, delete all applications";
    case "ROLLBACK_BACKUP":
      return `yes, rollback to backup ${command.payload.version}`;
    case "CLEAR_CHAT_HISTORY":
      return "yes, clear chat history";
    default:
      return "yes, continue";
  }
}

// Marks a privileged command as pre-confirmed once the single
// AdminConfirmModal round trip has already verified the password and
// the typed confirmation phrase, so the normal execution path below
// (which still checks payload.confirmed for these three actions)
// proceeds immediately instead of asking again.
function withConfirmed(command: Command): Command {
  switch (command.action) {
    case "DELETE_APPLICATION":
      return {
        ...command,
        payload: {
          ...command.payload,
          confirmed: true,
        },
      };
    case "DELETE_ALL_APPLICATIONS":
      return {
        ...command,
        payload: {
          ...command.payload,
          confirmed: true,
        },
      };
    case "ROLLBACK_BACKUP":
      return {
        ...command,
        payload: {
          ...command.payload,
          confirmed: true,
        },
      };
    default:
      return command;
  }
}

const PROCESSING_SUMMARY_MAX_LENGTH = 90;

// A short, honest echo of what the user actually asked for, shown
// while a request is in flight -- not a guess at which action Claude
// will pick (that isn't known yet), just their own words condensed.
function summarizeForProgress(
  message: string
): string {
  const collapsed = message
    .replace(/\s+/g, " ")
    .trim();

  if (
    collapsed.length <=
    PROCESSING_SUMMARY_MAX_LENGTH
  ) {
    return collapsed;
  }

  return `${collapsed
    .slice(0, PROCESSING_SUMMARY_MAX_LENGTH)
    .trimEnd()}…`;
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
  content: string,
  attachment?: ChatMessage["attachment"]
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    role,
    content,
    attachment,
  };
}

// Defense in depth: no chat message is expected to be this long since
// evidence/data uploads use a short display message (see
// handleEvidenceUploaded), but this guarantees history sent on any
// future turn can never itself blow the assistant's prompt token
// budget, regardless of what produced an oversized message.
const HISTORY_ITEM_CHAR_CAP = 4000;

function truncateForHistory(content: string): string {
  if (content.length <= HISTORY_ITEM_CHAR_CAP) {
    return content;
  }

  const omitted =
    content.length - HISTORY_ITEM_CHAR_CAP;

  return `${content.slice(
    0,
    HISTORY_ITEM_CHAR_CAP
  )}\n\n[...truncated, ${omitted} more characters omitted...]`;
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

    evidenceDataGapAnalysis:
      control.evidenceDataGapAnalysis || "",

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

    evidenceDataGapSummary:
      application.evidenceDataGapSummary || "",

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

  const [
    processingSummary,
    setProcessingSummary,
  ] = useState("");

  const [isLoaded, setIsLoaded] =
    useState(false);

  // Set only on a genuinely failed load (never on success). While
  // this is set, isLoaded stays false, which keeps the auto-save
  // effect below from ever firing -- otherwise a transient load
  // failure would clear applications/messages to [] and the save
  // effect would immediately persist that empty state, wiping the
  // real data in the database.
  const [loadError, setLoadError] = useState<
    string | null
  >(null);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  const [filters, setFilters] =
    useState<ApplicationFilterState>(
      EMPTY_APPLICATION_FILTERS
    );

  const [isChatCollapsed, setIsChatCollapsed] =
    useState(false);

  const [backups, setBackups] = useState<
    BackupEntry[]
  >([]);

  const [pendingLearnings, setPendingLearnings] =
    useState<PendingLearning[]>([]);

  const [
    pendingClientReferenceLearnings,
    setPendingClientReferenceLearnings,
  ] = useState<
    PendingClientReferenceLearning[]
  >([]);

  const [
    pendingAdminConfirmation,
    setPendingAdminConfirmation,
  ] = useState<{
    description: string;
    requiredPhrase: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  const [
    evidenceModalKind,
    setEvidenceModalKind,
  ] = useState<EvidenceKind | null>(null);

  const [
    attachmentManagerApplicationId,
    setAttachmentManagerApplicationId,
  ] = useState<string | null>(null);

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

    async function loadPendingClientReferenceLearnings() {
      try {
        const response = await fetch(
          "/api/learnings/client-context/pending"
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (Array.isArray(data.learnings)) {
          setPendingClientReferenceLearnings(
            data.learnings
          );
        }
      } catch (error) {
        console.error(
          "Unable to load pending client reference learnings:",
          error
        );
      }
    }

    loadPendingLearnings();
    loadPendingClientReferenceLearnings();

    function handleFocus() {
      loadPendingLearnings();
      loadPendingClientReferenceLearnings();
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

  async function handleClientReferenceLearningRespond(
    id: string,
    status: "accepted" | "rejected"
  ) {
    const learning =
      pendingClientReferenceLearnings.find(
        (current) => current.id === id
      );

    setPendingClientReferenceLearnings(
      (current) =>
        current.filter(
          (current) => current.id !== id
        )
    );

    try {
      const response = await fetch(
        `/api/learnings/client-context/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (
        response.ok &&
        status === "accepted" &&
        learning
      ) {
        // The client holds the authoritative
        // application/control state and
        // auto-saves it, so the backfill has to
        // happen here, not just server side.
        // Only fill in a control whose
        // clientContext is still blank -- never
        // overwrite something already set.
        updateControl(
          learning.sourceApplicationId,
          learning.sourceControlId,
          (control) =>
            control.clientContext
              ? control
              : {
                  ...control,
                  clientContext:
                    formatClientReferenceEntry({
                      code: learning.code,
                      title: learning.title,
                    }),
                }
        );
      }
    } catch (error) {
      console.error(
        "Unable to respond to client reference learning:",
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

        // Only now is it safe to let the auto-save effect run --
        // it has the real, current server state to build on.
        setLoadError(null);
        setIsLoaded(true);
      } catch (error) {
        console.error(
          "Unable to restore Work Governor data:",
          error
        );

        // Deliberately do NOT touch applications/messages or flip
        // isLoaded here -- doing so would arm the auto-save effect
        // with empty state and it would immediately overwrite the
        // real data in the database with nothing.
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load Work Governor data from the database."
          );
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
  }, [loadAttempt]);

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

  // Regenerating every control in one GENERATE_CONTEXTUAL_CHECKLISTS
  // call asks the model to produce a full checklist (objective, risk,
  // rationale, evidence strategy, argos objective, tasks) for every
  // control in a single response -- on an application with several
  // controls that reliably blows the model's max output tokens and
  // gets cut off mid-JSON. Looping REGENERATE_CONTROL_CHECKLIST one
  // control at a time (the same reliable path the per-control
  // hamburger menu action already uses) produces the exact same
  // result per control without that ceiling, at the cost of a visible
  // per-control message in chat instead of one combined summary.
  async function regenerateAllChecklistsHandler(
    application: Application
  ) {
    for (const control of application.controls) {
      await handleSend(
        `Regenerate the contextual checklist for control "${control.name}" on application "${application.id}".`
      );
    }
  }

  async function analyzeChecklistChange(
    application: Application,
    control: ComplianceControl,
    changeLogEntries: Array<{
      changeType: string;
      taskText: string;
      reason: string;
    }>
  ) {
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
            changeLogEntries,
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

  async function proposeClientReferenceLearning(
    application: Application,
    control: ComplianceControl,
    proposed: {
      code: string;
      title: string;
      sourceQuote: string;
    }
  ) {
    try {
      const response = await fetch(
        "/api/learnings/client-context",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: proposed.code,
            title: proposed.title,
            sourceQuote: proposed.sourceQuote,
            sourceApplicationId: application.id,
            sourceControlId: control.id,
            sourceControlName: control.name,
          }),
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.learning) {
        setPendingClientReferenceLearnings(
          (current) => [
            ...current,
            data.learning,
          ]
        );
      }
    } catch (error) {
      console.error(
        "Unable to propose client reference learning:",
        error
      );
    }
  }

  async function triggerLearningAnalysis(
    command: Command,
    resultApplications: Application[]
  ) {
    if (
      command.action === "CREATE_APPLICATION"
    ) {
      const controlsWithProposals =
        command.payload.controls.filter(
          (controlInput) =>
            controlInput.proposedClientReference
        );

      if (
        controlsWithProposals.length === 0
      ) {
        return;
      }

      const targetApplication =
        resultApplications.find((application) =>
          command.payload.controls.every(
            (controlInput) =>
              application.controls.some(
                (existing) =>
                  existing.name ===
                  controlInput.name
              )
          )
        );

      if (!targetApplication) {
        return;
      }

      for (const controlInput of controlsWithProposals) {
        const control = findControl(
          targetApplication.controls,
          controlInput.name
        );

        if (
          !control ||
          !controlInput.proposedClientReference
        ) {
          continue;
        }

        await proposeClientReferenceLearning(
          targetApplication,
          control,
          controlInput.proposedClientReference
        );
      }

      return;
    }

    if (command.action === "ADD_CONTROL") {
      if (!command.payload.proposedClientReference) {
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

      await proposeClientReferenceLearning(
        application,
        control,
        command.payload.proposedClientReference
      );

      return;
    }

    if (command.action === "UPDATE_TASK_NOTES") {
      if (
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

      await analyzeChecklistChange(
        application,
        control,
        command.payload.changeLogEntries
      );

      return;
    }

    if (
      command.action ===
      "PROCESS_MEETING_RESPONSE"
    ) {
      const application = findApplication(
        resultApplications,
        command.payload.application
      );

      if (!application) {
        return;
      }

      for (const update of command.payload
        .controlUpdates) {
        if (
          !update.changeLogEntries ||
          update.changeLogEntries.length === 0
        ) {
          continue;
        }

        const control = findControl(
          application.controls,
          update.control
        );

        if (!control) {
          continue;
        }

        await analyzeChecklistChange(
          application,
          control,
          update.changeLogEntries
        );
      }
    }
  }

  function handleEvidenceUploaded(
    result: EvidenceUploadResult
  ) {
    // The modal closes itself (immediately if every file uploaded, or
    // after the user acknowledges a skipped-file summary) -- see
    // EvidenceUploadModal's onClose call in handleSubmit.

    // Per-document text is already capped at MAX_STORED_TEXT_LENGTH
    // (300,000 chars) for storage, but that alone is enough to blow the
    // 200k-token prompt budget once combined with a few files in one
    // batch. Cap what actually goes into this turn's AI message: each
    // document gets truncated to a smaller processing cap, and the
    // combined block is capped further still -- mirroring how
    // formatEvidenceArchive() budgets stored evidence in route.ts. The
    // full text is untouched in storage either way, so nothing here
    // affects what's retrievable for future Q&A.
    const PER_DOCUMENT_PROCESSING_CHAR_CAP = 100_000;
    const COMBINED_PROCESSING_CHAR_BUDGET = 300_000;

    let remainingBudget =
      COMBINED_PROCESSING_CHAR_BUDGET;
    const truncatedFilenames: string[] = [];
    const skippedFilenames: string[] = [];

    const documentsBlock = result.documents
      .map((document) => {
        if (remainingBudget <= 0) {
          skippedFilenames.push(
            document.filename
          );
          return null;
        }

        const cap = Math.min(
          PER_DOCUMENT_PROCESSING_CHAR_CAP,
          remainingBudget
        );

        const wasTruncated =
          document.extractedText.length > cap;

        const text = wasTruncated
          ? document.extractedText.slice(0, cap)
          : document.extractedText;

        remainingBudget -= text.length;

        if (wasTruncated) {
          truncatedFilenames.push(
            document.filename
          );
        }

        return `--- Document: "${document.filename}"${wasTruncated ? " (truncated for this pass -- full text remains stored for future Q&A)" : ""} ---\n${text}`;
      })
      .filter(
        (entry): entry is string =>
          entry !== null
      )
      .join("\n\n");

    const scopeInstruction =
      result.scope === "selected"
        ? `for control "${result.controlName}" only`
        : "for the controls that are necessary";

    const sourceDescription =
      result.kind === "evidence"
        ? "evidence document(s)"
        : "real application data file(s)";

    const budgetCaveat =
      truncatedFilenames.length > 0 ||
      skippedFilenames.length > 0
        ? ` Note: ${[
            truncatedFilenames.length > 0
              ? `${truncatedFilenames.join(", ")} ${truncatedFilenames.length === 1 ? "was" : "were"} only partially read this pass`
              : null,
            skippedFilenames.length > 0
              ? `${skippedFilenames.join(", ")} ${skippedFilenames.length === 1 ? "was" : "were"} not read at all this pass`
              : null,
          ]
            .filter(Boolean)
            .join(
              "; "
            )} due to size -- say so explicitly in any note or summary you write about them rather than treating them as fully covered.`
        : "";

    // Deliberately phrased as an application team reply (rather than
    // a single "update the notes" instruction) so this always routes
    // through PROCESS_MEETING_RESPONSE's per-item matching, even when
    // the attached document is short or single-topic -- more robust
    // than UPDATE_TASK_NOTES for arbitrary extracted document text.
    // This is sent to the AI for THIS turn only -- it is never stored
    // in chat history (see displayMessage below), since document text
    // can be hundreds of KB and would blow the prompt token budget the
    // moment it got replayed back in on a later turn's history.
    const aiMessage = `The application team sent over ${sourceDescription} ${scopeInstruction} on ${result.applicationId}. Treat this the same as an application team reply: read through it and match every distinct fact to the checklist item(s) it answers, ${scopeInstruction}. For every note you write, end it with a tag naming which document it came from, in this exact form: [Attachment: <filename>].${budgetCaveat}\n\n${documentsBlock}`;

    const filenames = result.documents
      .map((document) => document.filename)
      .join(", ");

    const displayMessage = `Attached ${result.documents.length} ${sourceDescription} ${scopeInstruction} on ${result.applicationId}: ${filenames}.${budgetCaveat}`;

    const documentsByFilename: Record<
      string,
      string
    > = {};

    for (const document of result.documents) {
      documentsByFilename[document.filename] =
        document.id;
    }

    void handleSend(
      displayMessage,
      {
        kind: result.kind,
        documentsByFilename,
      },
      aiMessage
    );
  }

  async function handleDeleteEvidence(
    documentId: string
  ) {
    const response = await fetch(
      `/api/evidence/${documentId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      console.error(
        "Unable to delete evidence document:",
        documentId
      );
      return;
    }

    // The main app state is client-authoritative (auto-saved on every
    // change), so striking the notes that came from this document has
    // to happen here too, not just server side -- the note text stays
    // for audit history, only documentDeleted flips.
    setApplications((currentApplications) =>
      currentApplications.map(
        (application) => ({
          ...application,
          notes: application.notes.map(
            (note) =>
              note.sourceDocumentId ===
              documentId
                ? {
                    ...note,
                    documentDeleted: true,
                  }
                : note
          ),
          controls: application.controls.map(
            (control) =>
              refreshControlState({
                ...control,
                notes: control.notes.map(
                  (note) =>
                    note.sourceDocumentId ===
                    documentId
                      ? {
                          ...note,
                          documentDeleted:
                            true,
                        }
                      : note
                ),
                nextTasks:
                  control.nextTasks.map(
                    (task) => ({
                      ...task,
                      notes: task.notes.map(
                        (note) =>
                          note.sourceDocumentId ===
                          documentId
                            ? {
                                ...note,
                                documentDeleted:
                                  true,
                              }
                            : note
                      ),
                    })
                  ),
              })
          ),
        })
      )
    );
  }

  async function handleSend(
    userInput: string,
    noteSource?: NoteSource,
    aiMessageOverride?: string
  ) {
    const trimmedInput =
      String(userInput ?? "").trim();

    if (
      !trimmedInput ||
      isProcessing
    ) {
      return;
    }

    // What gets displayed and kept in chat history is always the short
    // form (trimmedInput). aiMessageOverride, when present, is a fuller
    // version (e.g. raw evidence/data document text) sent to the AI for
    // this turn only -- it is never stored, so it can't get replayed
    // back in on a future turn's history and blow the prompt token
    // budget the way full document dumps did before this existed.
    const messageForAi =
      aiMessageOverride?.trim() || trimmedInput;

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
    setProcessingSummary(
      summarizeForProgress(trimmedInput)
    );

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
            message: messageForAi,
            applications,

            history:
              historyBeforeRequest.map(
                (message) => ({
                  role: message.role,
                  content:
                    truncateForHistory(
                      message.content
                    ),
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
        const requiredPhrase =
          computeRequiredPhrase(
            data.command
          );

        const confirmed =
          await new Promise<boolean>(
            (resolve) => {
              setPendingAdminConfirmation({
                description:
                  describePrivilegedAction(
                    data.command!.action
                  ),
                requiredPhrase,
                resolve,
              });
            }
          );

        setPendingAdminConfirmation(null);

        if (!confirmed) {
          setMessages(
            (currentMessages) => [
              ...currentMessages,

              createMessage(
                "assistant",
                "Action was cancelled. No changes were made."
              ),
            ]
          );

          return;
        }

        data.command = withConfirmed(
          data.command
        );
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
        "EXPORT_MEETING_PREP_EMAIL"
      ) {
        const targetApplication =
          findApplication(
            applications,
            data.command.payload.application
          );

        const applicationName =
          targetApplication?.name ||
          data.command.payload.application;

        const emailPayload =
          data.command.payload.email;

        // The "Show Questions" buttons ask for the same
        // EXPORT_MEETING_PREP_EMAIL command as "Prep Email" but with
        // this phrase added, so the full email still gets generated
        // (the AI's schema requires every field) -- only the display
        // differs, extracting just openQuestions instead of showing
        // the whole email.
        const wantsQuestionsOnly =
          trimmedInput
            .toLowerCase()
            .includes(
              "just the open questions"
            );

        if (wantsQuestionsOnly) {
          const questionsMessage =
            emailPayload.openQuestions
              .length > 0
              ? `Open questions for ${applicationName} are ready below.`
              : `No open questions right now for ${applicationName}.`;

          setMessages(
            (currentMessages) => [
              ...currentMessages,

              createMessage(
                "assistant",
                questionsMessage,
                {
                  type: "open-questions",
                  applicationName,
                  questions:
                    emailPayload.openQuestions,
                }
              ),
            ]
          );

          return;
        }

        const { subject, body } =
          formatMeetingPrepEmailText(
            applicationName,
            emailPayload
          );

        const exportMessage =
          data.command.payload.message ||
          data.assistantMessage ||
          "The meeting-prep email was drafted.";

        setMessages(
          (currentMessages) => [
            ...currentMessages,

            createMessage(
              "assistant",
              exportMessage,
              {
                type: "meeting-prep-email",
                applicationName,
                subject,
                body,
                email: emailPayload,
              }
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
        applications,
        noteSource
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
      setProcessingSummary("");
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
        <div className="shrink-0">
          <Header />
        </div>

        <div className="flex flex-1 items-center justify-center">
          {loadError ? (
            <div className="max-w-md text-center">
              <p className="text-sm text-red-400">
                {loadError}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Your existing data has not been
                touched -- nothing is saved
                until it loads successfully.
              </p>
              <button
                type="button"
                onClick={() =>
                  setLoadAttempt(
                    (current) => current + 1
                  )
                }
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Loading Work Governor...
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <LearningNotifications
        learnings={pendingLearnings}
        onRespond={handleLearningRespond}
        clientReferenceLearnings={
          pendingClientReferenceLearnings
        }
        onRespondClientReference={
          handleClientReferenceLearningRespond
        }
      />

      {pendingAdminConfirmation ? (
        <AdminConfirmModal
          description={
            pendingAdminConfirmation.description
          }
          requiredPassword={ROOT_PASSWORD}
          requiredPhrase={
            pendingAdminConfirmation.requiredPhrase
          }
          onConfirm={() =>
            pendingAdminConfirmation.resolve(
              true
            )
          }
          onCancel={() =>
            pendingAdminConfirmation.resolve(
              false
            )
          }
        />
      ) : null}

      {evidenceModalKind ? (
        <EvidenceUploadModal
          kind={evidenceModalKind}
          applications={applications}
          onClose={() =>
            setEvidenceModalKind(null)
          }
          onUploaded={
            handleEvidenceUploaded
          }
        />
      ) : null}

      {attachmentManagerApplicationId ? (
        <AttachmentManagerModal
          application={
            applications.find(
              (application) =>
                application.id ===
                attachmentManagerApplicationId
            ) ?? null
          }
          onClose={() =>
            setAttachmentManagerApplicationId(
              null
            )
          }
          onDelete={handleDeleteEvidence}
        />
      ) : null}

      <div className="shrink-0">
        <Header progress={progress} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 xl:px-4 xl:py-4">
        <div
          className={`grid h-full min-h-0 w-full gap-3 xl:gap-4 ${
            isChatCollapsed
              ? "xl:grid-cols-[1fr_44px]"
              : "xl:grid-cols-[minmax(650px,78%)_minmax(300px,22%)]"
          }`}
        >
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">
                Applications
              </h2>

              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                {applications.length} application
                {applications.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            {applications.length > 0 && (
              <div className="mb-2 shrink-0">
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
              </div>
            )}

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
                        evidenceDataGapSummary={
                          application.evidenceDataGapSummary
                        }
                        onRefreshEvidenceDataGapAnalysis={() =>
                          handleSend(
                            `Analyze the evidence vs real data gap for ${application.id}, across all controls.`
                          )
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
                        onRegenerateAllChecklists={() =>
                          void regenerateAllChecklistsHandler(
                            application
                          )
                        }
                        onPrepEmail={() =>
                          handleSend(
                            `Give me an email-ready version for ${application.id}.`
                          )
                        }
                        onShowQuestions={() =>
                          handleSend(
                            `Give me just the open questions from an email-ready version for ${application.id}.`
                          )
                        }
                        onOpenAttachments={() =>
                          setAttachmentManagerApplicationId(
                            application.id
                          )
                        }
                        isProcessing={isProcessing}
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
                                  globalControlReference={
                                    control.globalControlReference
                                  }
                                  clientContext={
                                    control.clientContext
                                  }
                                  framework={
                                    control.framework
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
                                  evidenceDataGapAnalysis={
                                    control.evidenceDataGapAnalysis
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
                                  onPrepEmail={() =>
                                    handleSend(
                                      `Give me an email-ready version for ${application.id}, for control "${control.name}" only.`
                                    )
                                  }
                                  onShowQuestions={() =>
                                    handleSend(
                                      `Give me just the open questions from an email-ready version for ${application.id}, for control "${control.name}" only.`
                                    )
                                  }
                                  onRefreshEvidenceDataGapAnalysis={() =>
                                    handleSend(
                                      `Analyze the evidence vs real data gap for ${application.id}, for control "${control.name}" only.`
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
            {isChatCollapsed ? (
              <button
                type="button"
                onClick={() =>
                  setIsChatCollapsed(false)
                }
                title="Expand chat"
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <span className="text-lg">
                  ‹
                </span>
                <span className="[writing-mode:vertical-rl] text-xs font-medium tracking-wide">
                  Chat
                </span>
              </button>
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
                <div className="flex shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setIsChatCollapsed(true)
                    }
                    title="Collapse chat"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Collapse ›
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <ChatPanel
                    messages={messages}
                    onSend={handleSend}
                    assistantMessage={
                      isProcessing
                        ? `Working on: "${processingSummary}"`
                        : undefined
                    }
                    onAttachEvidence={(
                      kind
                    ) =>
                      setEvidenceModalKind(
                        kind
                      )
                    }
                  />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
