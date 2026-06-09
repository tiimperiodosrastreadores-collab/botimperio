import OpenAI from "openai";
import {
  appendHistory,
  getHistory,
  getThreadId,
  setThreadId,
} from "./conversation-store";
import { ASSISTANT_PERSONA } from "./persona";
import { buildContext, searchRelevantChunks } from "./rag";

export interface ChatOptions {
  channel?: string;
  sessionId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }
  return new OpenAI({ apiKey });
}

function extractAssistantText(
  message: OpenAI.Beta.Threads.Messages.Message
): string {
  const parts = message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text.value);

  return parts.join("\n").trim();
}

async function generateWithAssistant(
  userMessage: string,
  channel: string,
  sessionId: string
): Promise<string> {
  const client = getClient();
  const assistantId = process.env.OPENAI_ASSISTANT_ID;
  if (!assistantId) {
    throw new Error("OPENAI_ASSISTANT_ID não configurado");
  }

  let threadId = await getThreadId(channel, sessionId);

  if (!threadId) {
    const thread = await client.beta.threads.create();
    threadId = thread.id;
    await setThreadId(channel, sessionId, threadId);
  }

  await client.beta.threads.messages.create(threadId, {
    role: "user",
    content: userMessage,
  });

  const run = await client.beta.threads.runs.createAndPoll(threadId, {
    assistant_id: assistantId,
  });

  if (run.status !== "completed") {
    throw new Error(`Assistente não concluiu a resposta (${run.status})`);
  }

  const messages = await client.beta.threads.messages.list(threadId, {
    limit: 1,
    order: "desc",
  });

  const assistantMessage = messages.data.find(
    (message) => message.role === "assistant"
  );

  if (!assistantMessage) {
    throw new Error("Resposta do assistente não encontrada");
  }

  return (
    extractAssistantText(assistantMessage) ||
    "Não foi possível gerar uma resposta. Tente novamente."
  );
}

async function generateWithChatCompletions(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const relevantChunks = searchRelevantChunks(userMessage);
  const context = buildContext(relevantChunks);
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${ASSISTANT_PERSONA}\n\nContexto da base de conhecimento:\n${context}`,
    },
    ...history.slice(-8).map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    max_tokens: 1500,
  });

  return (
    response.choices[0]?.message?.content?.trim() ||
    "Não foi possível gerar uma resposta. Tente novamente."
  );
}

export async function generateChatResponse(
  userMessage: string,
  options: ChatOptions = {}
): Promise<string> {
  const channel = options.channel ?? "web";
  const sessionId = options.sessionId ?? "default";
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  let reply: string;

  if (assistantId) {
    reply = await generateWithAssistant(userMessage, channel, sessionId);
  } else {
    const history =
      options.history ?? (await getHistory(channel, sessionId));
    reply = await generateWithChatCompletions(userMessage, history);
    await appendHistory(channel, sessionId, userMessage, reply);
  }

  return reply;
}
