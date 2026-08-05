import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "./client";

// All raw pgvector SQL lives here and nowhere else (CLAUDE.md section 4).
// Every query is explicitly scoped by tenantId — Prisma's query extension
// (lib/db/scoped.ts) can't help here since this bypasses the Prisma Client
// query layer entirely, so the WHERE "tenantId" = ... clause is load-bearing.

export interface DocumentChunk {
  sourceUrl: string;
  title: string | null;
  content: string;
  tokenCount: number;
  embedding: number[];
  // On-disk path for uploaded (non-"web") chunks, so a later delete can also
  // remove the physical file. Null/omitted for crawled pages.
  filePath?: string | null;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

const INSERT_BATCH_SIZE = 200;

async function insertChunks(
  tx: Prisma.TransactionClient,
  tenantId: string,
  kind: string,
  chunks: DocumentChunk[]
): Promise<void> {
  // Batched multi-row INSERTs instead of one round-trip per chunk — with
  // hundreds of chunks, per-row awaits blew past the interactive
  // transaction's default 5s timeout on Neon's network latency.
  for (let i = 0; i < chunks.length; i += INSERT_BATCH_SIZE) {
    const batch = chunks.slice(i, i + INSERT_BATCH_SIZE);
    const rows = batch.map(
      (chunk) => Prisma.sql`(
        ${randomUUID()}, ${tenantId}, ${chunk.sourceUrl}, ${chunk.title}, ${chunk.content},
        ${chunk.tokenCount}, ${toVectorLiteral(chunk.embedding)}::vector, ${kind}, ${chunk.filePath ?? null}
      )`
    );
    await tx.$executeRaw`
      INSERT INTO "Document" (id, "tenantId", "sourceUrl", title, content, "tokenCount", embedding, kind, "filePath")
      VALUES ${Prisma.join(rows)}
    `;
  }
}

/**
 * Deletes existing *web-sourced* documents for a tenant and inserts the new
 * crawl result, atomically. Scoped to kind='web' so a recrawl never wipes
 * out uploaded files (see replaceUploadedDocument).
 */
export async function replaceDocuments(tenantId: string, chunks: DocumentChunk[]): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`DELETE FROM "Document" WHERE "tenantId" = ${tenantId} AND kind = 'web'`;
      await insertChunks(tx, tenantId, "web", chunks);
    },
    { timeout: 30_000 }
  );
}

/**
 * Deletes any existing chunks for this specific uploaded file (so
 * re-uploading the same file replaces just its own content) and inserts the
 * new set. Never touches web-crawled documents or other uploads. Shared by
 * both the "pdf" and "docx" upload kinds — only kind + sourceUrl differ.
 *
 * Also unlinks the previous upload's physical file once the DB swap commits:
 * each upload gets a fresh randomly-named file on disk (lib/knowledge/file-storage.ts),
 * so without this, re-uploading the same filename repeatedly would leak one
 * orphaned file per re-upload forever.
 */
export async function replaceUploadedDocument(
  tenantId: string,
  kind: string,
  sourceUrl: string,
  chunks: DocumentChunk[]
): Promise<void> {
  const previous = await prisma.document.findMany({
    where: { tenantId, kind, sourceUrl, filePath: { not: null } },
    select: { filePath: true },
    distinct: ["filePath"],
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "Document" WHERE "tenantId" = ${tenantId} AND kind = ${kind} AND "sourceUrl" = ${sourceUrl}
      `;
      await insertChunks(tx, tenantId, kind, chunks);
    },
    { timeout: 30_000 }
  );

  for (const { filePath } of previous) {
    if (filePath) await unlink(filePath).catch(() => {});
  }
}

export interface SimilarityMatch {
  sourceUrl: string;
  title: string | null;
  content: string;
  similarity: number;
}

const SIMILARITY_FLOOR = 0.3;

export async function similaritySearch(
  tenantId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<SimilarityMatch[]> {
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  const rows = await prisma.$queryRaw<
    { sourceUrl: string; title: string | null; content: string; similarity: number }[]
  >`
    SELECT "sourceUrl", title, content, 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "Document"
    WHERE "tenantId" = ${tenantId}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;
  return rows.filter((row) => row.similarity >= SIMILARITY_FLOOR);
}
