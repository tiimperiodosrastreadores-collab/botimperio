import { NextResponse } from "next/server";
import {
  getQrCode,
  isEvolutionConfigured,
  setupEvolutionInstance,
} from "@/lib/evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isEvolutionConfigured()) {
    return NextResponse.json(
      { error: "Evolution API não configurada" },
      { status: 503 }
    );
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin);

    await setupEvolutionInstance(`${appUrl}/api/whatsapp/webhook`);

    const qr = await getQrCode();
    return NextResponse.json(qr);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar QR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
