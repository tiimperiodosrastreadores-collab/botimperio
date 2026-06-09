import { NextResponse } from "next/server";
import {
  isEvolutionConfigured,
  logoutWhatsAppConnection,
  restartWhatsAppConnection,
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
    const body = await request.json().catch(() => ({}));
    const action = body.action === "logout" ? "logout" : "restart";

    if (action === "logout") {
      await logoutWhatsAppConnection();
    } else {
      await restartWhatsAppConnection();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na conexão";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
