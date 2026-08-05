import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Same pattern as lib/billing/proof-storage.ts: VPS local disk, no vendor
// bucket. Unlike a payment screenshot, nothing ever needs to re-serve these
// files — the worker reads them once to extract text (see worker.ts's
// "pdf_ingest"/"docx_ingest" jobs) and the extracted text is what actually
// gets embedded, so there's no authenticated-download route for these.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "knowledge-files");
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

export async function saveKnowledgeFile(
  tenantId: string,
  docId: string,
  file: File,
  kind: UploadKind
): Promise<string> {
  if (file.type && file.type !== ALLOWED_MIME[kind] && !file.name.toLowerCase().endsWith(EXTENSION[kind])) {
    throw new Error(`Only ${kind.toUpperCase()} files are allowed.`);
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${tenantId}-${docId}${EXTENSION[kind]}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return path.join(UPLOAD_DIR, filename);
}
