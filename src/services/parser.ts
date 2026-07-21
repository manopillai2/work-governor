// ======================================================
// Service Name   : Parser
// Purpose        : Converts temporary chat patterns
//                  into Work Governor commands
// Author         : Manoj
// ======================================================

import {
  Command,
  Framework,
  HomeworkStatus,
} from "./commandEngine";

export function parseMessage(message: string): Command | null {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return null;
  }

  const homeworkCommand = parseHomeworkUpdate(trimmedMessage);

  if (homeworkCommand) {
    return homeworkCommand;
  }

  return parseApplicationCreation(trimmedMessage);
}

function parseHomeworkUpdate(message: string): Command | null {
  if (!/\bhomework\b/i.test(message)) {
    return null;
  }

  const applicationMatch = message.match(
    /\b(?:APP|APPLICATION)[\s-_]*(\d+)\b/i,
  );

  if (!applicationMatch) {
    return null;
  }

  const homeworkStatus = detectHomeworkStatus(message);

  if (!homeworkStatus) {
    return null;
  }

  const controlName = extractHomeworkControl(
    message,
    applicationMatch,
  );

  if (!controlName) {
    return null;
  }

  return {
    action: "UPDATE_HOMEWORK",
    payload: {
      application: normalizeApplicationName(
        applicationMatch[1],
      ),
      control: controlName,
      status: homeworkStatus,
    },
  };
}

function parseApplicationCreation(
  message: string,
): Command | null {
  const applicationMatch = message.match(
    /\b(?:APP|APPLICATION)[\s-_]*(\d+)\b/i,
  );

  if (!applicationMatch) {
    return null;
  }

  const framework = detectFramework(message);

  return {
    action: "CREATE_APPLICATION",
    payload: {
      hosting: detectHosting(message),
      application: normalizeApplicationName(
        applicationMatch[1],
      ),
      controls: extractControls(message).map(
        (name) => ({ name, framework }),
      ),
    },
  };
}

function normalizeApplicationName(
  applicationNumber: string,
): string {
  return `APP-${applicationNumber.padStart(2, "0")}`;
}

function detectHomeworkStatus(
  message: string,
): HomeworkStatus | null {
  if (
    /\b(not completed|not complete|waiting|pending)\b/i.test(
      message,
    )
  ) {
    return "Waiting";
  }

  if (
    /\b(completed|complete|done|finished)\b/i.test(message)
  ) {
    return "Completed";
  }

  return null;
}

function extractHomeworkControl(
  message: string,
  applicationMatch: RegExpMatchArray,
): string | null {
  const matchIndex = applicationMatch.index ?? 0;

  const textAfterApplication = message
    .slice(matchIndex + applicationMatch[0].length)
    .replace(/^[\s,:;-]+/, "")
    .trim();

  const controlMatch = textAfterApplication.match(
    /^(.+?)(?:,?\s+homework\b)/i,
  );

  if (!controlMatch) {
    return null;
  }

  const controlName = controlMatch[1]
    .replace(
      /^(?:under\s+)?(?:SOX|PCI(?:\s+DSS)?)\s+/i,
      "",
    )
    .replace(/^control\s+/i, "")
    .trim();

  return controlName || null;
}

function detectFramework(message: string): Framework {
  if (/\bPCI(?:\s+DSS)?\b/i.test(message)) {
    return "PCI DSS";
  }

  return "SOX";
}

function detectHosting(message: string): string {
  if (/\bsaas\b/i.test(message)) {
    return "SaaS";
  }

  if (/\bpaas\b/i.test(message)) {
    return "PaaS";
  }

  if (/\biaas\b/i.test(message)) {
    return "IaaS";
  }

  if (/\bon[-\s]?prem(?:ises)?\b/i.test(message)) {
    return "On-premises";
  }

  return "Unknown";
}

function extractControls(message: string): string[] {
  const withMatch = message.match(/\bwith\b(.+)$/i);

  if (!withMatch) {
    return [];
  }

  return withMatch[1]
    .replace(/\band\b/gi, ",")
    .split(",")
    .map((control) => control.trim())
    .map((control) =>
      control
        .replace(/\bcontrols?\b/gi, "")
        .replace(/\bpolicies?\b/gi, "")
        .replace(/\.$/, "")
        .trim(),
    )
    .filter(Boolean);
}
