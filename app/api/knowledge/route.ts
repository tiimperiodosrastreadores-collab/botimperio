import { NextResponse } from "next/server";
import { clearKnowledgeCache } from "@/lib/rag";
import {
  deleteKnowledgeFile,
  listKnowledgeFiles,
  saveKnowledgeFile,
} from "@/lib/knowledge-store";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  try {
    const files = await listKnowledgeFiles();
    return NextResponse.json({
      files,
      storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const uploaded = formData.getAll("files");
      const saved = [];

      for (const item of uploaded) {
        if (!(item instanceof File)) continue;

        const buffer = Buffer.from(await item.arrayBuffer());
        const file = await saveKnowledgeFile(item.name, buffer);
        saved.push(file);
      }

      if (saved.length === 0) {
        const text = formData.get("text");
        const filename = formData.get("filename");

        if (typeof text === "string" && typeof filename === "string") {
          const file = await saveKnowledgeFile(filename, text);
          saved.push(file);
        }
      }

      if (saved.length === 0) {
        return NextResponse.json(
          { error: "Nenhum arquivo enviado" },
          { status: 400 }
        );
      }

      clearKnowledgeCache();
      return NextResponse.json({ success: true, files: saved });
    }

    const body = await request.json();

    if (typeof body.text === "string" && typeof body.filename === "string") {
      const file = await saveKnowledgeFile(body.filename, body.text);
      clearKnowledgeCache();
      return NextResponse.json({ success: true, files: [file] });
    }

    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Nome do arquivo é obrigatório" },
        { status: 400 }
      );
    }

    await deleteKnowledgeFile(filename);
    clearKnowledgeCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
