import fs from "fs";
import path from "path";
import { listKnowledgeFiles, readKnowledgeContent } from "./knowledge-store";

export interface KnowledgeChunk {
  source: string;
  content: string;
}

const SUPPORTED_EXTENSIONS = [".md", ".txt"];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\W+/)
    .filter((word) => word.length > 2);
}

function splitIntoChunks(content: string, source: string): KnowledgeChunk[] {
  const sections = content
    .split(/(?=^#{1,3}\s)/m)
    .map((section) => section.trim())
    .filter((section) => section.length > 30);

  if (sections.length === 0 && content.trim().length > 0) {
    return [{ source, content: content.trim() }];
  }

  return sections.map((section) => ({ source, content: section }));
}

function loadBuiltinFromDisk(): KnowledgeChunk[] {
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  if (!fs.existsSync(knowledgeDir)) return [];

  const chunks: KnowledgeChunk[] = [];

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

      const content = fs.readFileSync(fullPath, "utf-8");
      const source = path.relative(knowledgeDir, fullPath).split(path.sep).join("/");
      chunks.push(...splitIntoChunks(content, source));
    }
  }

  walk(knowledgeDir);
  return chunks;
}

let cachedChunks: KnowledgeChunk[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

export function clearKnowledgeCache(): void {
  cachedChunks = null;
  cacheTimestamp = 0;
}

export async function loadKnowledge(): Promise<KnowledgeChunk[]> {
  const now = Date.now();
  if (cachedChunks && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedChunks;
  }

  const files = await listKnowledgeFiles();
  const chunks: KnowledgeChunk[] = [];

  for (const file of files) {
    const content = await readKnowledgeContent(file.name);
    if (!content?.trim()) continue;
    chunks.push(...splitIntoChunks(content, file.name));
  }

  if (chunks.length === 0) {
    cachedChunks = loadBuiltinFromDisk();
  } else {
    cachedChunks = chunks;
  }

  cacheTimestamp = now;
  return cachedChunks;
}

export async function searchRelevantChunks(
  query: string,
  topK = 5
): Promise<KnowledgeChunk[]> {
  const chunks = await loadKnowledge();
  const queryTokens = new Set(tokenize(query));

  if (queryTokens.size === 0) return chunks.slice(0, topK);

  const scored = chunks.map((chunk) => {
    const tokens = tokenize(chunk.content);
    let score = 0;

    for (const token of tokens) {
      if (queryTokens.has(token)) score++;
    }

    return { chunk, score };
  });

  const relevant = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk);

  if (relevant.length > 0) return relevant;

  return chunks.slice(0, Math.min(topK, chunks.length));
}

export function buildContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) {
    return "Nenhum documento encontrado na base de conhecimento.";
  }

  return chunks
    .map((chunk) => `--- Fonte: ${chunk.source} ---\n${chunk.content}`)
    .join("\n\n");
}
