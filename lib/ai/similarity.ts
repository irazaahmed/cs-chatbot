// Shared by lib/db/vector.ts (real tenant chat) and lib/preview/store.ts
// (landing-page preview) so the two retrieval paths can't drift out of sync
// again like they did when this was 0.3 in both places independently.
//
// 0.3 was calibrated wrong: text-embedding-3-small on short marketing-copy
// chunks puts genuinely on-topic but generically-phrased questions well
// below it. Measured directly against a real site (2026-08-16): "what is
// this website about?" scored 0.19 against its own homepage content, "ye
// website kis baray me hai?" scored 0.17 - both got silently dropped,
// producing "I don't have any information" for the single most common
// first question a demo visitor asks. Clearly off-topic questions ("how do
// I bake a chocolate cake?", "what is the capital of France?") topped out
// around 0.08 in the same test. 0.15 sits between those two clusters.
export const SIMILARITY_FLOOR = 0.15;
