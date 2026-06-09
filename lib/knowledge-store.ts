import fs from "fs";
import path from "path";
import { del, list, put } from "@vercel/blob";

export const SUPPORTED_EXTENSIONS = [".md", ".txt"];
export const BLOB_PREFIX = "knowledge/";

export interface KnowledgeFile {
  name: string;
  source: "builtin" | "upload";
  size: number;
  updatedAt: string;
  url?: string;
}

function getUploadsDir(): string {
  return path.join(process.cwd(), "knowledge", "uploads");
}

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(base).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error("Apenas arquivos .md e .txt são permitidos");
  }

  return base;
}

function getBuiltinFiles(): KnowledgeFile[] {
  const knowledgeDir = path.join(process.cwd(), "knowledge");

  if (!fs.existsSync(knowledgeDir)) return [];

  const files: KnowledgeFile[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "uploads") continue;
        walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

      const stat = fs.statSync(fullPath);
      const relative = path
        .relative(knowledgeDir, fullPath)
        .split(path.sep)
        .join("/");

      files.push({
        name: relative,
        source: "builtin",
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }

  walk(knowledgeDir);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

function getLocalUploadFiles(): KnowledgeFile[] {
  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) return [];

  return fs
    .readdirSync(uploadsDir)
    .filter((name) =>
      SUPPORTED_EXTENSIONS.includes(path.extname(name).toLowerCase())
    )
    .map((name) => {
      const fullPath = path.join(uploadsDir, name);
      const stat = fs.statSync(fullPath);
      return {
        name: `uploads/${name}`,
        source: "upload" as const,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getBlobUploadFiles(): Promise<KnowledgeFile[]> {
  if (!isBlobEnabled()) return [];

  const result = await list({ prefix: BLOB_PREFIX });

  return result.blobs
    .filter((blob) => {
      const name = blob.pathname.replace(BLOB_PREFIX, "");
      return SUPPORTED_EXTENSIONS.includes(path.extname(name).toLowerCase());
    })
    .map((blob) => ({
      name: `uploads/${blob.pathname.replace(BLOB_PREFIX, "")}`,
      source: "upload" as const,
      size: blob.size,
      updatedAt: blob.uploadedAt.toISOString(),
      url: blob.url,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listKnowledgeFiles(): Promise<KnowledgeFile[]> {
  const builtin = getBuiltinFiles();
  const uploads = isBlobEnabled()
    ? await getBlobUploadFiles()
    : getLocalUploadFiles();

  return [...builtin, ...uploads];
}

export async function readKnowledgeContent(filename: string): Promise<string | null> {
  if (filename.startsWith("uploads/")) {
    const uploadName = filename.replace(/^uploads\//, "");

    if (isBlobEnabled()) {
      const result = await list({ prefix: `${BLOB_PREFIX}${uploadName}` });
      const blob = result.blobs[0];
      if (!blob?.url) return null;

      const response = await fetch(blob.url);
      if (!response.ok) return null;
      return response.text();
    }

    const localPath = path.join(getUploadsDir(), uploadName);
    if (!fs.existsSync(localPath)) return null;
    return fs.readFileSync(localPath, "utf-8");
  }

  const builtinPath = path.join(process.cwd(), "knowledge", filename);
  if (!fs.existsSync(builtinPath)) return null;
  return fs.readFileSync(builtinPath, "utf-8");
}

export async function saveKnowledgeFile(
  filename: string,
  content: Buffer | string
): Promise<KnowledgeFile> {
  const safeName = sanitizeFilename(filename);
  const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

  if (isBlobEnabled()) {
    const blob = await put(`${BLOB_PREFIX}${safeName}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: safeName.endsWith(".md")
        ? "text/markdown"
        : "text/plain",
    });

    return {
      name: `uploads/${safeName}`,
      source: "upload",
      size: buffer.length,
      updatedAt: new Date().toISOString(),
      url: blob.url,
    };
  }

  const uploadsDir = getUploadsDir();
  fs.mkdirSync(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, safeName);
  fs.writeFileSync(filePath, buffer);

  return {
    name: `uploads/${safeName}`,
    source: "upload",
    size: buffer.length,
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteKnowledgeFile(filename: string): Promise<void> {
  if (!filename.startsWith("uploads/")) {
    throw new Error("Apenas arquivos enviados podem ser excluídos");
  }

  const uploadName = filename.replace(/^uploads\//, "");

  if (isBlobEnabled()) {
    const result = await list({ prefix: `${BLOB_PREFIX}${uploadName}` });
    const blob = result.blobs[0];
    if (blob) await del(blob.url);
    return;
  }

  const localPath = path.join(getUploadsDir(), uploadName);
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
}
