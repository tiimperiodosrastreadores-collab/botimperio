"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type QrState = {
  connected: boolean;
  qrCode: string | null;
  pairingCode: string | null;
  loading: boolean;
  error: string | null;
  state: string;
};

export default function WhatsAppAdminPage() {
  const [qr, setQr] = useState<QrState>({
    connected: false,
    qrCode: null,
    pairingCode: null,
    loading: true,
    error: null,
    state: "close",
  });

  const refresh = useCallback(async () => {
    setQr((current) => ({ ...current, loading: true, error: null }));

    try {
      const statusResponse = await fetch("/api/whatsapp/status");
      const statusData = await statusResponse.json();

      if (statusData.connected) {
        setQr({
          connected: true,
          qrCode: null,
          pairingCode: null,
          loading: false,
          error: null,
          state: statusData.state,
        });
        return;
      }

      const qrResponse = await fetch("/api/whatsapp/qrcode");
      const qrData = await qrResponse.json();

      if (!qrResponse.ok) {
        throw new Error(qrData.error || "Não foi possível gerar o QR Code");
      }

      setQr({
        connected: qrData.connected,
        qrCode: qrData.qrCode,
        pairingCode: qrData.pairingCode,
        loading: false,
        error: null,
        state: statusData.state ?? "connecting",
      });
    } catch (error) {
      setQr({
        connected: false,
        qrCode: null,
        pairingCode: null,
        loading: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        state: "error",
      });
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleAction(action: "restart" | "logout") {
    setQr((current) => ({ ...current, loading: true, error: null }));

    await fetch("/api/whatsapp/restart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setTimeout(refresh, 1500);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="text-sm text-slate-400 transition hover:text-white"
        >
          ← Voltar ao chat
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Conectar WhatsApp</h1>
        <p className="mt-2 text-sm text-slate-400">
          Escaneie o QR Code com o WhatsApp do celular da empresa (Aparelhos
          conectados → Conectar aparelho).
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {qr.loading && (
            <p className="text-center text-slate-400">Carregando...</p>
          )}

          {!qr.loading && qr.error && (
            <div className="space-y-4 text-center">
              <p className="text-red-300">{qr.error}</p>
              <p className="text-sm text-slate-400">
                Verifique se a Evolution API está rodando (Docker na porta
                8080).
              </p>
              <button
                onClick={refresh}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!qr.loading && !qr.error && qr.connected && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">✅</div>
              <p className="text-lg font-semibold text-green-400">
                WhatsApp conectado!
              </p>
              <p className="text-sm text-slate-400">
                O bot já pode responder mensagens no Zap.
              </p>
              <button
                onClick={() => handleAction("logout")}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300"
              >
                Desconectar
              </button>
            </div>
          )}

          {!qr.loading && !qr.error && !qr.connected && qr.qrCode && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-300">
                Abra o WhatsApp → Menu → Aparelhos conectados → Conectar
                aparelho
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.qrCode}
                alt="QR Code WhatsApp"
                className="mx-auto w-64 rounded-xl bg-white p-3"
              />
              {qr.pairingCode && (
                <p className="text-sm text-slate-400">
                  Código de pareamento:{" "}
                  <span className="font-mono text-white">{qr.pairingCode}</span>
                </p>
              )}
              <p className="text-xs text-slate-500">
                O QR Code atualiza automaticamente a cada 8 segundos.
              </p>
            </div>
          )}

          {!qr.loading && !qr.error && !qr.connected && !qr.qrCode && (
            <div className="space-y-4 text-center">
              <p className="text-slate-300">Aguardando QR Code...</p>
              <button
                onClick={() => handleAction("restart")}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Gerar novo QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
