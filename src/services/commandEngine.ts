export type HomeworkStatus = "Waiting" | "Completed";

export type WorkflowStage =
  | "Homework"
  | "Discovery"
  | "Evidence Collection"
  | "Testing"
  | "Review"
  | "Completed";

export type Framework = "SOX" | "PCI DSS";

export type ControlStatus =
  | "New"
  | "Checklist Review Pending"
  | "In Progress"
  | "Ready for Review"
  | "Completed"
  | "On Hold";

export type ChecklistStatus =
  | "Review Pending"
  | "Approved"
  | "Needs Revision"
  | "Completed";

export type TaskCategory =
  | "Homework"
  | "Discovery"
  | "Access"
  | "Evidence Collection"
  | "Validation"
  | "Approval"
  | "Argos Design"
  | "Next Steps";

export type ApplicationContextStatus =
  | "Missing"
  | "Partial"
  | "Complete";

export type QaScoreLevel =
  | "Not Started"
  | "Surface Level"
  | "Developing"
  | "Well Researched"
  | "Argos Ready";

export type ChecklistChangeType =
  | "ADDED"
  | "REMOVED";

export interface ChecklistChangeLogEntry {
  id: string;
  timestamp: string;
  changeType: ChecklistChangeType;
  taskText: string;
  reason: string;
}

export type ChecklistMode =
  | "APPEND"
  | "REPLACE"
  | "REMOVE_DUPLICATES_AND_LIMIT";

export type NoteMode =
  | "APPEND"
  | "REPLACE"
  | "CLEAR";

export interface ChecklistTask {
  id: string;
  text: string;
  category: TaskCategory;
  completed: boolean;
  required: boolean;
  notes: string[];
}

export interface ChecklistTaskInput {
  text: string;
  category?: TaskCategory;
  required?: boolean;
}

export interface ApplicationContextInput {
  applicationPurpose?: string;
  businessProcess?: string;
  applicationOwner?: string;
  technicalOwner?: string;
  applicationContacts?: string[];
  integrations?: string[];
  identityTypes?: string[];
  hostingDetails?: string;
  dataClassification?: string;
  financialRelevance?: string;
}

export interface ComplianceControl {
  id: string;
  name: string;
  framework: Framework;

  homeworkStatus: HomeworkStatus;
  stage: WorkflowStage;

  controlStatus: ControlStatus;
  checklistStatus: ChecklistStatus;

  controlObjective: string;
  controlRisk: string;
  applicabilityRationale: string;
  evidenceStrategy: string;
  argosObjective: string;

  notes: string[];
  nextTasks: ChecklistTask[];

  checklistChangeLog: ChecklistChangeLogEntry[];
  progressSummary: string;
  qaScore: QaScoreLevel;
  qaScoreRationale: string;
}

export interface Application {
  id: string;
  name: string;
  hosting: string;

  applicationPurpose: string;
  businessProcess: string;
  applicationOwner: string;
  technicalOwner: string;
  applicationContacts: string[];
  integrations: string[];
  identityTypes: string[];
  hostingDetails: string;
  dataClassification: string;
  financialRelevance: string;

  contextStatus: ApplicationContextStatus;

  controls: ComplianceControl[];
}

export type Command =
  | {
      action: "CREATE_APPLICATION";
      payload: {
        application: string;
        hosting: string;
        framework: Framework;
        controls: string[];
        context?: ApplicationContextInput;
      };
    }
  | {
      action: "UPDATE_APPLICATION_CONTEXT";
      payload: {
        application: string;
        context: ApplicationContextInput;
      };
    }
  | {
      action: "RENAME_APPLICATION";
      payload: {
        application: string;
        newName: string;
      };
    }
  | {
      action: "ADD_CONTROL";
      payload: {
        application: string;
        control: string;
        framework: Framework;

        controlObjective?: string;
        controlRisk?: string;
        applicabilityRationale?: string;
        evidenceStrategy?: string;
        argosObjective?: string;

        tasks?: ChecklistTaskInput[];
      };
    }
  | {
      action: "REGENERATE_CONTROL_CHECKLIST";
      payload: {
        application: string;
        control: string;

        controlObjective?: string;
        controlRisk?: string;
        applicabilityRationale?: string;
        evidenceStrategy?: string;
        argosObjective?: string;

        tasks: ChecklistTaskInput[];
      };
    }
  | {
      action: "GENERATE_CONTEXTUAL_CHECKLISTS";
      payload: {
        application: string;

        controls: Array<{
          control: string;
          controlObjective: string;
          controlRisk: string;
          applicabilityRationale: string;
          evidenceStrategy: string;
          argosObjective: string;
          tasks: ChecklistTaskInput[];
        }>;
      };
    }
  | {
      action: "UPDATE_HOMEWORK";
      payload: {
        application: string;
        control: string;
        status: HomeworkStatus;
      };
    }
  | {
      action: "UPDATE_CONTROL_WORK";
      payload: {
        application: string;
        control: string;

        homeworkStatus?: HomeworkStatus;
        stage?: WorkflowStage;
        controlStatus?: ControlStatus;

        note?: string;
        nextTasks?: ChecklistTaskInput[];
      };
    }
  | {
      action: "UPDATE_ALL_CONTROLS";
      payload: {
        application: string;

        homeworkStatus?: HomeworkStatus;
        stage?: WorkflowStage;
        controlStatus?: ControlStatus;

        noteMode?: NoteMode;
        notes?: string[];

        checklistMode?: ChecklistMode;
        checklistStatus?: ChecklistStatus;
        tasks?: ChecklistTaskInput[];
        maxItems?: number;
      };
    }
  | {
      action: "UPDATE_NOTES";
      payload: {
        application: string;
        control: string;
        mode: NoteMode;
        notes?: string[];
      };
    }
  | {
      action: "UPDATE_CHECKLIST";
      payload: {
        application: string;
        control: string;
        mode: ChecklistMode;
        checklistStatus?: ChecklistStatus;
        tasks?: ChecklistTaskInput[];
        maxItems?: number;
      };
    }
  | {
      action: "UPDATE_TASK_NOTES";
      payload: {
        application: string;
        control: string;
        taskText: string;
        note: string;

        addTasks?: ChecklistTaskInput[];
        removeTaskTexts?: string[];

        changeLogEntries?: Array<{
          changeType: ChecklistChangeType;
          taskText: string;
          reason: string;
        }>;

        progressSummary?: string;
        qaScore?: QaScoreLevel;
        qaScoreRationale?: string;
      };
    }
  | {
      action: "UPDATE_CHECKLIST_STATUS";
      payload: {
        application: string;
        control: string;
        checklistStatus: ChecklistStatus;
      };
    }
  | {
      action: "UPDATE_CONTROL_STATUS";
      payload: {
        application: string;
        control: string;
        controlStatus: ControlStatus;
      };
    }
  | {
      action: "DELETE_APPLICATION";
      payload: {
        application: string;
        confirmed: boolean;
      };
    }
  | {
      action: "DELETE_ALL_APPLICATIONS";
      payload: {
        confirmed: boolean;
      };
    }
  | {
      action: "CLEAR_CHAT_HISTORY";
      payload: Record<string, never>;
    }
  | {
      action: "EXPORT_PROGRESS_REPORT";
      payload: {
        message?: string;
      };
    }
  | {
      action: "BACKUP_APPLICATION_DATA";
      payload: {
        message?: string;
      };
    }
  | {
      action: "LIST_BACKUPS";
      payload: {
        message?: string;
      };
    }
  | {
      action: "ROLLBACK_BACKUP";
      payload: {
        version: number;
        confirmed: boolean;
      };
    }
  | {
      action: "RESPOND_ONLY";
      payload: {
        message: string;
      };
    };

interface CommandResult {
  applications: Application[];
  message: string;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function normalizeApplicationId(
  value: string
): string {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  // Only a bare number or an explicit "app"/"application" reference
  // becomes an APP-NN identifier. Any other text is a user-supplied
  // application name and is preserved as given (e.g. "cricket" stays
  // "cricket" instead of collapsing into a numbered identifier).
  const numberedMatch =
    rawValue.match(
      /^(?:app|application)[\s\-_]*(\d+)$/i
    ) || rawValue.match(/^(\d+)$/);

  if (numberedMatch) {
    return `APP-${numberedMatch[1].padStart(
      2,
      "0"
    )}`;
  }

  return rawValue;
}

function nextAvailableApplicationId(
  applications: Application[]
): string {
  const usedNumbers = new Set(
    applications
      .map((application) =>
        application.id.match(/^APP-(\d+)$/i)
      )
      .filter(
        (match): match is RegExpMatchArray =>
          Boolean(match)
      )
      .map((match) => Number(match[1]))
  );

  let candidate = 1;

  while (usedNumbers.has(candidate)) {
    candidate += 1;
  }

  return `APP-${String(candidate).padStart(
    2,
    "0"
  )}`;
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function cleanStringList(values: string[]): string[] {
  const uniqueValues = new Map<string, string>();

  for (const value of values) {
    const cleanedValue = String(value ?? "").trim();

    if (!cleanedValue) {
      continue;
    }

    const normalizedValue = normalizeText(cleanedValue);

    if (
      normalizedValue &&
      !uniqueValues.has(normalizedValue)
    ) {
      uniqueValues.set(
        normalizedValue,
        cleanedValue
      );
    }
  }

  return Array.from(uniqueValues.values());
}

function findApplication(
  applications: Application[],
  applicationName: string
): Application | undefined {
  const normalizedTarget =
    normalizeApplicationId(applicationName);

  if (!normalizedTarget) {
    return undefined;
  }

  const targetKey = normalizedTarget.toLowerCase();

  return applications.find((application) => {
    return (
      normalizeApplicationId(
        application.id
      ).toLowerCase() === targetKey ||
      normalizeApplicationId(
        application.name
      ).toLowerCase() === targetKey
    );
  });
}

function findControl(
  controls: ComplianceControl[],
  controlName: string
): ComplianceControl | undefined {
  const normalizedTarget =
    normalizeText(controlName);

  if (!normalizedTarget) {
    return undefined;
  }

  const exactMatch = controls.find(
    (control) =>
      normalizeText(control.name) ===
      normalizedTarget
  );

  if (exactMatch) {
    return exactMatch;
  }

  return controls.find((control) => {
    const normalizedControl =
      normalizeText(control.name);

    return (
      normalizedControl.includes(
        normalizedTarget
      ) ||
      normalizedTarget.includes(
        normalizedControl
      )
    );
  });
}

function findChecklistTask(
  tasks: ChecklistTask[],
  taskText: string
): ChecklistTask | undefined {
  const normalizedTarget =
    normalizeText(taskText);

  if (!normalizedTarget) {
    return undefined;
  }

  const exactMatch = tasks.find(
    (task) =>
      normalizeText(task.text) ===
      normalizedTarget
  );

  if (exactMatch) {
    return exactMatch;
  }

  return tasks.find((task) => {
    const normalizedTask = normalizeText(
      task.text
    );

    return (
      normalizedTask.includes(
        normalizedTarget
      ) ||
      normalizedTarget.includes(normalizedTask)
    );
  });
}

export function deriveApplicationContextStatus(
  application: Pick<
    Application,
    | "applicationPurpose"
    | "businessProcess"
    | "applicationOwner"
    | "technicalOwner"
    | "applicationContacts"
    | "integrations"
    | "identityTypes"
    | "hostingDetails"
    | "financialRelevance"
  >
): ApplicationContextStatus {
  const primaryFields = [
    application.applicationPurpose,
    application.businessProcess,
    application.applicationOwner,
    application.technicalOwner,
    application.hostingDetails,
    application.financialRelevance,
  ];

  const completedPrimaryFields =
    primaryFields.filter(
      (value) => String(value ?? "").trim().length > 0
    ).length;

  const hasContacts =
    application.applicationContacts.length > 0;

  const hasIntegrations =
    application.integrations.length > 0;

  const hasIdentityContext =
    application.identityTypes.length > 0;

  const totalSignals =
    completedPrimaryFields +
    Number(hasContacts) +
    Number(hasIntegrations) +
    Number(hasIdentityContext);

  if (totalSignals === 0) {
    return "Missing";
  }

  if (
    completedPrimaryFields >= 4 &&
    hasContacts &&
    hasIdentityContext
  ) {
    return "Complete";
  }

  return "Partial";
}

export function inferTaskCategory(
  text: string
): TaskCategory {
  const normalizedText = normalizeText(text);

  if (
    normalizedText.includes("prior") ||
    normalizedText.includes("homework") ||
    normalizedText.includes("documentation") ||
    normalizedText.includes("control description") ||
    normalizedText.includes("previous evidence")
  ) {
    return "Homework";
  }

  if (
    normalizedText.includes("access") ||
    normalizedText.includes("permission") ||
    normalizedText.includes("credential") ||
    normalizedText.includes("server access") ||
    normalizedText.includes("database access") ||
    normalizedText.includes("read only")
  ) {
    return "Access";
  }

  if (
    normalizedText.includes("evidence") ||
    normalizedText.includes("report") ||
    normalizedText.includes("log") ||
    normalizedText.includes("population") ||
    normalizedText.includes("collect") ||
    normalizedText.includes("extract")
  ) {
    return "Evidence Collection";
  }

  if (
    normalizedText.includes("validate") ||
    normalizedText.includes("completeness") ||
    normalizedText.includes("accuracy") ||
    normalizedText.includes("retention") ||
    normalizedText.includes("frequency") ||
    normalizedText.includes("reconcile")
  ) {
    return "Validation";
  }

  if (
    normalizedText.includes("approval") ||
    normalizedText.includes("approve") ||
    normalizedText.includes("sign off") ||
    normalizedText.includes("owner confirmation")
  ) {
    return "Approval";
  }

  if (
    normalizedText.includes("argos") ||
    normalizedText.includes("monitoring logic") ||
    normalizedText.includes("exception criteria") ||
    normalizedText.includes("continuous monitoring") ||
    normalizedText.includes("objective rule")
  ) {
    return "Argos Design";
  }

  if (
    normalizedText.includes("follow up") ||
    normalizedText.includes("next step") ||
    normalizedText.includes("schedule") ||
    normalizedText.includes("dependency") ||
    normalizedText.includes("meeting")
  ) {
    return "Next Steps";
  }

  return "Discovery";
}

function createChecklistTask(
  input: ChecklistTaskInput
): ChecklistTask {
  const text = String(input.text ?? "").trim();

  return {
    id: createId("task"),
    text,
    category:
      input.category || inferTaskCategory(text),
    completed: false,
    required: input.required !== false,
    notes: [],
  };
}

function cleanChecklistTasks(
  tasks: ChecklistTask[]
): ChecklistTask[] {
  const uniqueTasks = new Map<
    string,
    ChecklistTask
  >();

  for (const task of tasks) {
    const text = String(task.text ?? "").trim();

    if (!text) {
      continue;
    }

    const normalizedTask = normalizeText(text);

    if (!uniqueTasks.has(normalizedTask)) {
      uniqueTasks.set(normalizedTask, {
        id: task.id || createId("task"),
        text,
        category:
          task.category ||
          inferTaskCategory(text),
        completed: task.completed === true,
        required: task.required !== false,
        notes: Array.isArray(task.notes)
          ? task.notes
              .map((note) => String(note ?? "").trim())
              .filter(Boolean)
          : [],
      });
    }
  }

  return Array.from(uniqueTasks.values());
}

function convertTaskInputs(
  tasks: ChecklistTaskInput[]
): ChecklistTask[] {
  return cleanChecklistTasks(
    tasks
      .filter((task) =>
        Boolean(String(task.text ?? "").trim())
      )
      .map(createChecklistTask)
  );
}

function applyNoteUpdate(
  existingNotes: string[],
  mode: NoteMode,
  requestedNotes: string[]
): string[] {
  const cleanedNotes = requestedNotes
    .map((note) => String(note ?? "").trim())
    .filter(Boolean);

  if (mode === "CLEAR") {
    return [];
  }

  if (mode === "REPLACE") {
    return cleanedNotes;
  }

  return [...existingNotes, ...cleanedNotes];
}

function applyChecklistUpdate(
  existingTasks: ChecklistTask[],
  mode: ChecklistMode,
  requestedTasks: ChecklistTaskInput[],
  maxItems = 5
): ChecklistTask[] {
  const safeExistingTasks =
    cleanChecklistTasks(existingTasks);

  const newTasks =
    convertTaskInputs(requestedTasks);

  if (mode === "REPLACE") {
    return newTasks;
  }

  if (
    mode ===
    "REMOVE_DUPLICATES_AND_LIMIT"
  ) {
    const sourceTasks =
      newTasks.length > 0
        ? newTasks
        : safeExistingTasks;

    const safeMaximum = Math.min(
      Math.max(maxItems, 1),
      30
    );

    return cleanChecklistTasks(sourceTasks).slice(
      0,
      safeMaximum
    );
  }

  return cleanChecklistTasks([
    ...safeExistingTasks,
    ...newTasks,
  ]);
}

export function deriveWorkflowStage(
  tasks: ChecklistTask[],
  controlStatus: ControlStatus
): WorkflowStage {
  if (controlStatus === "Completed") {
    return "Completed";
  }

  const requiredTasks = tasks.filter(
    (task) => task.required
  );

  const completedRequiredTasks =
    requiredTasks.filter(
      (task) => task.completed
    );

  if (completedRequiredTasks.length === 0) {
    return "Homework";
  }

  if (
    requiredTasks.length > 0 &&
    completedRequiredTasks.length ===
      requiredTasks.length
  ) {
    return "Review";
  }

  const evidenceWorkStarted = tasks.some(
    (task) =>
      task.completed &&
      (task.category ===
        "Evidence Collection" ||
        task.category === "Validation")
  );

  if (evidenceWorkStarted) {
    return "Evidence Collection";
  }

  return "Discovery";
}

export function deriveControlStatus(
  control: ComplianceControl
): ControlStatus {
  if (
    control.controlStatus === "Completed" ||
    control.controlStatus === "On Hold"
  ) {
    return control.controlStatus;
  }

  if (
    control.checklistStatus ===
      "Review Pending" ||
    control.checklistStatus ===
      "Needs Revision"
  ) {
    return "Checklist Review Pending";
  }

  const requiredTasks =
    control.nextTasks.filter(
      (task) => task.required
    );

  const completedRequiredTasks =
    requiredTasks.filter(
      (task) => task.completed
    );

  if (
    requiredTasks.length > 0 &&
    completedRequiredTasks.length ===
      requiredTasks.length
  ) {
    return "Ready for Review";
  }

  if (
    completedRequiredTasks.length > 0 ||
    control.checklistStatus === "Approved"
  ) {
    return "In Progress";
  }

  return "New";
}

export function refreshControlState(
  control: ComplianceControl
): ComplianceControl {
  const initialControl: ComplianceControl = {
    ...control,
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
    nextTasks: cleanChecklistTasks(
      Array.isArray(control.nextTasks)
        ? control.nextTasks
        : []
    ),
    checklistChangeLog: Array.isArray(
      control.checklistChangeLog
    )
      ? control.checklistChangeLog
      : [],
    progressSummary:
      control.progressSummary || "",
    qaScore:
      control.qaScore || "Not Started",
    qaScoreRationale:
      control.qaScoreRationale || "",
  };

  const requiredTasks =
    initialControl.nextTasks.filter(
      (task) => task.required
    );

  const allRequiredTasksCompleted =
    requiredTasks.length > 0 &&
    requiredTasks.every(
      (task) => task.completed
    );

  const checklistStatus =
    allRequiredTasksCompleted
      ? "Completed"
      : initialControl.checklistStatus;

  const controlWithChecklistStatus = {
    ...initialControl,
    checklistStatus,
  };

  const controlStatus =
    deriveControlStatus(
      controlWithChecklistStatus
    );

  return {
    ...controlWithChecklistStatus,
    controlStatus,
    stage: deriveWorkflowStage(
      controlWithChecklistStatus.nextTasks,
      controlStatus
    ),
  };
}

function getDefaultControlKnowledge(
  controlName: string
): Pick<
  ComplianceControl,
  | "controlObjective"
  | "controlRisk"
  | "applicabilityRationale"
  | "evidenceStrategy"
  | "argosObjective"
> {
  const control = normalizeText(controlName);

  if (
    control.includes("user access") ||
    control.includes("access control")
  ) {
    return {
      controlObjective:
        "Ensure access to the application and financially relevant functions is authorized, appropriate, and periodically reviewed.",
      controlRisk:
        "Unauthorized, excessive, stale, or unowned human and non-human identities may access or modify financially relevant data or transactions.",
      applicabilityRationale:
        "This control applies when application access can affect financial reporting, transaction processing, configuration, approvals, or sensitive data.",
      evidenceStrategy:
        "Use authoritative identity, group, role, entitlement, provisioning, deprovisioning, service-account, service-principal, API-key, and authentication data rather than screenshots.",
      argosObjective:
        "Identify unauthorized access, stale identities, orphaned accounts, unapproved privileged access, unowned non-human identities, and incomplete access reviews.",
    };
  }

  if (control.includes("change")) {
    return {
      controlObjective:
        "Ensure application and configuration changes are authorized, tested, approved, and appropriately deployed.",
      controlRisk:
        "Unauthorized or inadequately tested changes may alter financial calculations, data processing, access, interfaces, or reporting.",
      applicabilityRationale:
        "This control applies when changes to code, configuration, workflows, integrations, or infrastructure can affect financially relevant processing.",
      evidenceStrategy:
        "Use authoritative ticket, source-control, approval, test, deployment, configuration, and production-change records.",
      argosObjective:
        "Detect production changes without approved requests, required testing, segregation, or deployment authorization.",
    };
  }

  if (
    control.includes("segregation") ||
    control.includes("sod")
  ) {
    return {
      controlObjective:
        "Prevent incompatible access combinations and ensure critical activities are appropriately segregated.",
      controlRisk:
        "A single user or identity may initiate, approve, modify, and complete conflicting financially relevant activities without independent oversight.",
      applicabilityRationale:
        "This control applies where application roles or permissions support conflicting transaction, approval, administration, or reporting activities.",
      evidenceStrategy:
        "Use authoritative role, entitlement, group, transaction, workflow, approval, and identity data.",
      argosObjective:
        "Continuously identify conflicting role combinations, self-approval, unauthorized overrides, and unapproved segregation exceptions.",
    };
  }

  if (
    control.includes("monitor") ||
    control.includes("logging")
  ) {
    return {
      controlObjective:
        "Ensure relevant security, administrative, transaction, and configuration events are logged, retained, monitored, and investigated.",
      controlRisk:
        "Critical changes, unauthorized activity, failed controls, or suspicious access may occur without timely detection or sufficient audit evidence.",
      applicabilityRationale:
        "This control applies when logs are necessary to demonstrate accountability, detect exceptions, investigate activity, or support financial-control evidence.",
      evidenceStrategy:
        "Use direct log feeds, event APIs, SIEM data, audit tables, alert records, retention settings, and monitoring configuration.",
      argosObjective:
        "Identify missing logs, disabled integrations, retention gaps, monitoring failures, unreviewed alerts, and control-relevant exceptions.",
    };
  }

  if (
    control.includes("backup") ||
    control.includes("recovery")
  ) {
    return {
      controlObjective:
        "Ensure financially relevant systems and data can be recovered completely and within approved recovery requirements.",
      controlRisk:
        "Data loss, failed backups, untested recovery, or incomplete restoration may disrupt financial processing or reporting.",
      applicabilityRationale:
        "This control applies when loss or corruption of application data could affect financial transactions, reporting, interfaces, or audit evidence.",
      evidenceStrategy:
        "Use backup-platform logs, job results, retention configuration, recovery-test records, restore evidence, and exception tickets.",
      argosObjective:
        "Identify failed or missing backups, retention deviations, overdue recovery testing, unresolved failures, and systems outside backup coverage.",
    };
  }

  return {
    controlObjective:
      "Ensure the control operates effectively and addresses the relevant financial-reporting and technology risk.",
    controlRisk:
      "Inadequate design or operation may allow unauthorized, incomplete, inaccurate, or unmonitored activity to affect financially relevant processing.",
    applicabilityRationale:
      "The control applies when the application supports financial reporting, transaction processing, data integrity, approvals, security, or technology operations.",
    evidenceStrategy:
      "Use authoritative system-generated data, direct logs, APIs, databases, configuration records, identity sources, tickets, and approval records rather than screenshots.",
    argosObjective:
      "Translate the control into objective, repeatable monitoring logic with defined data sources, frequency, ownership, and exception criteria.",
  };
}

function generateDefaultTasks(
  application: Pick<
    Application,
    | "hosting"
    | "contextStatus"
    | "applicationPurpose"
    | "businessProcess"
    | "integrations"
    | "identityTypes"
  >,
  controlName: string
): ChecklistTask[] {
  const hosting =
    normalizeText(application.hosting);

  const control =
    normalizeText(controlName);

  const tasks: ChecklistTaskInput[] = [
    {
      text: "Review prior-season evidence, the control description, application documentation, previously submitted reports, and known audit questions",
      category: "Homework",
      required: true,
    },
    {
      text: "Confirm why this control applies to the application and identify the financial-reporting or technology risk it addresses",
      category: "Discovery",
      required: true,
    },
    {
      text: "Meet with the application team and confirm the application purpose, business process, architecture, ownership, hosting, integrations, and control operation",
      category: "Discovery",
      required: true,
    },
    {
      text: "Identify the authoritative system-generated evidence, source systems, required data fields, evidence owner, frequency, and retention",
      category: "Evidence Collection",
      required: true,
    },
    {
      text: "Determine the read-only access method for relevant logs, APIs, databases, identity sources, configuration records, tickets, and reports",
      category: "Access",
      required: true,
    },
    {
      text: "Define objective Argos monitoring logic, data-source mapping, monitoring frequency, ownership, and exception criteria",
      category: "Argos Design",
      required: true,
    },
  ];

  if (application.contextStatus !== "Complete") {
    tasks.unshift({
      text: "Complete the missing application context, including purpose, business process, owners, contacts, hosting, integrations, financial relevance, and identity types",
      category: "Homework",
      required: true,
    });
  }

  if (
    hosting.includes("onprem") ||
    hosting.includes("server") ||
    hosting.includes("linux") ||
    hosting.includes("windows")
  ) {
    tasks.push({
      text: "Identify supporting servers, operating systems, databases, service identities, scheduled jobs, and required read-only access",
      category: "Access",
      required: true,
    });
  }

  if (
    hosting.includes("cloud") ||
    hosting.includes("saas") ||
    hosting.includes("paas") ||
    hosting.includes("iaas") ||
    application.integrations.length > 0
  ) {
    tasks.push({
      text: "Identify tenants, subscriptions, APIs, integration identities, service principals, secrets, certificates, tokens, cloud logs, and configuration sources",
      category: "Discovery",
      required: true,
    });
  }

  if (
    control.includes("access") ||
    control.includes("identity") ||
    control.includes("privileged") ||
    control.includes("segregation")
  ) {
    tasks.push(
      {
        text: "Inventory all identity types, including users, administrators, emergency accounts, shared accounts, generic accounts, service accounts, service principals, API keys, tokens, certificates, secrets, integration identities, and third-party accounts",
        category: "Discovery",
        required: true,
      },
      {
        text: "Determine the count, owner, purpose, approval, credential-management method, last-used date, and review status for each non-human identity",
        category: "Validation",
        required: true,
      },
      {
        text: "Identify authoritative sources for provisioning, modification, termination, deprovisioning, role assignment, group membership, and access-review completeness",
        category: "Evidence Collection",
        required: true,
      },
      {
        text: "Validate whether dormant, orphaned, terminated, excessive, conflicting, or unowned access can be identified from authoritative data",
        category: "Validation",
        required: true,
      }
    );
  }

  if (
    control.includes("change") ||
    control.includes("deployment") ||
    control.includes("release")
  ) {
    tasks.push(
      {
        text: "Identify systems containing change requests, approvals, testing results, source-control activity, deployment records, emergency changes, and production configuration history",
        category: "Evidence Collection",
        required: true,
      },
      {
        text: "Validate that production changes can be reconciled to approved requests and that unauthorized or untested changes can be objectively identified",
        category: "Validation",
        required: true,
      }
    );
  }

  if (
    control.includes("log") ||
    control.includes("monitor") ||
    control.includes("siem")
  ) {
    tasks.push({
      text: "Identify required logs, integration status, collection coverage, retention period, monitoring frequency, alert ownership, review evidence, and unresolved exceptions",
      category: "Evidence Collection",
      required: true,
    });
  }

  return convertTaskInputs(tasks);
}

function createControl(
  name: string,
  framework: Framework,
  application: Application
): ComplianceControl {
  const knowledge =
    getDefaultControlKnowledge(name);

  return {
    id: createId("control"),
    name,
    framework,

    homeworkStatus: "Waiting",
    stage: "Homework",

    controlStatus: "New",
    checklistStatus: "Review Pending",

    ...knowledge,

    notes: [],
    nextTasks: generateDefaultTasks(
      application,
      name
    ),

    checklistChangeLog: [],
    progressSummary:
      "No work notes captured yet.",
    qaScore: "Not Started",
    qaScoreRationale:
      "No work notes have been added against this control's checklist yet.",
  };
}

function createEmptyApplication(
  applicationId: string,
  hosting: string,
  context?: ApplicationContextInput
): Application {
  const application: Application = {
    id: applicationId,
    name: applicationId,
    hosting: hosting || "Unknown",

    applicationPurpose:
      context?.applicationPurpose?.trim() || "",
    businessProcess:
      context?.businessProcess?.trim() || "",
    applicationOwner:
      context?.applicationOwner?.trim() || "",
    technicalOwner:
      context?.technicalOwner?.trim() || "",

    applicationContacts: cleanStringList(
      context?.applicationContacts || []
    ),

    integrations: cleanStringList(
      context?.integrations || []
    ),

    identityTypes: cleanStringList(
      context?.identityTypes || []
    ),

    hostingDetails:
      context?.hostingDetails?.trim() || "",

    dataClassification:
      context?.dataClassification?.trim() || "",

    financialRelevance:
      context?.financialRelevance?.trim() || "",

    contextStatus: "Missing",
    controls: [],
  };

  return {
    ...application,
    contextStatus:
      deriveApplicationContextStatus(application),
  };
}

export function updateApplicationContextValues(
  application: Application,
  context: ApplicationContextInput
): Application {
  const updatedApplication: Application = {
    ...application,

    applicationPurpose:
      context.applicationPurpose !== undefined
        ? context.applicationPurpose.trim()
        : application.applicationPurpose,

    businessProcess:
      context.businessProcess !== undefined
        ? context.businessProcess.trim()
        : application.businessProcess,

    applicationOwner:
      context.applicationOwner !== undefined
        ? context.applicationOwner.trim()
        : application.applicationOwner,

    technicalOwner:
      context.technicalOwner !== undefined
        ? context.technicalOwner.trim()
        : application.technicalOwner,

    applicationContacts:
      context.applicationContacts !== undefined
        ? cleanStringList(
            context.applicationContacts
          )
        : application.applicationContacts,

    integrations:
      context.integrations !== undefined
        ? cleanStringList(
            context.integrations
          )
        : application.integrations,

    identityTypes:
      context.identityTypes !== undefined
        ? cleanStringList(
            context.identityTypes
          )
        : application.identityTypes,

    hostingDetails:
      context.hostingDetails !== undefined
        ? context.hostingDetails.trim()
        : application.hostingDetails,

    dataClassification:
      context.dataClassification !== undefined
        ? context.dataClassification.trim()
        : application.dataClassification,

    financialRelevance:
      context.financialRelevance !== undefined
        ? context.financialRelevance.trim()
        : application.financialRelevance,
  };

  return {
    ...updatedApplication,
    contextStatus:
      deriveApplicationContextStatus(
        updatedApplication
      ),
  };
}

export function executeCommand(
  command: Command,
  currentApplications: Application[]
): CommandResult {
  if (command.action === "RESPOND_ONLY") {
    return {
      applications: currentApplications,
      message:
        String(
          command.payload.message ?? ""
        ).trim() ||
        "No application data was changed.",
    };
  }

  if (
    command.action ===
    "CLEAR_CHAT_HISTORY"
  ) {
    return {
      applications: currentApplications,
      message: "",
    };
  }

  if (
    command.action ===
    "EXPORT_PROGRESS_REPORT"
  ) {
    return {
      applications: currentApplications,
      message:
        String(
          command.payload.message ?? ""
        ).trim() ||
        "The executive progress report was generated.",
    };
  }

  if (
    command.action ===
    "BACKUP_APPLICATION_DATA"
  ) {
    return {
      applications: currentApplications,
      message:
        String(
          command.payload.message ?? ""
        ).trim() ||
        "A full backup of Work Governor data was generated.",
    };
  }

  if (command.action === "LIST_BACKUPS") {
    return {
      applications: currentApplications,
      message: "",
    };
  }

  if (
    command.action === "ROLLBACK_BACKUP"
  ) {
    return {
      applications: currentApplications,
      message: "",
    };
  }

  if (
    command.action ===
    "DELETE_APPLICATION"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    if (!application) {
      return {
        applications: currentApplications,
        message: `${applicationId} was not found.`,
      };
    }

    if (!command.payload.confirmed) {
      return {
        applications: currentApplications,
        message: `Please confirm deletion by saying "yes, delete ${application.id}".`,
      };
    }

    return {
      applications:
        currentApplications.filter(
          (currentApplication) =>
            currentApplication.id !==
            application.id
        ),
      message: `${application.id} was deleted.`,
    };
  }

  if (
    command.action ===
    "DELETE_ALL_APPLICATIONS"
  ) {
    if (!command.payload.confirmed) {
      return {
        applications: currentApplications,
        message:
          'Deleting all applications requires confirmation. Say "yes, delete all applications" to proceed.',
      };
    }

    return {
      applications: [],
      message: "All applications were deleted.",
    };
  }

  if (
    command.action ===
    "CREATE_APPLICATION"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      ) ||
      nextAvailableApplicationId(
        currentApplications
      );

    if (
      findApplication(
        currentApplications,
        applicationId
      )
    ) {
      return {
        applications: currentApplications,
        message: `${applicationId} already exists.`,
      };
    }

    const controlNames = cleanStringList(
      command.payload.controls
    );

    if (controlNames.length === 0) {
      return {
        applications: currentApplications,
        message:
          "No valid controls were provided.",
      };
    }

    const baseApplication =
      createEmptyApplication(
        applicationId,
        command.payload.hosting,
        command.payload.context
      );

    const application: Application = {
      ...baseApplication,
      controls: controlNames.map((controlName) =>
        createControl(
          controlName,
          command.payload.framework || "SOX",
          baseApplication
        )
      ),
    };

    const contextMessage =
      application.contextStatus === "Missing"
        ? " Application context is missing, so the initial checklists are preliminary."
        : application.contextStatus === "Partial"
          ? " Application context is partial, so the checklists should be reviewed and refined."
          : " Application context is available and was used for the initial checklists.";

    return {
      applications: [
        ...currentApplications,
        application,
      ],
      message: `${applicationId} was created with ${controlNames.length} controls.${contextMessage}`,
    };
  }

  if (
    command.action ===
    "UPDATE_APPLICATION_CONTEXT"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    if (!application) {
      return {
        applications: currentApplications,
        message: `${applicationId} was not found.`,
      };
    }

    const updatedApplications =
      currentApplications.map(
        (currentApplication) => {
          if (
            currentApplication.id !==
            application.id
          ) {
            return currentApplication;
          }

          const updatedApplication =
            updateApplicationContextValues(
              currentApplication,
              command.payload.context
            );

          return {
            ...updatedApplication,
            controls:
              updatedApplication.controls.map(
                (control): ComplianceControl => ({
                  ...control,
                  checklistStatus:
                    control.checklistStatus ===
                    "Completed"
                      ? "Completed"
                      : "Review Pending",
                  controlStatus:
                    control.controlStatus ===
                    "Completed"
                      ? "Completed"
                      : "Checklist Review Pending",
                })
              ),
          };
        }
      );

    const updatedApplication =
      findApplication(
        updatedApplications,
        applicationId
      );

    return {
      applications: updatedApplications,
      message: `${applicationId} context was updated. Context status is ${updatedApplication?.contextStatus ?? "Partial"}. Regenerate the contextual checklists to apply the new context.`,
    };
  }

  if (
    command.action ===
    "RENAME_APPLICATION"
  ) {
    const application = findApplication(
      currentApplications,
      command.payload.application
    );

    if (!application) {
      return {
        applications: currentApplications,
        message: `${command.payload.application} was not found.`,
      };
    }

    const newApplicationId =
      normalizeApplicationId(
        command.payload.newName
      );

    if (!newApplicationId) {
      return {
        applications: currentApplications,
        message:
          "Please provide a valid new application name.",
      };
    }

    const conflictingApplication =
      findApplication(
        currentApplications,
        newApplicationId
      );

    if (
      conflictingApplication &&
      conflictingApplication.id !==
        application.id
    ) {
      return {
        applications: currentApplications,
        message: `${newApplicationId} already exists.`,
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                id: newApplicationId,
                name: newApplicationId,
              }
            : currentApplication
      ),
      message: `${application.id} was renamed to ${newApplicationId}.`,
    };
  }

  if (command.action === "ADD_CONTROL") {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    if (!application) {
      return {
        applications: currentApplications,
        message: `${applicationId} was not found.`,
      };
    }

    const controlName = String(
      command.payload.control ?? ""
    ).trim();

    if (
      !controlName ||
      findControl(
        application.controls,
        controlName
      )
    ) {
      return {
        applications: currentApplications,
        message: `${controlName || "The control"} already exists or is invalid.`,
      };
    }

    const defaultControl =
      createControl(
        controlName,
        command.payload.framework || "SOX",
        application
      );

    const newControl =
      refreshControlState({
        ...defaultControl,

        controlObjective:
          command.payload.controlObjective ||
          defaultControl.controlObjective,

        controlRisk:
          command.payload.controlRisk ||
          defaultControl.controlRisk,

        applicabilityRationale:
          command.payload
            .applicabilityRationale ||
          defaultControl.applicabilityRationale,

        evidenceStrategy:
          command.payload.evidenceStrategy ||
          defaultControl.evidenceStrategy,

        argosObjective:
          command.payload.argosObjective ||
          defaultControl.argosObjective,

        nextTasks:
          command.payload.tasks &&
          command.payload.tasks.length > 0
            ? convertTaskInputs(
                command.payload.tasks
              )
            : defaultControl.nextTasks,
      });

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls: [
                  ...currentApplication.controls,
                  newControl,
                ],
              }
            : currentApplication
      ),
      message: `${controlName} was added to ${applicationId}. Its contextual checklist is pending review.`,
    };
  }

  if (
    command.action ===
    "REGENERATE_CONTROL_CHECKLIST"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? refreshControlState({
                            ...currentControl,

                            controlObjective:
                              command.payload
                                .controlObjective ||
                              currentControl.controlObjective,

                            controlRisk:
                              command.payload
                                .controlRisk ||
                              currentControl.controlRisk,

                            applicabilityRationale:
                              command.payload
                                .applicabilityRationale ||
                              currentControl.applicabilityRationale,

                            evidenceStrategy:
                              command.payload
                                .evidenceStrategy ||
                              currentControl.evidenceStrategy,

                            argosObjective:
                              command.payload
                                .argosObjective ||
                              currentControl.argosObjective,

                            checklistStatus:
                              "Review Pending",

                            controlStatus:
                              "Checklist Review Pending",

                            nextTasks:
                              convertTaskInputs(
                                command.payload.tasks
                              ),
                          })
                        : currentControl
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} contextual checklist was regenerated and is pending review.`,
    };
  }

  if (
    command.action ===
    "GENERATE_CONTEXTUAL_CHECKLISTS"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    if (!application) {
      return {
        applications: currentApplications,
        message: `${applicationId} was not found.`,
      };
    }

    const controlUpdates =
      command.payload.controls;

    const updatedApplications =
      currentApplications.map(
        (currentApplication) => {
          if (
            currentApplication.id !==
            application.id
          ) {
            return currentApplication;
          }

          return {
            ...currentApplication,

            controls:
              currentApplication.controls.map(
                (currentControl) => {
                  const update =
                    controlUpdates.find(
                      (candidate) =>
                        normalizeText(
                          candidate.control
                        ) ===
                          normalizeText(
                            currentControl.name
                          ) ||
                        normalizeText(
                          candidate.control
                        ).includes(
                          normalizeText(
                            currentControl.name
                          )
                        ) ||
                        normalizeText(
                          currentControl.name
                        ).includes(
                          normalizeText(
                            candidate.control
                          )
                        )
                    );

                  if (!update) {
                    return currentControl;
                  }

                  return refreshControlState({
                    ...currentControl,

                    controlObjective:
                      update.controlObjective,

                    controlRisk:
                      update.controlRisk,

                    applicabilityRationale:
                      update.applicabilityRationale,

                    evidenceStrategy:
                      update.evidenceStrategy,

                    argosObjective:
                      update.argosObjective,

                    checklistStatus:
                      "Review Pending",

                    controlStatus:
                      "Checklist Review Pending",

                    nextTasks:
                      convertTaskInputs(
                        update.tasks
                      ),
                  });
                }
              ),
          };
        }
      );

    return {
      applications: updatedApplications,
      message: `Contextual control objectives and checklists were generated for ${applicationId}. Review and approve each checklist before beginning formal work.`,
    };
  }

  if (
    command.action ===
    "UPDATE_CHECKLIST_STATUS"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? refreshControlState({
                            ...currentControl,
                            checklistStatus:
                              command.payload
                                .checklistStatus,
                          })
                        : currentControl
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} checklist status was updated to ${command.payload.checklistStatus}.`,
    };
  }

  if (
    command.action ===
    "UPDATE_CONTROL_STATUS"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? refreshControlState({
                            ...currentControl,
                            controlStatus:
                              command.payload
                                .controlStatus,
                          })
                        : currentControl
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} control status was updated to ${command.payload.controlStatus}.`,
    };
  }

  if (
    command.action ===
    "UPDATE_ALL_CONTROLS"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    if (!application) {
      return {
        applications: currentApplications,
        message: `${applicationId} was not found.`,
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) => {
          if (
            currentApplication.id !==
            application.id
          ) {
            return currentApplication;
          }

          return {
            ...currentApplication,
            controls:
              currentApplication.controls.map(
                (control) =>
                  refreshControlState({
                    ...control,

                    homeworkStatus:
                      command.payload
                        .homeworkStatus ??
                      control.homeworkStatus,

                    stage:
                      command.payload.stage ??
                      control.stage,

                    controlStatus:
                      command.payload
                        .controlStatus ??
                      control.controlStatus,

                    checklistStatus:
                      command.payload
                        .checklistStatus ??
                      control.checklistStatus,

                    notes:
                      command.payload.noteMode
                        ? applyNoteUpdate(
                            control.notes,
                            command.payload
                              .noteMode,
                            command.payload.notes ??
                              []
                          )
                        : control.notes,

                    nextTasks:
                      command.payload
                        .checklistMode
                        ? applyChecklistUpdate(
                            control.nextTasks,
                            command.payload
                              .checklistMode,
                            command.payload.tasks ??
                              [],
                            command.payload
                              .maxItems ?? 5
                          )
                        : control.nextTasks,
                  })
              ),
          };
        }
      ),
      message: `All ${application.controls.length} controls in ${applicationId} were updated.`,
    };
  }

  if (
    command.action ===
    "UPDATE_HOMEWORK"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? refreshControlState({
                            ...currentControl,
                            homeworkStatus:
                              command.payload.status,
                          })
                        : currentControl
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} homework was updated to ${command.payload.status}.`,
    };
  }

  if (
    command.action ===
    "UPDATE_CONTROL_WORK"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) => {
                      if (
                        currentControl.id !==
                        control.id
                      ) {
                        return currentControl;
                      }

                      return refreshControlState({
                        ...currentControl,

                        homeworkStatus:
                          command.payload
                            .homeworkStatus ??
                          currentControl.homeworkStatus,

                        stage:
                          command.payload.stage ??
                          currentControl.stage,

                        controlStatus:
                          command.payload
                            .controlStatus ??
                          currentControl.controlStatus,

                        notes:
                          command.payload.note
                            ? [
                                ...currentControl.notes,
                                command.payload.note.trim(),
                              ]
                            : currentControl.notes,

                        nextTasks:
                          command.payload.nextTasks
                            ? applyChecklistUpdate(
                                currentControl.nextTasks,
                                "APPEND",
                                command.payload
                                  .nextTasks
                              )
                            : currentControl.nextTasks,
                      });
                    }
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} was updated for ${applicationId}.`,
    };
  }

  if (
    command.action === "UPDATE_NOTES"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? refreshControlState({
                            ...currentControl,
                            notes: applyNoteUpdate(
                              currentControl.notes,
                              command.payload.mode,
                              command.payload.notes ||
                                []
                            ),
                          })
                        : currentControl
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} work notes were updated.`,
    };
  }

  if (
    command.action ===
    "UPDATE_CHECKLIST"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    return {
      applications: currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? refreshControlState({
                            ...currentControl,

                            checklistStatus:
                              command.payload
                                .checklistStatus ??
                              (command.payload.mode ===
                              "REPLACE"
                                ? "Review Pending"
                                : currentControl.checklistStatus),

                            nextTasks:
                              applyChecklistUpdate(
                                currentControl.nextTasks,
                                command.payload.mode,
                                command.payload.tasks ||
                                  [],
                                command.payload
                                  .maxItems ?? 5
                              ),
                          })
                        : currentControl
                  ),
              }
            : currentApplication
      ),
      message: `${control.name} checklist was updated.`,
    };
  }

  if (
    command.action ===
    "UPDATE_TASK_NOTES"
  ) {
    const applicationId =
      normalizeApplicationId(
        command.payload.application
      );

    const application = findApplication(
      currentApplications,
      applicationId
    );

    const control = application
      ? findControl(
          application.controls,
          command.payload.control
        )
      : undefined;

    if (!application || !control) {
      return {
        applications: currentApplications,
        message:
          "The requested application or control was not found.",
      };
    }

    const targetTask = findChecklistTask(
      control.nextTasks,
      command.payload.taskText
    );

    if (!targetTask) {
      return {
        applications: currentApplications,
        message: `The checklist item "${command.payload.taskText}" was not found on ${control.name}.`,
      };
    }

    const noteText = String(
      command.payload.note ?? ""
    ).trim();

    const tasksWithNote =
      control.nextTasks.map((task) =>
        task.id === targetTask.id
          ? {
              ...task,
              notes: noteText
                ? [...task.notes, noteText]
                : task.notes,
            }
          : task
      );

    const removeTaskTexts =
      command.payload.removeTaskTexts ??
      [];

    const removedTasks: ChecklistTask[] =
      [];

    const tasksAfterRemoval =
      tasksWithNote.filter((task) => {
        const shouldRemove =
          removeTaskTexts.some(
            (text) =>
              normalizeText(text) ===
              normalizeText(task.text)
          );

        if (shouldRemove) {
          removedTasks.push(task);
        }

        return !shouldRemove;
      });

    const newTasks = convertTaskInputs(
      command.payload.addTasks ?? []
    );

    const finalTasks = cleanChecklistTasks(
      [...tasksAfterRemoval, ...newTasks]
    );

    const changeLogEntries = (
      command.payload.changeLogEntries ??
      []
    ).map((entry) => ({
      id: createId("log"),
      timestamp: new Date().toISOString(),
      changeType: entry.changeType,
      taskText: entry.taskText,
      reason: String(
        entry.reason ?? ""
      ).trim(),
    }));

    const updatedControl =
      refreshControlState({
        ...control,
        nextTasks: finalTasks,
        checklistChangeLog: [
          ...control.checklistChangeLog,
          ...changeLogEntries,
        ],
        progressSummary:
          command.payload
            .progressSummary ??
          control.progressSummary,
        qaScore:
          command.payload.qaScore ??
          control.qaScore,
        qaScoreRationale:
          command.payload
            .qaScoreRationale ??
          control.qaScoreRationale,
      });

    const updatedApplications =
      currentApplications.map(
        (currentApplication) =>
          currentApplication.id === application.id
            ? {
                ...currentApplication,
                controls:
                  currentApplication.controls.map(
                    (currentControl) =>
                      currentControl.id === control.id
                        ? updatedControl
                        : currentControl
                  ),
              }
            : currentApplication
      );

    const changeSummaryParts: string[] =
      [];

    if (newTasks.length > 0) {
      changeSummaryParts.push(
        `${newTasks.length} item(s) added`
      );
    }

    if (removedTasks.length > 0) {
      changeSummaryParts.push(
        `${removedTasks.length} item(s) removed`
      );
    }

    const changeSummary =
      changeSummaryParts.length > 0
        ? ` (${changeSummaryParts.join(
            ", "
          )} — see checklist change log)`
        : "";

    return {
      applications: updatedApplications,
      message: `Note added to "${targetTask.text}" on ${control.name}.${changeSummary}`,
    };
  }

  return {
    applications: currentApplications,
    message:
      "The requested command is not supported.",
  };
}
