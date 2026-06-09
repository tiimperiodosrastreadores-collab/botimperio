"use client";

import type { KnowledgeFile } from "@/lib/knowledge-store";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeAdminPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [useBlobUpload, setUseBlobUpload] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/knowledge");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar arquivos");
      }

      setFiles(data.files ?? []);
      setUseBlobUpload(data.storage === "blob");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function uploadFiles(fileList: FileList | File[]) {
    const items = Array.from(fileList);
    if (items.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      if (useBlobUpload) {
        const { upload } = await import("@vercel/blob/client");

        for (const file of items) {
          await upload(`knowledge/${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/knowledge/upload",
            multipart: true,
          });
        }
      } else {
        const formData = new FormData();
        for (const file of items) {
          formData.append("files", file);
        }

        const response = await fetch("/api/knowledge", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro no upload");
        }
      }

      setSuccess(
        items.length === 1
          ? `"${items[0].name}" enviado com sucesso!`
          : `${items.length} arquivos enviados com sucesso!`
      );
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function saveTextContent(e: React.FormEvent) {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim()) return;

    const filename = textTitle.endsWith(".md") || textTitle.endsWith(".txt")
      ? textTitle
      : `${textTitle}.md`;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, text: textContent }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar");
      }

      setSuccess(`"${filename}" salvo com sucesso!`);
      setTextTitle("");
      setTextContent("");
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Excluir "${filename}"?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/knowledge?filename=${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir");
      }

      setSuccess("Arquivo excluído.");
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  const uploadedFiles = files.filter((f) => f.source === "upload");
  const builtinFiles = files.filter((f) => f.source === "builtin");

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-slate-400 transition hover:text-white"
        >
          ← Voltar ao chat
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Base de Conhecimento</h1>
        <p className="mt-2 text-sm text-slate-400">
          Envie arquivos .md ou .txt para atualizar o que o bot sabe. Sem limite
          de tamanho em produção (upload direto para a nuvem).
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg bg-green-950/50 px-4 py-3 text-sm text-green-300">
            {success}
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold">Enviar arquivos</h2>
          <p className="mt-1 text-sm text-slate-400">
            Arraste ou selecione um ou vários arquivos .md / .txt
          </p>

          <div
            className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 px-6 py-10 transition hover:border-red-500"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) {
                uploadFiles(e.dataTransfer.files);
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt,text/plain,text/markdown"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Escolher arquivos"}
            </button>
            <p className="mt-3 text-xs text-slate-500">
              Ou arraste os arquivos para cá
            </p>
          </div>
        </div>

        <form
          onSubmit={saveTextContent}
          className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="font-semibold">Colar texto direto</h2>
          <p className="mt-1 text-sm text-slate-400">
            Crie um documento sem precisar de arquivo
          </p>

          <input
            type="text"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="Nome do arquivo (ex: novos-comandos)"
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-red-500"
          />

          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Cole aqui o conteúdo em Markdown ou texto..."
            rows={8}
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-red-500"
          />

          <button
            type="submit"
            disabled={uploading || !textTitle.trim() || !textContent.trim()}
            className="mt-4 rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold transition hover:border-red-500 disabled:opacity-50"
          >
            Salvar documento
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Arquivos enviados ({uploadedFiles.length})</h2>
            <button
              onClick={loadFiles}
              className="text-sm text-slate-400 hover:text-white"
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Carregando...</p>
          ) : uploadedFiles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhum arquivo enviado ainda.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {uploadedFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatSize(file.size)} ·{" "}
                      {new Date(file.updatedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="shrink-0 text-sm text-red-400 hover:text-red-300"
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="font-semibold text-slate-300">
            Arquivos padrão do sistema ({builtinFiles.length})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Vêm com o projeto. Para alterar, edite no código ou envie uma versão
            nova acima.
          </p>
          <ul className="mt-4 space-y-1">
            {builtinFiles.map((file) => (
              <li key={file.name} className="text-sm text-slate-400">
                {file.name} · {formatSize(file.size)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
