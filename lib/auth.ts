const AUTH_PAYLOAD = "imperio-authenticated";

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.INTERNAL_PASSWORD || "";
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return bufferToHex(signature);
}

export async function createAuthToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET ou INTERNAL_PASSWORD não configurado");
  }
  return hmacSha256(secret, AUTH_PAYLOAD);
}

export async function verifyAuthToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const secret = getSecret();
  if (!secret) return false;

  const expected = await createAuthToken();
  return timingSafeEqual(token, expected);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.INTERNAL_PASSWORD || "";
  if (!expected) return false;
  return timingSafeEqual(password, expected);
}
