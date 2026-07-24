import { randomUUID } from "node:crypto";
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
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

const INSERT_BATCH_SIZE = 200;

/** Deletes all existing documents for a tenant and inserts the new set, atomically. */
export async function replaceDocuments(tenantId: string, chunks: DocumentChunk[]): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`DELETE FROM "Document" WHERE "tenantId" = ${tenantId}`;

      // Batched multi-row INSERTs instead of one round-trip per chunk — with
      // hundreds of chunks, per-row awaits blew past the interactive
      // transaction's default 5s timeout on Neon's network latency.
      for (let i = 0; i < chunks.length; i += INSERT_BATCH_SIZE) {
        const batch = chunks.slice(i, i + INSERT_BATCH_SIZE);
        const rows = batch.map(
          (chunk) => Prisma.sql`(
            ${randomUUID()}, ${tenantId}, ${chunk.sourceUrl}, ${chunk.title}, ${chunk.content},
            ${chunk.tokenCount}, ${toVectorLiteral(chunk.embedding)}::vector
          )`
        );
        await tx.$executeRaw`
          INSERT INTO "Document" (id, "tenantId", "sourceUrl", title, content, "tokenCount", embedding)
          VALUES ${Prisma.join(rows)}
        `;
      }
    },
    { timeout: 30_000 }
  );
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
