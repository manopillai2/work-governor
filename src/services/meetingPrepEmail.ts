import type {
  MeetingPrepEmail,
  MeetingPrepQuestion,
} from "./commandEngine";

export type FormattedMeetingPrepEmail = {
  subject: string;
  // Plain-text rendering of the email content, used only as a
  // fallback display for older persisted chat messages that predate
  // the structured `email` preview (see ChatPanel's
  // MeetingPrepEmailAttachment). Current messages render `email`
  // directly and let the user copy the rendered preview instead.
  body: string;
};

function buildQuestionsPlainList(
  questions: MeetingPrepQuestion[]
): string {
  if (questions.length === 0) {
    return "No open questions -- everything needed is already on file.";
  }

  return questions
    .map(
      (item, index) =>
        `${index + 1}. ${item.question}\n   Example: ${item.exampleAnswer}`
    )
    .join("\n\n");
}

export function formatMeetingPrepEmailText(
  applicationName: string,
  email: MeetingPrepEmail
): FormattedMeetingPrepEmail {
  const highlights =
    email.checklistHighlights.length > 0
      ? email.checklistHighlights
          .map((highlight) => `- ${highlight}`)
          .join("\n")
      : "- No checklist highlights are available yet.";

  const subject =
    email.subject ||
    `${applicationName} — quick prep before our meeting`;

  const body = `Hi team,

Ahead of our meeting on ${applicationName}, a quick prep list so we can move fast together.

WHAT THIS APPLICATION IS
${email.applicationSummary || "Not yet documented."}

HOW IT'S USED
${email.applicationUse || "Not yet documented."}

WHERE THINGS STAND
${highlights}

A FEW THINGS WE NEED FROM YOU BEFORE WE MEET

${buildQuestionsPlainList(email.openQuestions)}

${email.closingNote || "Thanks for taking a look before we meet!"}
`;

  return { subject, body };
}
