import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { applications, chatMessages, controls } from "@/db/schema";
import type { ChatMessage } from "@/components/ChatPanel";
import type {
  Application,
  ComplianceControl,
} from "@/services/commandEngine";

type StatePayload = {
  applications: Application[];
  messages: ChatMessage[];
};

export async function GET() {
  const [applicationRows, controlRows, messageRows] =
    await Promise.all([
      db.select().from(applications),
      db.select().from(controls),
      db.select().from(chatMessages).orderBy(chatMessages.createdAt),
    ]);

  const controlsByApplication = new Map<
    string,
    ComplianceControl[]
  >();

  for (const row of controlRows) {
    const control: ComplianceControl = {
      id: row.id,
      name: row.name,
      framework: row.framework as ComplianceControl["framework"],
      homeworkStatus:
        row.homeworkStatus as ComplianceControl["homeworkStatus"],
      stage: row.stage as ComplianceControl["stage"],
      controlStatus:
        row.controlStatus as ComplianceControl["controlStatus"],
      checklistStatus:
        row.checklistStatus as ComplianceControl["checklistStatus"],
      controlObjective: row.controlObjective,
      controlRisk: row.controlRisk,
      applicabilityRationale: row.applicabilityRationale,
      evidenceStrategy: row.evidenceStrategy,
      argosObjective: row.argosObjective,
      globalControlReference: row.globalControlReference,
      clientContext: row.clientContext,
      evidenceDataGapAnalysis: row.evidenceDataGapAnalysis,
      notes: row.notes,
      nextTasks: row.nextTasks,
      checklistChangeLog: row.checklistChangeLog,
      progressSummary: row.progressSummary,
      qaScore: row.qaScore as ComplianceControl["qaScore"],
      qaScoreRationale: row.qaScoreRationale,
      lastRegeneratedSignature: row.lastRegeneratedSignature,
    };

    const list = controlsByApplication.get(row.applicationId) ?? [];
    list.push(control);
    controlsByApplication.set(row.applicationId, list);
  }

  const applicationsWithControls: Application[] =
    applicationRows.map((row) => ({
      id: row.id,
      name: row.name,
      hosting: row.hosting,
      applicationPurpose: row.applicationPurpose,
      businessProcess: row.businessProcess,
      applicationOwner: row.applicationOwner,
      technicalOwner: row.technicalOwner,
      applicationContacts: row.applicationContacts,
      integrations: row.integrations,
      identityTypes: row.identityTypes,
      hostingDetails: row.hostingDetails,
      dataClassification: row.dataClassification,
      financialRelevance: row.financialRelevance,
      contextStatus:
        row.contextStatus as Application["contextStatus"],
      evidenceDataGapSummary: row.evidenceDataGapSummary,
      notes: row.notes,
      controls: controlsByApplication.get(row.id) ?? [],
    }));

  const messages: ChatMessage[] = messageRows.map((row) => ({
    id: row.id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    attachment: row.attachment ?? undefined,
  }));

  return NextResponse.json({
    applications: applicationsWithControls,
    messages,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as StatePayload;

  await db.transaction(async (tx) => {
    await tx.delete(applications);
    await tx.delete(chatMessages);

    if (body.applications.length > 0) {
      await tx.insert(applications).values(
        body.applications.map((application) => ({
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
          evidenceDataGapSummary:
            application.evidenceDataGapSummary,
          notes: application.notes,
        }))
      );

      const controlRows = body.applications.flatMap(
        (application) =>
          application.controls.map((control) => ({
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
            globalControlReference:
              control.globalControlReference,
            clientContext: control.clientContext,
            evidenceDataGapAnalysis:
              control.evidenceDataGapAnalysis,
            notes: control.notes,
            nextTasks: control.nextTasks,
            checklistChangeLog: control.checklistChangeLog,
            progressSummary: control.progressSummary,
            qaScore: control.qaScore,
            qaScoreRationale: control.qaScoreRationale,
            lastRegeneratedSignature:
              control.lastRegeneratedSignature,
          }))
      );

      if (controlRows.length > 0) {
        await tx.insert(controls).values(controlRows);
      }
    }

    if (body.messages.length > 0) {
      await tx.insert(chatMessages).values(
        body.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          attachment: message.attachment ?? null,
        }))
      );
    }
  });

  return NextResponse.json({ ok: true });
}
