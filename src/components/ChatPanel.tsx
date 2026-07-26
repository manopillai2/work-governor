"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { MeetingPrepEmail } from "@/services/commandEngine";

export type ChatMessageAttachment = {
  type: "meeting-prep-email";
  applicationName: string;
  subject: string;
  // Plain-text fallback shown only when `email` is missing (older
  // persisted messages that predate this structured preview).
  body: string;
  // Optional because this is loaded from persisted state -- older
  // saved messages (or any future shape drift) may not have it.
  email?: MeetingPrepEmail;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachment?: ChatMessageAttachment;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (
    message: string
  ) => void | Promise<void>;
  assistantMessage?: string;
};

function MeetingPrepEmailAttachment({
  attachment,
}: {
  attachment: ChatMessageAttachment;
}) {
  const { email } = attachment;

  const contentRef =
    useRef<HTMLDivElement | null>(null);

  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");

  // Selects the rendered preview and copies it the same way a manual
  // drag-select + Ctrl/Cmd+C would -- the browser inlines the actual
  // computed styles (table borders, spacing, etc.) into the clipboard
  // HTML during a real selection copy, which a hand-built HTML string
  // written via the Clipboard API does not get for free.
  function handleCopyRenderedContent() {
    const node = contentRef.current;
    const selection = window.getSelection();

    if (!node || !selection) {
      setCopyStatus("error");
      setTimeout(
        () => setCopyStatus("idle"),
        2500
      );
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);

    let succeeded = false;

    try {
      succeeded = document.execCommand(
        "copy"
      );
    } catch {
      succeeded = false;
    }

    selection.removeAllRanges();

    setCopyStatus(
      succeeded ? "copied" : "error"
    );

    setTimeout(
      () => setCopyStatus("idle"),
      2500
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <div className="relative">
        <div
          ref={contentRef}
          className="space-y-3 pr-14 pb-2"
        >
          {!email ? (
            // Older persisted messages saved before this structured
            // preview existed only carry the flattened subject/body
            // -- fall back to plain text instead of crashing on a
            // missing field.
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
              {attachment.body}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-white">
                {email.subject}
              </p>

              {email.applicationSummary ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    What this application is
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {email.applicationSummary}
                  </p>
                </div>
              ) : null}

              {email.applicationUse ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    How it&apos;s used
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {email.applicationUse}
                  </p>
                </div>
              ) : null}

              {email.checklistHighlights
                .length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Where things stand
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-6">
                    {email.checklistHighlights.map(
                      (highlight, index) => (
                        <li key={index}>
                          {highlight}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ) : null}

              {email.openQuestions.length >
              0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Questions for the
                    application team
                  </p>

                  <div className="mt-1 overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 text-[10px] uppercase tracking-wide text-slate-400">
                          <th className="border-b border-slate-700 px-2 py-1.5 font-semibold">
                            #
                          </th>
                          <th className="border-b border-slate-700 px-2 py-1.5 font-semibold">
                            Control(s)
                          </th>
                          <th className="border-b border-slate-700 px-2 py-1.5 font-semibold">
                            Question
                          </th>
                          <th className="border-b border-slate-700 px-2 py-1.5 font-semibold">
                            Example Answer
                          </th>
                          <th className="border-b border-slate-700 px-2 py-1.5 font-semibold">
                            Your Response
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {email.openQuestions.map(
                          (
                            question,
                            index
                          ) => (
                            <tr
                              key={index}
                              className="align-top odd:bg-slate-900/40"
                            >
                              <td className="border-b border-slate-800 px-2 py-1.5 text-slate-500">
                                {index + 1}
                              </td>
                              <td className="border-b border-slate-800 px-2 py-1.5 text-slate-400">
                                {(
                                  question.relatedControls ??
                                  []
                                ).join(", ") ||
                                  "—"}
                              </td>
                              <td className="border-b border-slate-800 px-2 py-1.5">
                                {
                                  question.question
                                }
                              </td>
                              <td className="border-b border-slate-800 px-2 py-1.5 italic text-slate-400">
                                {
                                  question.exampleAnswer
                                }
                              </td>
                              <td className="min-w-[100px] border-b border-slate-800 px-2 py-1.5">
                                {" "}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {email.closingNote ? (
                <p className="text-sm italic text-slate-400">
                  {email.closingNote}
                </p>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={
            handleCopyRenderedContent
          }
          title="Copy the formatted preview above (including the table) to paste into an email"
          className="absolute bottom-0 right-0 rounded-md border border-slate-600 bg-slate-950/90 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700"
        >
          {copyStatus === "copied"
            ? "Copied!"
            : copyStatus === "error"
              ? "Copy failed"
              : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function ChatPanel({
  messages,
  onSend,
  assistantMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const isProcessing = Boolean(
    assistantMessage
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, assistantMessage]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedMessage = input.trim();

    if (!trimmedMessage || isProcessing) {
      return;
    }

    setInput("");

    await onSend(trimmedMessage);
  }

  return (
    <div className="flex h-[520px] min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10 xl:h-full xl:min-h-[calc(100vh-155px)]">
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Work Governor
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-slate-400">
              AI-guided CORE compliance assistant
            </p>
          </div>

          <span className="rounded-full border border-emerald-900 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            Claude connected
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Example
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Create APP-18 with eight well-known
              SOX controls. It is on-prem.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isUser =
              message.role === "user";

            return (
              <div
                key={message.id}
                className={
                  isUser
                    ? "ml-8 rounded-xl rounded-br-sm bg-blue-600 px-4 py-3 text-sm text-white"
                    : "mr-8 rounded-xl rounded-bl-sm border border-slate-700/70 bg-slate-800 px-4 py-3 text-sm text-slate-100"
                }
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-65">
                  {isUser
                    ? "You"
                    : "Work Governor"}
                </p>

                <p className="whitespace-pre-wrap break-words leading-6">
                  {message.content}
                </p>

                {message.attachment?.type ===
                "meeting-prep-email" ? (
                  <MeetingPrepEmailAttachment
                    attachment={
                      message.attachment
                    }
                  />
                ) : null}
              </div>
            );
          })
        )}

        {assistantMessage ? (
          <div className="mr-8 rounded-xl rounded-bl-sm border border-slate-700/70 bg-slate-800 px-4 py-3 text-sm text-slate-300">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-65">
              Work Governor
            </p>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />

              <p className="leading-6">
                {assistantMessage}
              </p>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 bg-slate-900 p-3"
      >
        <textarea
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();

              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Enter a Work Governor update..."
          rows={3}
          disabled={isProcessing}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Enter to send · Shift + Enter for a new line
          </p>

          <button
            type="submit"
            disabled={
              !input.trim() || isProcessing
            }
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isProcessing
              ? "Working..."
              : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
