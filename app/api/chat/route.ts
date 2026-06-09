import { NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/openai";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history
      : [];

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Mensagem é obrigatória" },
        { status: 400 }
      );
    }

    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId : "default";

    const reply = await generateChatResponse(message.trim(), {
      channel: "web",
      sessionId,
      history,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Erro no chat:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
