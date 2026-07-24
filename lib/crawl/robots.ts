import { fetchText, USER_AGENT } from "./fetch";

interface RuleSet {
  allow: string[];
  disallow: string[];
}

export interface RobotsChecker {
  isAllowed(path: string): boolean;
}

const ALLOW_ALL: RobotsChecker = { isAllowed: () => true };

function agentToken(): string {
  return USER_AGENT.split("/")[0].toLowerCase();
}

/**
 * Minimal robots.txt parser: longest-matching-prefix rule per the de facto
 * standard, checking our own user-agent group first and falling back to `*`.
 * Not a full RFC 9309 implementation, but enough to respect Disallow rules.
 */
function parseRobots(text: string): RuleSet {
  const groups = new Map<string, RuleSet>();
  let currentAgents: string[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [] });
      currentAgents = [agent];
      continue;
    }
    if (currentAgents.length === 0) continue;

    if (key === "allow") {
      for (const agent of currentAgents) groups.get(agent)!.allow.push(value);
    } else if (key === "disallow") {
      for (const agent of currentAgents) groups.get(agent)!.disallow.push(value);
    }
  }

  const ourAgent = agentToken();
  for (const [agent, rules] of groups) {
    if (agent.includes(ourAgent)) return rules;
  }
  return groups.get("*") ?? { allow: [], disallow: [] };
}

function matches(path: string, pattern: string): boolean {
  if (pattern === "") return false;
  return path.startsWith(pattern);
}

export async function loadRobots(origin: string): Promise<RobotsChecker> {
  const text = await fetchText(new URL("/robots.txt", origin).toString());
  if (!text) return ALLOW_ALL;

  const rules = parseRobots(text);
  if (rules.disallow.length === 0) return ALLOW_ALL;

  return {
    isAllowed(path: string): boolean {
      const disallowMatch = rules.disallow
        .filter((p) => matches(path, p))
        .sort((a, b) => b.length - a.length)[0];
      if (!disallowMatch) return true;

      const allowMatch = rules.allow
        .filter((p) => matches(path, p))
        .sort((a, b) => b.length - a.length)[0];
      if (allowMatch && allowMatch.length >= disallowMatch.length) return true;

      return false;
    },
  };
}
