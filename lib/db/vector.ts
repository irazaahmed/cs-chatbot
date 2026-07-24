import { Pool } from "pg";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai/provider";

// All raw pgvector SQL lives here and nowhere else (CLAUDE.md section 4).
// Phase 0 uses a standalone `phase0_documents` table scoped by `site`
// instead of the full multi-tenant Document model — there is no tenant
// concept yet, this is purely to prove retrieval quality.

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        await client.query(`
          CREATE TABLE IF NOT EXISTS phase0_documents (
            id SERIAL PRIMARY KEY,
            site TEXT NOT NULL,
            source_url TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            token_count INT NOT NULL,
            embedding vector(${EMBEDDING_DIMENSIONS}) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);
        await client.query(
          `CREATE INDEX IF NOT EXISTS phase0_documents_site_idx ON phase0_documents (site)`
        );
      } finally {
        client.release();
      }
    })();
  }
  return schemaReady;
}

export interface DocumentChunk {
  site: string;
  sourceUrl: string;
  title: string | null;
  content: string;
  tokenCount: number;
  embedding: number[];
}

export async function clearSite(site: string): Promise<void> {
  await ensureSchema();
  await getPool().query("DELETE FROM phase0_documents WHERE site = $1", [site]);
}

export async function insertChunks(chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO phase0_documents (site, source_url, title, content, token_count, embedding)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          chunk.site,
          chunk.sourceUrl,
          chunk.title,
          chunk.content,
          chunk.tokenCount,
          `[${chunk.embedding.join(",")}]`,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
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
  site: string,
  queryEmbedding: number[],
  topK = 5
): Promise<SimilarityMatch[]> {
  await ensureSchema();
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  const res = await getPool().query(
    `SELECT source_url, title, content, 1 - (embedding <=> $1) AS similarity
     FROM phase0_documents
     WHERE site = $2
     ORDER BY embedding <=> $1
     LIMIT $3`,
    [vectorLiteral, site, topK]
  );
  return res.rows
    .map((row) => ({
      sourceUrl: row.source_url as string,
      title: row.title as string | null,
      content: row.content as string,
      similarity: Number(row.similarity),
    }))
    .filter((match) => match.similarity >= SIMILARITY_FLOOR);
}
