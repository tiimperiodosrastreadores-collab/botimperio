import { NextResponse } from "next/server";
import { getConnectionState, isEvolutionConfigured } from "@/lib/evolution";

export const runtime = "nodejs";

export async function GET() {
  if (!isEvolutionConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      state: "not_configured",
    });
  }

  try {
    const status = await getConnectionState();
    return NextResponse.json({
      configured: true,
      connected: status.connected,
      state: status.state,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar status";
    return NextResponse.json(
      { configured: true, connected: false, state: "error", error: message },
      { status: 500 }
    );
  }
}
