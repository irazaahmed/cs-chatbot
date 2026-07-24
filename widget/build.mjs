import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Anything under /public is served by Next.js at the root path, so this
// lands at /widget.js on whatever origin runs the app — no separate static
// file server needed. In production, cdn.cybrumsolutions.dev points at the
// same VPS with a Cloudflare cache rule on this one path (section 8).
const outfile = path.join(__dirname, "..", "public", "widget.js");
const MAX_GZIPPED_BYTES = 30 * 1024;

await build({
  entryPoints: [path.join(__dirname, "src", "index.ts")],
  outfile,
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2018"],
  logLevel: "info",
});

const gzipped = gzipSync(readFileSync(outfile));
const kb = (gzipped.length / 1024).toFixed(2);
console.log(`widget.js gzipped size: ${kb} KB`);

if (gzipped.length > MAX_GZIPPED_BYTES) {
  console.error(`Exceeds ${MAX_GZIPPED_BYTES / 1024} KB budget (CLAUDE.md section 8).`);
  process.exit(1);
}
