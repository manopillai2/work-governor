"use client";

// ControlCard wired to the app state: every checklist / note / status
// action for one application's control. Shared by the control list
// ("/" + "/controls") and the controls matrix pop-out, so they all
// behave identically.

import ControlCard from "@/components/ControlCard";
import { useAppState } from "@/components/AppStateProvider";
import { useHubChat } from "@/components/hub/HubShell";
import { splitApplicationName } from "@/services/applicationName";
import type { Application, ComplianceControl } from "@/services/commandEngine";

export default function ConnectedControlCard({
  application,
  control,
  expanded,
  onToggleExpanded,
}: {
  application: Application;
  control: ComplianceControl;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const {
    handleSend,
    toggleChecklistTask,
    addTaskNote,
    markTaskIrrelevantHandler,
    restoreTaskHandler,
    regenerateChecklistHandler,
    approveChecklist,
    requestChecklistRevision,
    completeControl,
  } = useAppState();
  // New UI: run assistant actions in the result pop-up, not the drawer.
  const { runTask } = useHubChat();
  const scoped = { applicationId: application.id, controlName: control.name };

  return (
    <ControlCard
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      applicationTag={splitApplicationName(application.name)}
      controlName={control.name}
      globalControlReference={control.globalControlReference}
      clientContext={control.clientContext}
      framework={control.framework}
      stage={control.stage}
      controlStatus={control.controlStatus}
      checklistStatus={control.checklistStatus}
      controlObjective={control.controlObjective}
      controlRisk={control.controlRisk}
      applicabilityRationale={control.applicabilityRationale}
      evidenceStrategy={control.evidenceStrategy}
      evidenceDataGapAnalysis={control.evidenceDataGapAnalysis}
      evidenceDataGapAnalysisStale={control.evidenceDataGapAnalysisStale}
      checklistChangeLog={control.checklistChangeLog}
      nextTasks={control.nextTasks}
      notes={control.notes}
      progressSummary={control.progressSummary}
      onToggleTask={(taskId) => toggleChecklistTask(application.id, control.id, taskId)}
      onAddTaskNote={(taskText, note) => addTaskNote(application.name, control.name, taskText, note)}
      onMarkTaskIrrelevant={(taskId, reason) => markTaskIrrelevantHandler(application.id, control.id, taskId, reason)}
      onRestoreTask={(taskId) => restoreTaskHandler(application.id, control.id, taskId)}
      onRegenerateChecklist={() =>
        runTask ? runTask({ kind: "regenerateChecklist", ...scoped }) : regenerateChecklistHandler(application.id, control.name)
      }
      onPrepEmail={() =>
        runTask
          ? runTask({ kind: "prepEmail", ...scoped })
          : handleSend(`Give me an email-ready version for ${application.id}, for control "${control.name}" only.`)
      }
      onShowQuestions={() =>
        runTask
          ? runTask({ kind: "openQuestions", ...scoped })
          : handleSend(`Give me just the open questions from an email-ready version for ${application.id}, for control "${control.name}" only.`)
      }
      onRefreshEvidenceDataGapAnalysis={() =>
        runTask
          ? runTask({ kind: "gapAnalysis", ...scoped })
          : handleSend(`Analyze the evidence vs testing data gap for ${application.id}, for control "${control.name}" only.`)
      }
      onUploadEvidence={runTask ? () => runTask({ kind: "uploadEvidence", ...scoped }) : undefined}
      onUploadData={runTask ? () => runTask({ kind: "uploadData", ...scoped }) : undefined}
      onApproveChecklist={() => approveChecklist(application.id, control.id)}
      onRequestChecklistRevision={() => requestChecklistRevision(application.id, control.id)}
      onCompleteControl={() => completeControl(application.id, control.id)}
    />
  );
}
