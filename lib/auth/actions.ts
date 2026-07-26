"use server";

import { signIn } from "@/auth";

// Shared by /login and the landing-page preview CTA — both just need to
// start the Google OAuth round trip and land on /playground, which already
// redirects to /onboarding for accounts with no tenant yet.
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/playground" });
}
