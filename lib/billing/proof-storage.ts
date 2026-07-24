import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

// CLAUDE.md section 2: payment screenshots go on VPS local disk, not a
// vendor bucket. Section 10 still wants them private and served only via
// short-lived access — since there's no R2 here, "authenticated route
// handler that streams the file" (see app/api/admin/payments/[id]/proof)
// is the local-disk equivalent of a signed URL.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "payments");
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function saveProofFile(paymentId: string, file: File): Promise<string> {
  if (!(file.type in ALLOWED_TYPES)) {
    throw new Error("Only JPEG, PNG, or WEBP images are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large (max 5MB).");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = ALLOWED_TYPES[file.type];
  const filename = `${paymentId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename; // stored as Payment.proofUrl — a bare filename, never a public URL
}

export async function readProofFile(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  // path.basename defends against path traversal even though every filename
  // we ever write is our own <paymentId>.<ext>.
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).slice(1).toLowerCase();
  const contentType = Object.entries(ALLOWED_TYPES).find(([, e]) => e === ext)?.[0];
  if (!contentType) return null;

  try {
    const buffer = await readFile(path.join(UPLOAD_DIR, safeName));
    return { buffer, contentType };
  } catch {
    return null;
  }
}
