"use client";

import {
  FormEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import ReactMarkdown, {
  type Components,
} from "react-markdown";
import remarkGfm from "remark-gfm";

import { RoyalCardCorners } from "@/components/RoyalIcon";
import { useTheme } from "@/components/ThemeProvider";
import type {
  MeetingPrepEmail,
  MeetingPrepQuestion,
} from "@/services/commandEngine";

export type ChatMessageAttachment =
  | {
      type: "meeting-prep-email";
      applicationName: string;
      subject: string;
      // Plain-text fallback shown only when `email` is missing (older
      // persisted messages that predate this structured preview).
      body: string;
      // Optional because this is loaded from persisted state -- older
      // saved messages (or any future shape drift) may not have it.
      email?: MeetingPrepEmail;
    }
  | {
      type: "open-questions";
      applicationName: string;
      // Set only when the request was scoped to one control.
      controlName?: string;
      questions: MeetingPrepQuestion[];
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
  onAttachEvidence?: (
    kind: "evidence" | "data"
  ) => void;
};

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="mb-2 leading-6 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-6">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">
      {children}
    </strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-300 underline underline-offset-2 hover:text-blue-200"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-900/70 px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-slate-900/70 p-2 font-mono text-xs last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-700/60">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="border border-slate-600 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-600 px-2 py-1 align-top">
      {children}
    </td>
  ),
};

function OpenQuestionsTable({
  questions,
}: {
  questions: MeetingPrepQuestion[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
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
          {questions.map((question, index) => (
            <tr
              key={index}
              className="align-top odd:bg-slate-900/40"
            >
              <td className="border-b border-slate-800 px-2 py-1.5 text-slate-500">
                {index + 1}
              </td>
              <td className="border-b border-slate-800 px-2 py-1.5 text-slate-400">
                {(
                  question.relatedControls ?? []
                ).join(", ") || "—"}
              </td>
              <td className="border-b border-slate-800 px-2 py-1.5">
                {question.question}
              </td>
              <td className="border-b border-slate-800 px-2 py-1.5 italic text-slate-400">
                {question.exampleAnswer}
              </td>
              <td className="min-w-[100px] border-b border-slate-800 px-2 py-1.5">
                {" "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useCopyRenderedContent() {
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
      succeeded = document.execCommand("copy");
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

  return {
    contentRef,
    copyStatus,
    handleCopyRenderedContent,
  };
}

function OpenQuestionsAttachment({
  attachment,
}: {
  attachment: Extract<
    ChatMessageAttachment,
    { type: "open-questions" }
  >;
}) {
  const {
    contentRef,
    copyStatus,
    handleCopyRenderedContent,
  } = useCopyRenderedContent();

  return (
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <p className="text-sm font-semibold text-white">
        Open Questions —{" "}
        {attachment.applicationName}
        {attachment.controlName
          ? ` · ${attachment.controlName}`
          : ""}
      </p>

      <div className="relative">
        <div
          ref={contentRef}
          className="space-y-2 pr-14 pb-2"
        >
          {attachment.questions.length > 0 ? (
            attachment.questions.map(
              (question, index) => (
                <p
                  key={index}
                  className="text-sm leading-6 text-slate-200"
                >
                  {index + 1}.{" "}
                  {question.question}
                </p>
              )
            )
          ) : (
            <p className="text-sm text-slate-400">
              No open questions right now.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={
            handleCopyRenderedContent
          }
          title="Copy the questions above to paste into an email"
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

function MeetingPrepEmailAttachment({
  attachment,
}: {
  attachment: Extract<
    ChatMessageAttachment,
    { type: "meeting-prep-email" }
  >;
}) {
  const { email } = attachment;

  const {
    contentRef,
    copyStatus,
    handleCopyRenderedContent,
  } = useCopyRenderedContent();

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

                  <div className="mt-1">
                    <OpenQuestionsTable
                      questions={
                        email.openQuestions
                      }
                    />
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

// Split out and memoized so typing in the input below (which lives in
// ChatPanel's own state) doesn't force every message to re-render and
// re-parse its Markdown on every keystroke -- with a long chat
// history that was the actual cause of visible input lag. This only
// re-renders when messages/assistantMessage themselves change.
const ChatMessageList = memo(
  function ChatMessageList({
    messages,
    assistantMessage,
    messagesEndRef,
  }: {
    messages: ChatMessage[];
    assistantMessage?: string;
    messagesEndRef: RefObject<HTMLDivElement | null>;
  }) {
    return (
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
                    : "Control Governor"}
                </p>

                {isUser ? (
                  <p className="whitespace-pre-wrap break-words leading-6">
                    {message.content}
                  </p>
                ) : (
                  <div className="break-words leading-6">
                    <ReactMarkdown
                      remarkPlugins={[
                        remarkGfm,
                      ]}
                      components={
                        MARKDOWN_COMPONENTS
                      }
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}

                {message.attachment?.type ===
                "meeting-prep-email" ? (
                  <MeetingPrepEmailAttachment
                    attachment={
                      message.attachment
                    }
                  />
                ) : null}

                {message.attachment?.type ===
                "open-questions" ? (
                  <OpenQuestionsAttachment
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
              Control Governor
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
    );
  }
);

export default function ChatPanel({
  messages,
  onSend,
  assistantMessage,
  onAttachEvidence,
}: ChatPanelProps) {
  const [input, setInput] = useState("");

  // Shell-style history navigation through the user's own past
  // messages. historyIndex is null while editing a fresh draft;
  // draftBeforeHistory preserves that draft so Down can restore it
  // after navigating back past the most recent history entry.
  const [historyIndex, setHistoryIndex] =
    useState<number | null>(null);
  const [
    draftBeforeHistory,
    setDraftBeforeHistory,
  ] = useState("");

  const userMessageHistory = useMemo(
    () =>
      messages
        .filter(
          (message) => message.role === "user"
        )
        .map((message) => message.content),
    [messages]
  );

  const [
    showHistoryPanel,
    setShowHistoryPanel,
  ] = useState(false);

  const [
    showAttachChooser,
    setShowAttachChooser,
  ] = useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const tabHeldRef = useRef(false);

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

    // A bare number re-runs that numbered entry from the history
    // panel (1-indexed, oldest first) instead of being sent literally.
    let messageToSend = trimmedMessage;

    if (/^\d+$/.test(trimmedMessage)) {
      const historyNumber = Number(
        trimmedMessage
      );

      const historyEntry =
        userMessageHistory[historyNumber - 1];

      if (historyEntry) {
        messageToSend = historyEntry;
      }
    }

    setInput("");
    setHistoryIndex(null);
    setDraftBeforeHistory("");
    setShowHistoryPanel(false);

    await onSend(messageToSend);
  }

  async function runHistoryEntry(
    index: number
  ) {
    const historyEntry =
      userMessageHistory[index];

    if (!historyEntry || isProcessing) {
      return;
    }

    setInput("");
    setHistoryIndex(null);
    setDraftBeforeHistory("");
    setShowHistoryPanel(false);

    await onSend(historyEntry);
  }

  const { theme } = useTheme();
  const isRoyal = theme === "royal";

  return (
    <div
      className={`flex h-[520px] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10 xl:h-full ${isRoyal ? "royal-corner-frame royal-letter-texture" : ""}`}
    >
      {isRoyal ? <RoyalCardCorners /> : null}
      <div className="shrink-0 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Control Governor
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-slate-400">
              AI-guided CORE compliance assistant
            </p>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-emerald-900 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Claude connected
          </span>
        </div>
      </div>

      <ChatMessageList
        messages={messages}
        assistantMessage={assistantMessage}
        messagesEndRef={messagesEndRef}
      />

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-slate-800 bg-slate-900 p-3"
      >
        {showHistoryPanel &&
        userMessageHistory.length > 0 ? (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950">
            {userMessageHistory.map(
              (message, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    runHistoryEntry(index)
                  }
                  className="flex w-full items-start gap-2 border-b border-slate-800 px-2.5 py-1.5 text-left text-xs text-slate-300 last:border-b-0 hover:bg-slate-800"
                >
                  <span className="shrink-0 font-mono text-slate-500">
                    {index + 1}
                  </span>

                  <span className="truncate">
                    {message}
                  </span>
                </button>
              )
            )}
          </div>
        ) : null}

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

              return;
            }

            if (event.key === "Tab") {
              // Held as a modifier for Tab+Arrow
              // history navigation -- kept in the
              // textarea instead of shifting focus
              // so the chord below can fire.
              event.preventDefault();

              // Only toggle on the initial press,
              // not on OS key-repeat while held.
              if (!tabHeldRef.current) {
                setShowHistoryPanel(
                  (current) => !current
                );
              }

              tabHeldRef.current = true;

              return;
            }

            if (
              event.key === "Escape" &&
              showHistoryPanel
            ) {
              setShowHistoryPanel(false);

              return;
            }

            if (
              event.key === "ArrowUp" &&
              tabHeldRef.current
            ) {
              if (
                userMessageHistory.length === 0
              ) {
                return;
              }

              event.preventDefault();

              if (historyIndex === null) {
                setDraftBeforeHistory(input);

                const newIndex =
                  userMessageHistory.length - 1;

                setHistoryIndex(newIndex);
                setInput(
                  userMessageHistory[newIndex]
                );
              } else if (historyIndex > 0) {
                const newIndex = historyIndex - 1;

                setHistoryIndex(newIndex);
                setInput(
                  userMessageHistory[newIndex]
                );
              }

              return;
            }

            if (
              event.key === "ArrowDown" &&
              tabHeldRef.current
            ) {
              if (historyIndex === null) {
                return;
              }

              event.preventDefault();

              if (
                historyIndex <
                userMessageHistory.length - 1
              ) {
                const newIndex =
                  historyIndex + 1;

                setHistoryIndex(newIndex);
                setInput(
                  userMessageHistory[newIndex]
                );
              } else {
                setHistoryIndex(null);
                setInput(draftBeforeHistory);
              }
            }
          }}
          onKeyUp={(event) => {
            if (event.key === "Tab") {
              tabHeldRef.current = false;
            }
          }}
          onBlur={() => {
            tabHeldRef.current = false;
          }}
          placeholder="Enter a Control Governor update..."
          rows={3}
          disabled={isProcessing}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Enter to send · Shift + Enter for a new line · Tab to
            list message history, Tab + ↑/↓ to browse it, or type a
            number + Enter to re-run it
          </p>

          <div className="relative flex shrink-0 items-center gap-2">
            {onAttachEvidence ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setShowAttachChooser(
                      (current) => !current
                    )
                  }
                  disabled={isProcessing}
                  aria-expanded={
                    showAttachChooser
                  }
                  title="Attach evidence or real application data (Word, Excel, PowerPoint, PDF, CSV, JSON, or text)"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showAttachChooser ? (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() =>
                        setShowAttachChooser(
                          false
                        )
                      }
                    />

                    <div className="absolute bottom-full right-0 z-50 mb-1 w-48 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachChooser(
                            false
                          );
                          onAttachEvidence(
                            "evidence"
                          );
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                      >
                        Upload Evidence
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachChooser(
                            false
                          );
                          onAttachEvidence(
                            "data"
                          );
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                      >
                        Upload Real Data
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            <button
              type="submit"
              disabled={
                !input.trim() || isProcessing
              }
              className={`rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 ${isRoyal ? "royal-btn-shine" : ""}`}
            >
              {isProcessing
                ? "Working..."
                : "Send"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
