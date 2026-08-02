// whatsapp-rust-bridge (a transitive dependency of @whiskeysockets/baileys,
// used for its Rust/WASM crypto primitives) ships an "exports" map with only
// an "import" condition, no "require" one, so any CJS-style resolution of
// it (which Node's `require(esm)` support still goes through) fails with
// ERR_PACKAGE_PATH_NOT_EXPORTED, even though the target file itself loads
// fine either way. Runs from postinstall since node_modules gets rebuilt on
// every `npm install`, both locally and on every deploy.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const pkgPath = "node_modules/whatsapp-rust-bridge/package.json";
if (!existsSync(pkgPath)) {
  // Not installed (e.g. baileys version bump dropped it), nothing to fix.
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const exportsEntry = pkg.exports?.["."];
if (exportsEntry && typeof exportsEntry === "object" && !exportsEntry.require) {
  exportsEntry.require = exportsEntry.import;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n");
  console.log("[fix-whatsapp-rust-bridge] added missing 'require' export condition");
}
