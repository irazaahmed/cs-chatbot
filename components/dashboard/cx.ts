// Tiny classnames joiner — no dependency (CLAUDE.md: ask before adding one).
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
