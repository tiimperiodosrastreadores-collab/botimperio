import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { clearKnowledgeCache } from "@/lib/rag";
import { BLOB_PREFIX } from "@/lib/knowledge-store";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_SIZE_BYTES = 500 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage não configurado. Use upload local." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const name = pathname.replace(BLOB_PREFIX, "").toLowerCase();
        const allowed =
          name.endsWith(".md") ||
          name.endsWith(".txt") ||
          pathname.startsWith(BLOB_PREFIX);

        if (!allowed) {
          throw new Error("Apenas arquivos .md e .txt são permitidos");
        }

        return {
          allowedContentTypes: [
            "text/plain",
            "text/markdown",
            "application/octet-stream",
          ],
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        clearKnowledgeCache();
      },
    });

    clearKnowledgeCache();
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
