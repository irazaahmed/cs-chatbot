// Same pattern as lib/billing/proof-storage.ts was going to be — except the
// app and worker run as separate Coolify services (separate containers, no
// shared volume between them, see [[vps-deployment-target]]), so writing to
// local disk here and reading it back from worker.ts's "pdf_ingest"/
// "docx_ingest" jobs always ENOENTs in production: the worker container has
// never seen the app container's filesystem. Instead the file's bytes travel
// through the Job's payload (Postgres, reachable from both processes) as
// base64, and nothing is ever written to disk at all.
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export type UploadKind = "pdf" | "docx";

const ALLOWED_MIME: Record<UploadKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const EXTENSION: Record<UploadKind, string> = {
  pdf: ".pdf",
  docx: ".docx",
};

/** Best-effort MIME sniff — browsers don't always set .docx's MIME type correctly. */
export function detectUploadKind(file: File): UploadKind | null {
  if (file.type === ALLOWED_MIME.pdf || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type === ALLOWED_MIME.docx || file.name.toLowerCase().endsWith(".docx")) return "docx";
  return null;
}

export async function readKnowledgeFile(file: File, kind: UploadKind): Promise<string> {
  if (file.type && file.type !== ALLOWED_MIME[kind] && !file.name.toLowerCase().endsWith(EXTENSION[kind])) {
    throw new Error(`Only ${kind.toUpperCase()} files are allowed.`);
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}
