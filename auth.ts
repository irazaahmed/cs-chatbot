import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";

// No database adapter: JWT session strategy only. This means we don't need
// NextAuth's Account/Session/VerificationToken tables, so the Prisma schema
// stays exactly as CLAUDE.md section 4 defines it. The signIn callback keeps
// our own User table in sync on every login instead.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Behind Coolify's Traefik + Cloudflare reverse proxies, so NextAuth must
  // trust the forwarded Host header rather than rejecting it as untrusted.
  trustHost: true,
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  // Long-lived, sliding session: the JWT is re-issued on every request
  // within maxAge (default updateAge is 24h), so an active user effectively
  // never gets signed out — only an explicit "Sign out" or 180 days of
  // total inactivity ends the session.
  session: { strategy: "jwt", maxAge: 180 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    // Google logins upsert-by-email (only way in, so this can't collide with
    // an existing Credentials account's password). Credentials logins are
    // already resolved to a specific user id in authorize() above, so they
    // never touch prisma.user.upsert and can't accidentally attach to or
    // create a different account.
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          create: { email: user.email, name: user.name ?? null },
          update: { name: user.name ?? undefined },
        });
        token.userId = dbUser.id;
      } else if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
