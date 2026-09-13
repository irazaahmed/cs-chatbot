"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db/client";
import { sendVerificationCodeEmail } from "@/lib/email/notify";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const SignupDetailsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Shared by /login and the landing-page preview CTA — both just need to
// start the Google OAuth round trip and land on /home (the dashboard home),
// which already redirects to /onboarding for accounts with no tenant yet.
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/home" });
}

export type SignupCodeError = "validation" | "exists" | "cooldown" | "send_failed";

export interface RequestSignupCodeResult {
  ok: boolean;
  error?: SignupCodeError;
  cooldownSeconds?: number;
}

/**
 * Step 1 of email signup: validates the details, emails a 6-digit code good
 * for 10 minutes, and stores only its hash (keyed by email) — never the name
 * or password, which stay in the signup form's client state until step 2.
 * Google sign-in never goes through this; Google already verifies the email.
 */
export async function requestSignupCode(
  name: string,
  email: string,
  password: string
): Promise<RequestSignupCodeResult> {
  const parsed = SignupDetailsSchema.safeParse({ name, email, password });
  if (!parsed.success) return { ok: false, error: "validation" };
  const clean = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email: clean.email } });
  if (existingUser) return { ok: false, error: "exists" };

  const pending = await prisma.emailVerification.findUnique({ where: { email: clean.email } });
  if (pending) {
    const sinceLastSend = Date.now() - pending.lastSentAt.getTime();
    if (sinceLastSend < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        error: "cooldown",
        cooldownSeconds: Math.ceil((RESEND_COOLDOWN_MS - sinceLastSend) / 1000),
      };
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();

  const sent = await sendVerificationCodeEmail(clean.email, clean.name, code);
  if (!sent.ok) return { ok: false, error: "send_failed" };

  await prisma.emailVerification.upsert({
    where: { email: clean.email },
    create: { email: clean.email, codeHash, expiresAt: new Date(now.getTime() + CODE_TTL_MS), lastSentAt: now },
    update: { codeHash, expiresAt: new Date(now.getTime() + CODE_TTL_MS), lastSentAt: now, attempts: 0 },
  });

  return { ok: true };
}

export type VerifySignupCodeError = "expired" | "invalid_code" | "too_many_attempts" | "exists";

export interface VerifySignupCodeResult {
  ok: boolean;
  error?: VerifySignupCodeError;
}

/**
 * Step 2: checks the code against the stored hash, and only then creates the
 * User with a freshly-hashed password — mirroring signUp's old guarantee that
 * this never touches or upserts an existing account.
 */
export async function verifySignupCode(
  name: string,
  email: string,
  password: string,
  code: string
): Promise<VerifySignupCodeResult> {
  const parsed = SignupDetailsSchema.safeParse({ name, email, password });
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  if (!parsed.success) return { ok: false, error: "invalid_code" };
  const clean = parsed.data;

  const record = await prisma.emailVerification.findUnique({ where: { email: cleanEmail } });
  if (!record || record.expiresAt < new Date()) {
    return { ok: false, error: "expired" };
  }
  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false, error: "too_many_attempts" };
  }

  const valid = await bcrypt.compare(cleanCode, record.codeHash);
  if (!valid) {
    await prisma.emailVerification.update({
      where: { email: cleanEmail },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "invalid_code" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingUser) {
    await prisma.emailVerification.delete({ where: { email: cleanEmail } });
    return { ok: false, error: "exists" };
  }

  const passwordHash = await bcrypt.hash(clean.password, 10);
  await prisma.user.create({ data: { name: clean.name, email: cleanEmail, passwordHash } });
  await prisma.emailVerification.delete({ where: { email: cleanEmail } });

  await signIn("credentials", { email: cleanEmail, password: clean.password, redirectTo: "/home" });
  return { ok: true };
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
