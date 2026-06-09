"use client";

import { OPENING_MESSAGE } from "@/lib/persona";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Configuração do LV-12 4G interno",
  "Rastreador está offline, o que fazer?",
  "Comando para bloquear veículo",
  "Protocolo de roubo/furto",
];

export default function Chat() {
  const [sessionId] = useState(
    () => crypto.randomUUID?.() ?? `web-${Date.now()}`
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: OPENING_MESSAGE,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar mensagem");
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: `Desculpe, ocorreu um erro: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              Uso interno
            </p>
            <h1 className="text-lg font-bold sm:text-xl">
              Império dos Rastreadores
            </h1>
            <p className="text-sm text-slate-400">Assistente interno com IA</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/knowledge"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Conhecimento
            </Link>
            <Link
              href="/admin/whatsapp"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              WhatsApp
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap sm:max-w-[75%] sm:text-base ${
                  message.role === "user"
                    ? "bg-red-600 text-white"
                    : "border border-slate-800 bg-slate-900 text-slate-100"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
                Pensando...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-red-500 hover:text-white sm:text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="mt-2 flex gap-2 border-t border-slate-800 pt-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-red-500 disabled:opacity-50 sm:text-base"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}
