"use client";

import { useState } from "react";

export function Chatboard({ symbol }: { symbol: string }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Ask about ${symbol}: bias, target, or invalidation.`
    }
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function sendMessage() {
    const question = input.trim();
    if (!question) return;

    const nextMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        question,
        history: nextMessages.slice(-6)
      })
    });

    const payload = await response.json();
    setPending(false);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: payload.answer ?? payload.error ?? "Unable to answer right now."
      }
    ]);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-neutral">Chatboard</p>
        <h2 className="text-lg font-semibold text-white">Quick ask</h2>
      </div>

      <div className="space-y-3">
        <div className="max-h-[180px] space-y-3 overflow-y-auto rounded-2xl border border-white/8 bg-black/20 p-4">
          {messages.slice(-3).map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "assistant" ? "mr-6 rounded-2xl bg-white/[0.05] p-3 text-sm text-slate-200" : "ml-6 rounded-2xl bg-signal/10 p-3 text-sm text-white"}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-signal/40"
            placeholder={`Ask ${symbol}`}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={pending}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:-translate-y-0.5 hover:bg-signal disabled:opacity-60"
          >
            {pending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
