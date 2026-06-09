type SessionData = {
  threadId?: string;
  history: { role: "user" | "assistant"; content: string }[];
};

const memoryStore = new Map<string, SessionData>();

function getMemoryStore(): Map<string, SessionData> {
  const globalScope = globalThis as typeof globalThis & {
    __imperioSessions?: Map<string, SessionData>;
  };

  if (!globalScope.__imperioSessions) {
    globalScope.__imperioSessions = memoryStore;
  }

  return globalScope.__imperioSessions;
}

async function upstashCommand(
  command: (string | number)[]
): Promise<string | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { result?: string | null };
  return data.result ?? null;
}

function sessionKey(channel: string, id: string): string {
  return `${channel}:${id}`;
}

export async function getThreadId(
  channel: string,
  id: string
): Promise<string | null> {
  const key = sessionKey(channel, id);
  const stored = await upstashCommand(["GET", `thread:${key}`]);
  if (stored) return stored;

  return getMemoryStore().get(key)?.threadId ?? null;
}

export async function setThreadId(
  channel: string,
  id: string,
  threadId: string
): Promise<void> {
  const key = sessionKey(channel, id);
  const store = getMemoryStore();
  const current = store.get(key) ?? { history: [] };
  current.threadId = threadId;
  store.set(key, current);

  await upstashCommand(["SET", `thread:${key}`, threadId]);
}

export async function getHistory(
  channel: string,
  id: string
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const key = sessionKey(channel, id);
  const stored = await upstashCommand(["GET", `history:${key}`]);

  if (stored) {
    try {
      return JSON.parse(stored) as SessionData["history"];
    } catch {
      return [];
    }
  }

  return getMemoryStore().get(key)?.history ?? [];
}

export async function appendHistory(
  channel: string,
  id: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const key = sessionKey(channel, id);
  const store = getMemoryStore();
  const current = store.get(key) ?? { history: [] };

  const updatedHistory: SessionData["history"] = [
    ...current.history,
    { role: "user" as const, content: userMessage },
    { role: "assistant" as const, content: assistantMessage },
  ].slice(-12);

  current.history = updatedHistory;

  store.set(key, current);

  await upstashCommand([
    "SET",
    `history:${key}`,
    JSON.stringify(current.history),
  ]);
}
