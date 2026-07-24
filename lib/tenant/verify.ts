import { resolveTxt } from "node:dns/promises";
import * as cheerio from "cheerio";
import { fetchText } from "@/lib/crawl/fetch";
import { assertSafeUrl } from "@/lib/security/url";

export type VerifyMethod = "meta" | "file" | "dns";

async function checkMeta(websiteUrl: string, token: string): Promise<boolean> {
  const url = await assertSafeUrl(websiteUrl);
  const html = await fetchText(url.toString());
  if (!html) return false;
  const content = cheerio.load(html)('meta[name="cybrum-verify"]').attr("content");
  return content?.trim() === token;
}

async function checkFile(websiteUrl: string, token: string): Promise<boolean> {
  const origin = (await assertSafeUrl(websiteUrl)).origin;
  const text = await fetchText(`${origin}/.well-known/cybrum-verify.txt`);
  return text?.trim() === token;
}

async function checkDns(websiteUrl: string, token: string): Promise<boolean> {
  const hostname = new URL(websiteUrl).hostname;
  try {
    const records = await resolveTxt(hostname);
    const expected = `cybrum-verify=${token}`;
    return records.some((chunks) => chunks.join("").trim() === expected);
  } catch {
    return false;
  }
}

/** Section 6: fetch-and-string-check ownership verification, one of three methods. */
export async function verifyOwnership(
  websiteUrl: string,
  token: string,
  method: VerifyMethod
): Promise<boolean> {
  try {
    if (method === "meta") return await checkMeta(websiteUrl, token);
    if (method === "file") return await checkFile(websiteUrl, token);
    return await checkDns(websiteUrl, token);
  } catch {
    return false;
  }
}
