import { redirect } from "next/navigation";
import { auth } from "@/auth";

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Single-founder-stage admin gate: no roles table, no team seats system
 * (CLAUDE.md section 15 explicitly rules those out at this stage) — just an
 * allowlist of emails via env var.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  if (!isAdminEmail(email)) redirect("/playground");
  return { email };
}

/** Non-redirecting check, for conditionally showing an admin link in the UI. */
export async function checkIsAdmin(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? isAdminEmail(email) : false;
}
