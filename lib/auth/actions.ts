"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db/client";

// Shared by /login and the landing-page preview CTA — both just need to
// start the Google OAuth round trip and land on /home (the dashboard home),
// which already redirects to /onboarding for accounts with no tenant yet.
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/home" });
}

/**
 * Creates a User with a hashed password. Never touches an existing account —
 * an email that's already registered (Google or Credentials) redirects back
 * with an error instead of upserting, so this can't silently attach to or
 * overwrite someone else's account.
 */
export async function signUp(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    redirect("/signup?error=validation");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=exists");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash } });

  await signIn("credentials", { email, password, redirectTo: "/home" });
}

/** Signs an existing user in. Wrong email/password redirects back with an error. */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/home" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error; // re-throw NEXT_REDIRECT (the success case) and anything unexpected
  }
}
