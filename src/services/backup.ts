import type { ChatMessage } from "@/components/ChatPanel";
import type { Application } from "./commandEngine";

const BACKUP_FILE_FORMAT_VERSION = 1;
const BACKUPS_STORAGE_KEY =
  "work-governor-backups-v1";

export type BackupEntry = {
  version: number;
  createdAt: string;
  applications: Application[];
  messages: ChatMessage[];
};

function formatFileTimestamp(): string {
  return new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
}

export function downloadApplicationBackup(
  applications: Application[],
  messages: ChatMessage[]
): void {
  const backup = {
    backupFormatVersion:
      BACKUP_FILE_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    applications,
    messages,
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `work-governor-backup-${formatFileTimestamp()}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function loadBackupHistory(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(
      BACKUPS_STORAGE_KEY
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      "Unable to load Work Governor backup history:",
      error
    );

    return [];
  }
}

export function saveBackupHistory(
  backups: BackupEntry[]
): void {
  localStorage.setItem(
    BACKUPS_STORAGE_KEY,
    JSON.stringify(backups)
  );
}

export function createBackupEntry(
  existingBackups: BackupEntry[],
  applications: Application[],
  messages: ChatMessage[]
): BackupEntry {
  const nextVersion =
    existingBackups.reduce(
      (maxVersion, backup) =>
        Math.max(maxVersion, backup.version),
      0
    ) + 1;

  return {
    version: nextVersion,
    createdAt: new Date().toISOString(),
    applications,
    messages,
  };
}

export function findBackupByVersion(
  backups: BackupEntry[],
  version: number
): BackupEntry | undefined {
  return backups.find(
    (backup) => backup.version === version
  );
}

export function formatBackupSummary(
  backup: BackupEntry
): string {
  const totalControls =
    backup.applications.reduce(
      (total, application) =>
        total + application.controls.length,
      0
    );

  const timestamp = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Chicago",
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(backup.createdAt));

  return `#${backup.version} — ${timestamp} — ${
    backup.applications.length
  } application${
    backup.applications.length === 1 ? "" : "s"
  }, ${totalControls} control${
    totalControls === 1 ? "" : "s"
  }`;
}

export function formatBackupList(
  backups: BackupEntry[]
): string {
  if (backups.length === 0) {
    return 'No backups have been created yet. Say "take backup now" to create one.';
  }

  const sortedBackups = [...backups].sort(
    (a, b) => b.version - a.version
  );

  return [
    `You have ${sortedBackups.length} backup${
      sortedBackups.length === 1 ? "" : "s"
    }:`,
    ...sortedBackups.map(
      (backup) => `- ${formatBackupSummary(backup)}`
    ),
  ].join("\n");
}
