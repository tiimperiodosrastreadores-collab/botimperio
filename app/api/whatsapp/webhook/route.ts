import { NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/openai";
import {
  extractEvolutionMessages,
  isAllowedWhatsAppNumber,
  isEvolutionConfigured,
  sendWhatsAppText,
} from "@/lib/evolution";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isEvolutionConfigured()) {
    return NextResponse.json(
      { error: "Evolution API não configurada" },
      { status: 503 }
    );
  }

  try {
    const payload = await request.json();
    const messages = extractEvolutionMessages(payload);

    for (const message of messages) {
      if (!isAllowedWhatsAppNumber(message.from)) {
        await sendWhatsAppText(
          message.from,
          "Este número não está autorizado a usar o assistente interno."
        );
        continue;
      }

      const reply = await generateChatResponse(message.text, {
        channel: "whatsapp",
        sessionId: message.from,
      });

      await sendWhatsAppText(message.from, reply);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no webhook WhatsApp:", error);
    return NextResponse.json({ success: true });
  }
}
