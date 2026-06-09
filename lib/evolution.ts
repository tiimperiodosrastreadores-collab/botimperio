export interface EvolutionTextMessage {
  from: string;
  id: string;
  text: string;
}

function getConfig() {
  const apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME || "botimperio";

  if (!apiUrl || !apiKey) {
    throw new Error("Evolution API não configurada");
  }

  return { apiUrl, apiKey, instance };
}

export function isEvolutionConfigured(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

export function isAllowedWhatsAppNumber(phone: string): boolean {
  const allowed = process.env.WHATSAPP_ALLOWED_NUMBERS?.trim();
  if (!allowed) return true;

  const normalizedPhone = phone.replace(/\D/g, "");
  const allowedNumbers = allowed
    .split(",")
    .map((item) => item.replace(/\D/g, ""))
    .filter(Boolean);

  return allowedNumbers.some(
    (item) => normalizedPhone === item || normalizedPhone.endsWith(item)
  );
}

function extractMessageText(message: Record<string, unknown>): string | null {
  if (typeof message.conversation === "string") return message.conversation;

  const extended = message.extendedTextMessage as
    | { text?: string }
    | undefined;
  if (extended?.text) return extended.text;

  const buttons = message.buttonsResponseMessage as
    | { selectedDisplayText?: string }
    | undefined;
  if (buttons?.selectedDisplayText) return buttons.selectedDisplayText;

  return null;
}

function jidToPhone(jid: string): string {
  return jid.replace(/@.*/, "").replace(/\D/g, "");
}

export function extractEvolutionMessages(payload: unknown): EvolutionTextMessage[] {
  const messages: EvolutionTextMessage[] = [];
  if (!payload || typeof payload !== "object") return messages;

  const body = payload as {
    event?: string;
    data?: unknown;
  };

  const event = body.event?.toLowerCase() ?? "";
  if (!event.includes("messages")) return messages;

  const items = Array.isArray(body.data) ? body.data : [body.data];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const record = item as {
      key?: { remoteJid?: string; fromMe?: boolean; id?: string };
      message?: Record<string, unknown>;
    };

    if (record.key?.fromMe) continue;

    const jid = record.key?.remoteJid;
    const text = record.message ? extractMessageText(record.message) : null;

    if (!jid || !text?.trim()) continue;
    if (jid.includes("@g.us")) continue;

    messages.push({
      from: jidToPhone(jid),
      id: record.key?.id ?? `${jid}-${Date.now()}`,
      text: text.trim(),
    });
  }

  return messages;
}

async function evolutionRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { apiUrl, apiKey } = getConfig();

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<void> {
  const { instance } = getConfig();
  const number = to.replace(/\D/g, "");

  await evolutionRequest(`/message/sendText/${instance}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
}

export async function getConnectionState(): Promise<{
  state: string;
  connected: boolean;
}> {
  const { instance } = getConfig();

  try {
    const data = await evolutionRequest<{ instance?: { state?: string } }>(
      `/instance/connectionState/${instance}`
    );

    const state = data.instance?.state ?? "close";
    return {
      state,
      connected: state === "open",
    };
  } catch {
    return { state: "close", connected: false };
  }
}

export async function getQrCode(): Promise<{
  connected: boolean;
  qrCode: string | null;
  pairingCode: string | null;
}> {
  const { instance } = getConfig();
  const status = await getConnectionState();

  if (status.connected) {
    return { connected: true, qrCode: null, pairingCode: null };
  }

  const data = await evolutionRequest<{
    base64?: string;
    code?: string;
    pairingCode?: string;
  }>(`/instance/connect/${instance}`, { method: "GET" });

  const qrCode = data.base64
    ? data.base64.startsWith("data:")
      ? data.base64
      : `data:image/png;base64,${data.base64}`
    : null;

  return {
    connected: false,
    qrCode,
    pairingCode: data.pairingCode ?? null,
  };
}

export async function setupEvolutionInstance(
  webhookUrl: string
): Promise<void> {
  const { instance } = getConfig();

  try {
    await evolutionRequest(`/instance/fetchInstances`, { method: "GET" });
  } catch {
    // API reachable
  }

  try {
    await evolutionRequest(`/instance/connectionState/${instance}`, {
      method: "GET",
    });
    return;
  } catch {
    // Instance does not exist yet
  }

  await evolutionRequest(`/instance/create`, {
    method: "POST",
    body: JSON.stringify({
      instanceName: instance,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT"],
      },
    }),
  });
}

export async function restartWhatsAppConnection(): Promise<void> {
  const { instance } = getConfig();

  await evolutionRequest(`/instance/restart/${instance}`, {
    method: "POST",
  });
}

export async function logoutWhatsAppConnection(): Promise<void> {
  const { instance } = getConfig();

  await evolutionRequest(`/instance/logout/${instance}`, {
    method: "DELETE",
  });
}
