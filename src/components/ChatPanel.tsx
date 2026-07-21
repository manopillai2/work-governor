"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (
    message: string
  ) => void | Promise<void>;
  assistantMessage?: string;
};

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
