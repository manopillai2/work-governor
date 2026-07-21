import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { db } from "../src/db/client";
import { applications, chatMessages, controls } from "../src/db/schema";
import type {
  Application,
  ComplianceControl,
} from "../src/services/commandEngine";
import type { ChatMessage } from "../src/components/ChatPanel";

type BackupFile = {
  applications: Application[];
  messages: ChatMessage[];
};

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error(
      "Usage: npm run db:import -- <path-to-backup.json>"
    );
    process.exit(1);
  }

  const raw = readFileSync(resolve(filePath), "utf-8");
  const backup = JSON.parse(raw) as BackupFile;

  const applicationRows = backup.applications ?? [];
  const messageRows = backup.messages ?? [];

  console.log(
    `Importing ${applicationRows.length} application(s) and ${messageRows.length} message(s) from ${filePath}`
  );

  await db.transaction(async (tx) => {
    await tx.delete(applications);
    await tx.delete(chatMessages);

    if (applicationRows.length > 0) {
      await tx.insert(applications).values(
        applicationRows.map((application: Application) => ({
          id: application.id,
          name: application.name,
          hosting: application.hosting,
          applicationPurpose: application.applicationPurpose,
          businessProcess: application.businessProcess,
          applicationOwner: application.applicationOwner,
          technicalOwner: application.technicalOwner,
          applicationContacts: application.applicationContacts,
          integrations: application.integrations,
          identityTypes: application.identityTypes,
          hostingDetails: application.hostingDetails,
          dataClassification: application.dataClassification,
          financialRelevance: application.financialRelevance,
          contextStatus: application.contextStatus,
        }))
      );

      const controlRows = applicationRows.flatMap(
        (application: Application) =>
          application.controls.map(
            (control: ComplianceControl) => ({
              id: control.id,
              applicationId: application.id,
              name: control.name,
              framework: control.framework,
              homeworkStatus: control.homeworkStatus,
              stage: control.stage,
              controlStatus: control.controlStatus,
              checklistStatus: control.checklistStatus,
              controlObjective: control.controlObjective,
              controlRisk: control.controlRisk,
              applicabilityRationale:
                control.applicabilityRationale,
              evidenceStrategy: control.evidenceStrategy,
              argosObjective: control.argosObjective,
              notes: control.notes,
              nextTasks: control.nextTasks,
              checklistChangeLog: control.checklistChangeLog,
              progressSummary: control.progressSummary,
              qaScore: control.qaScore,
              qaScoreRationale: control.qaScoreRationale,
            })
          )
      );

      if (controlRows.length > 0) {
        await tx.insert(controls).values(controlRows);
      }
    }

    if (messageRows.length > 0) {
      await tx.insert(chatMessages).values(
        messageRows.map((message: ChatMessage) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }))
      );
    }
  });

  console.log("Import complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
