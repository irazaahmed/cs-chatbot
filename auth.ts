import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db/client";

// No database adapter: JWT session strategy only. This means we don't need
// NextAuth's Account/Session/VerificationToken tables, so the Prisma schema
// stays exactly as CLAUDE.md section 4 defines it. The signIn callback keeps
// our own User table in sync on every login instead.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  // Long-lived, sliding session: the JWT is re-issued on every request
  // within maxAge (default updateAge is 24h), so an active user effectively
  // never gets signed out — only an explicit "Sign out" or 180 days of
  // total inactivity ends the session.
  session: { strategy: "jwt", maxAge: 180 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await prisma.user.upsert({
        where: { email: user.email },
        create: { email: user.email, name: user.name ?? null },
        update: { name: user.name ?? undefined },
      });
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) token.userId = dbUser.id;
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
