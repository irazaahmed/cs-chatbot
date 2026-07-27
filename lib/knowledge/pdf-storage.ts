import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Same pattern as lib/billing/proof-storage.ts: VPS local disk, no vendor
// bucket. Unlike a payment screenshot, nothing ever needs to re-serve this
// file — the worker reads it once to extract text (see worker.ts's
// "pdf_ingest" job) and the extracted text is what actually gets embedded,
// so there's no authenticated-download route for these.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "knowledge-pdfs");
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function savePdfFile(tenantId: string, docId: string, file: File): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${tenantId}-${docId}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return path.join(UPLOAD_DIR, filename);
}
