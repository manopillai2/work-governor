// Inserts (or removes) clearly-labelled TEST applications for UI
// testing. Requested explicitly by the user -- every app name ends in
// "- TEST", every row id starts with "test-", and each app carries a
// note saying it is test data. Fictional company names (Contoso,
// Fabrikam, Northwind, Tailspin, Adatum) are Microsoft's standard
// sample-company names, not real clients.
//
//   npm run db:seed-test            insert / refresh the test apps
//   npm run db:seed-test -- --remove  delete them again
//
// Only touches rows whose id starts with "test-"; existing data is left
// alone. Reload any open browser tab afterwards -- the app saves its
// full in-memory state back to the database, so a stale tab would
// otherwise overwrite these rows on its next save.

import { like } from "drizzle-orm";

import { db } from "../src/db/client";
import { applications, controls } from "../src/db/schema";
import {
  CLIENT_REFERENCE_TABLE,
  formatClientReferenceEntry,
} from "../src/services/clientReference";
import {
  deriveApplicationContextStatus,
  type ChecklistTask,
  type ComplianceControl,
  type Note,
  type TaskCategory,
} from "../src/services/commandEngine";

const PREFIX = "test-";
const NOW = new Date().toISOString();

function clientRef(code: string): string {
  const entry = CLIENT_REFERENCE_TABLE.find((e) => e.code === code);
  if (!entry) throw new Error(`Unknown client code ${code}`);
  return formatClientReferenceEntry(entry);
}

let seq = 0;
const id = (kind: string) => `${PREFIX}${kind}-${(++seq).toString().padStart(3, "0")}`;

function note(text: string): Note {
  return { id: id("note"), text, sourceKind: "manual", createdAt: NOW };
}

function task(
  text: string,
  category: TaskCategory,
  opts: { done?: boolean; notes?: string[]; required?: boolean; irrelevant?: string } = {}
): ChecklistTask {
  return {
    id: id("task"),
    text,
    category,
    completed: !!opts.done,
    required: opts.required ?? true,
    notes: (opts.notes ?? []).map(note),
    irrelevant: !!opts.irrelevant,
    ...(opts.irrelevant ? { irrelevantReason: opts.irrelevant } : {}),
  };
}

type ControlSeed = Pick<
  ComplianceControl,
  | "name"
  | "framework"
  | "stage"
  | "homeworkStatus"
  | "controlStatus"
  | "checklistStatus"
  | "qaScore"
  | "globalControlReference"
  | "clientContext"
  | "nextTasks"
> &
  Partial<Pick<ComplianceControl, "progressSummary" | "qaScoreRationale">>;

type AppSeed = {
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
  controls: ControlSeed[];
};

const GENERIC = {
  controlObjective:
    "TEST DATA -- Ensure the control operates effectively and addresses the relevant financial-reporting and technology risk.",
  controlRisk:
    "TEST DATA -- Inadequate design or operation may allow unauthorized, incomplete, or unmonitored activity to affect financially relevant processing.",
  applicabilityRationale:
    "TEST DATA -- Applies because the application supports financially relevant processing.",
  evidenceStrategy:
    "TEST DATA -- Prefer system-generated exports, logs, and ticket records over screenshots.",
  argosObjective:
    "TEST DATA -- Translate the control into repeatable monitoring logic with defined data sources, frequency, and exception criteria.",
};

const APPS: AppSeed[] = [
  {
    name: "Northwind Payroll - TEST",
    hosting: "SaaS",
    applicationPurpose: "Bi-weekly payroll calculation, tax withholding and direct-deposit file generation.",
    businessProcess: "Hire-to-retire: payroll runs, off-cycle payments, year-end tax forms",
    applicationOwner: "Priya Shah (Payroll Operations)",
    technicalOwner: "Marcus Bell (HR Systems)",
    applicationContacts: ["Priya Shah (Payroll Operations)", "Marcus Bell (HR Systems)", "Dana Ortiz (Payroll Analyst)"],
    integrations: ["HRIS employee feed (nightly)", "Bank ACH file transfer (SFTP)", "General ledger journal export"],
    identityTypes: ["Standard user accounts", "Payroll admin accounts", "Integration service accounts"],
    hostingDetails: "Vendor-hosted SaaS, SSO via corporate identity provider",
    dataClassification: "Confidential (PII, salary data)",
    financialRelevance: "Payroll expense posts directly to the GL; material to SOX financial statements",
    controls: [
      {
        name: "User Access Review",
        framework: "SOX",
        stage: "Evidence Collection",
        homeworkStatus: "Completed",
        controlStatus: "In Progress",
        checklistStatus: "Approved",
        qaScore: "Developing",
        globalControlReference: "Logical Access Management - Periodic Access Review",
        clientContext: clientRef("IS05"),
        progressSummary: "TEST DATA -- Q3 review population pulled; reviewer sign-offs still outstanding for two managers.",
        nextTasks: [
          task("Confirm review frequency and reviewer list with the application owner", "Homework", { done: true }),
          task("Export the full user/role listing directly from the system", "Evidence Collection", { done: true, notes: ["TEST DATA -- 412 active users exported, 38 with payroll admin role."] }),
          task("Validate completeness of the listing against the HRIS active employee feed", "Validation", { notes: ["TEST DATA -- 3 accounts found for terminated employees; raised with owner."] }),
          task("Collect reviewer sign-off evidence for every manager", "Approval"),
          task("Document Argos rule for quarterly review completeness", "Argos Design", { required: false }),
        ],
      },
      {
        name: "Change Management",
        framework: "SOX",
        stage: "Discovery",
        homeworkStatus: "Completed",
        controlStatus: "On Hold",
        checklistStatus: "Approved",
        qaScore: "Surface Level",
        globalControlReference: "Program Change Management - Change Authorization",
        clientContext: clientRef("CM11"),
        progressSummary: "TEST DATA -- On hold: vendor release notes are the only change record available.",
        nextTasks: [
          task("Identify how vendor-pushed releases are communicated and approved", "Discovery", { notes: ["TEST DATA -- Vendor publishes monthly release notes; no internal approval step today."] }),
          task("Obtain configuration change log for payroll rules", "Access"),
          task("Agree an internal approval workflow for configuration changes", "Next Steps"),
        ],
      },
      {
        name: "Access Termination",
        framework: "SOX",
        stage: "Completed",
        homeworkStatus: "Completed",
        controlStatus: "Completed",
        checklistStatus: "Completed",
        qaScore: "Argos Ready",
        globalControlReference: "Logical Access Management - Timely Deprovisioning",
        clientContext: clientRef("IS06"),
        progressSummary: "TEST DATA -- Deprovisioning is driven by the HRIS feed via SSO; all sampled leavers removed within 24h.",
        nextTasks: [
          task("Obtain leaver list from HRIS for the period", "Evidence Collection", { done: true }),
          task("Match leavers to account disable timestamps", "Validation", { done: true, notes: ["TEST DATA -- 25/25 sampled leavers disabled within 24h."] }),
          task("Define Argos rule: leaver disabled > 24h raises exception", "Argos Design", { done: true }),
        ],
      },
    ],
  },
  {
    name: "Contoso Ledger - TEST",
    hosting: "On-prem",
    applicationPurpose: "Primary general ledger and financial close system.",
    businessProcess: "Record-to-report: journal entries, period close, consolidations",
    applicationOwner: "Elena Novak (Corporate Controller)",
    technicalOwner: "Sam Okafor (ERP Platform)",
    applicationContacts: ["Elena Novak (Corporate Controller)", "Sam Okafor (ERP Platform)"],
    integrations: ["Payroll journal import", "Accounts payable sub-ledger", "Batch scheduler"],
    identityTypes: ["Standard user accounts", "Elevated access accounts", "Batch/scheduled job accounts"],
    hostingDetails: "On-prem data center, Oracle database, Windows app servers",
    dataClassification: "Business sensitive",
    financialRelevance: "System of record for the financial statements",
    controls: [
      {
        name: "Password Management",
        framework: "SOX",
        stage: "Testing",
        homeworkStatus: "Completed",
        controlStatus: "Ready for Review",
        checklistStatus: "Approved",
        qaScore: "Well Researched",
        globalControlReference: "Logical Access Management - Authentication Controls",
        clientContext: clientRef("IS03"),
        nextTasks: [
          task("Document the password policy enforced by the application", "Homework", { done: true }),
          task("Extract password parameters from the database profile", "Evidence Collection", { done: true, notes: ["TEST DATA -- Min length 10, 90-day expiry, 5 history, lockout after 5 attempts."] }),
          task("Compare parameters to the corporate standard", "Validation", { done: true }),
          task("Obtain reviewer approval of results", "Approval"),
        ],
      },
      {
        name: "Batch Job Monitoring",
        framework: "SOX",
        stage: "Evidence Collection",
        homeworkStatus: "Completed",
        controlStatus: "In Progress",
        checklistStatus: "Approved",
        qaScore: "Developing",
        globalControlReference: "Computer Operations - Job Scheduling and Monitoring",
        clientContext: clientRef("OP21"),
        nextTasks: [
          task("List critical close-related batch jobs", "Discovery", { done: true }),
          task("Export scheduler job history for the period", "Evidence Collection", { notes: ["TEST DATA -- Scheduler export requested from ERP platform team."] }),
          task("Trace failed jobs to incident tickets", "Validation"),
        ],
      },
      {
        name: "Segregation of Duties",
        framework: "SOX",
        stage: "Review",
        homeworkStatus: "Completed",
        controlStatus: "In Progress",
        checklistStatus: "Needs Revision",
        qaScore: "Surface Level",
        globalControlReference: "Logical Access Management - Segregation of Duties",
        clientContext: clientRef("IS08"),
        nextTasks: [
          task("Obtain the SoD conflict ruleset", "Homework", { done: true }),
          task("Run conflict analysis on current role assignments", "Validation", { notes: ["TEST DATA -- 6 users hold both journal create and approve."] }),
          task("Collect mitigating control evidence for each conflict", "Evidence Collection"),
        ],
      },
    ],
  },
  {
    name: "Fabrikam Card Vault - TEST",
    hosting: "Cloud (AWS)",
    applicationPurpose: "Tokenizes and stores payment card data for the e-commerce checkout.",
    businessProcess: "Order-to-cash: card authorization and refunds",
    applicationOwner: "Leo Martins (Payments Product)",
    technicalOwner: "Aisha Rahman (Cloud Security)",
    applicationContacts: ["Leo Martins (Payments Product)", "Aisha Rahman (Cloud Security)", "Platform on-call"],
    integrations: ["Checkout service API", "Payment processor gateway", "SIEM log forwarding"],
    identityTypes: ["Service accounts", "Elevated access accounts", "Break-glass accounts"],
    hostingDetails: "AWS, private subnets, KMS-managed keys",
    dataClassification: "Restricted (cardholder data)",
    financialRelevance: "Processes all card revenue; PCI DSS in scope",
    controls: [
      {
        name: "Encryption of Stored Cardholder Data",
        framework: "PCI DSS",
        stage: "Evidence Collection",
        homeworkStatus: "Completed",
        controlStatus: "In Progress",
        checklistStatus: "Approved",
        qaScore: "Developing",
        globalControlReference: "PCI DSS Req. 3 - Protect Stored Account Data",
        clientContext: "",
        nextTasks: [
          task("Confirm which data stores hold PAN or tokens", "Discovery", { done: true }),
          task("Export KMS key policies and rotation settings", "Evidence Collection", { notes: ["TEST DATA -- Automatic rotation enabled on 2 of 3 keys."] }),
          task("Validate no PAN is written to application logs", "Validation"),
        ],
      },
      {
        name: "Privileged Access Logging",
        framework: "PCI DSS",
        stage: "Homework",
        homeworkStatus: "Waiting",
        controlStatus: "New",
        checklistStatus: "Review Pending",
        qaScore: "Not Started",
        globalControlReference: "PCI DSS Req. 10 - Log and Monitor All Access",
        clientContext: "",
        nextTasks: [
          task("Identify all privileged roles and break-glass accounts", "Homework"),
          task("Confirm log forwarding to the SIEM and retention period", "Access"),
        ],
      },
    ],
  },
  {
    name: "Tailspin Procurement - TEST",
    hosting: "SaaS",
    applicationPurpose: "Purchase requisitions, approvals and vendor onboarding.",
    businessProcess: "Procure-to-pay",
    applicationOwner: "Grace Kim (Procurement)",
    technicalOwner: "",
    applicationContacts: ["Grace Kim (Procurement)"],
    integrations: ["Vendor master sync to ERP"],
    identityTypes: ["Standard user accounts", "Approver accounts"],
    hostingDetails: "",
    dataClassification: "Internal",
    financialRelevance: "",
    controls: [
      {
        name: "User Provisioning",
        framework: "SOX",
        stage: "Discovery",
        homeworkStatus: "Completed",
        controlStatus: "In Progress",
        checklistStatus: "Approved",
        qaScore: "Surface Level",
        globalControlReference: "Logical Access Management - Access Provisioning",
        clientContext: clientRef("IS02"),
        nextTasks: [
          task("Walk through the access request and approval workflow", "Discovery", { notes: ["TEST DATA -- Requests come in by email today, no ticket."] }),
          task("Obtain list of new users for the period", "Evidence Collection"),
          task("Match each new user to an approved request", "Validation"),
        ],
      },
      {
        name: "Vendor Master Changes",
        framework: "SOX",
        stage: "Homework",
        homeworkStatus: "Waiting",
        controlStatus: "Checklist Review Pending",
        checklistStatus: "Review Pending",
        qaScore: "Not Started",
        globalControlReference: "Program Change Management - Master Data Changes",
        clientContext: clientRef("CM11"),
        nextTasks: [
          task("Confirm who can create or edit vendor bank details", "Homework"),
          task("Obtain vendor master change report", "Evidence Collection"),
          task("Check bank-detail changes for independent approval", "Validation"),
        ],
      },
    ],
  },
  {
    name: "Adatum HR Portal - TEST",
    hosting: "Hybrid",
    applicationPurpose: "",
    businessProcess: "",
    applicationOwner: "",
    technicalOwner: "",
    applicationContacts: [],
    integrations: [],
    identityTypes: [],
    hostingDetails: "",
    dataClassification: "",
    financialRelevance: "",
    controls: [
      {
        name: "Backup and Recovery",
        framework: "SOX",
        stage: "Homework",
        homeworkStatus: "Waiting",
        controlStatus: "New",
        checklistStatus: "Review Pending",
        qaScore: "Not Started",
        globalControlReference: "Computer Operations - Backup and Restore",
        clientContext: clientRef("OP22"),
        nextTasks: [
          task("Identify backup tooling and schedule", "Homework"),
          task("Obtain backup job success report", "Evidence Collection"),
          task("Evidence a restore test from the period", "Validation"),
        ],
      },
      {
        name: "IT Asset Validation",
        framework: "SOX",
        stage: "Homework",
        homeworkStatus: "Waiting",
        controlStatus: "New",
        checklistStatus: "Review Pending",
        qaScore: "Not Started",
        globalControlReference: "Computer Operations - IT Asset Inventory",
        clientContext: clientRef("OP23"),
        nextTasks: [
          task("Obtain the server and database inventory for the portal", "Homework"),
          task("Reconcile inventory to monitoring tool coverage", "Validation", { irrelevant: "TEST DATA -- Monitoring is out of scope for this test app." }),
        ],
      },
    ],
  },
];

async function removeTestData() {
  // controls cascade from applications? Delete explicitly to be safe.
  const c = await db.delete(controls).where(like(controls.id, `${PREFIX}%`)).returning({ id: controls.id });
  const a = await db.delete(applications).where(like(applications.id, `${PREFIX}%`)).returning({ id: applications.id });
  return { apps: a.length, controls: c.length };
}

async function main() {
  const removeOnly = process.argv.includes("--remove");
  const removed = await removeTestData();
  if (removeOnly) {
    console.log(`Removed ${removed.apps} test application(s) and ${removed.controls} test control(s).`);
    return;
  }

  let controlCount = 0;
  await db.transaction(async (tx) => {
    for (const app of APPS) {
      const appId = `${PREFIX}app-${app.name.split(" - ")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const { controls: controlSeeds, ...context } = app;

      await tx.insert(applications).values({
        id: appId,
        ...context,
        contextStatus: deriveApplicationContextStatus(context),
        notes: [note("TEST DATA -- generated by scripts/seed-test-data.ts for UI testing. Remove with: npm run db:seed-test -- --remove")],
      });

      await tx.insert(controls).values(
        controlSeeds.map((c) => ({
          id: id("control"),
          applicationId: appId,
          ...GENERIC,
          progressSummary: "",
          qaScoreRationale: "",
          ...c,
        }))
      );
      controlCount += controlSeeds.length;
    }
  });

  console.log(
    `${removed.apps ? `Replaced ${removed.apps} existing test app(s). ` : ""}Inserted ${APPS.length} test applications with ${controlCount} controls.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
