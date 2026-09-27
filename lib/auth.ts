import 'server-only';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/db';
import { ownerEmails } from '@/lib/utils';
import type { Role } from '@/generated/prisma/client';

export function isOwnerEmail(email: string): boolean {
  return ownerEmails().includes(email.toLowerCase());
}

/**
 * JWT sessions (no Session/Account tables → zero DB reads on `auth()`).
 * The User row is upserted on every Google sign-in and its role is set
 * from OWNER_EMAILS at that moment. `requireOwner()` below re-reads the
 * role from the DB so removing an email from OWNER_EMAILS takes effect on
 * the next request, not the next sign-in.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Auth.js reads AUTH_SECRET; the .env currently names it BETTER_AUTH_SECRET.
  // Fallback keeps dev running — rename the variable when convenient.
  secret: process.env.AUTH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim() || undefined,
  providers: [Google],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false;
      if (!profile?.email) return false;
      // Google marks unverified addresses explicitly; refuse them.
      if ('email_verified' in profile && profile.email_verified === false) return false;
      return true;
    },
    async jwt({ token, user, profile }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const role: Role = isOwnerEmail(email) ? 'OWNER' : 'CUSTOMER';
        const dbUser = await prisma.user.upsert({
          where: { email },
          create: { email, name: user.name ?? profile?.name ?? null, image: user.image ?? null, role },
          update: { name: user.name ?? undefined, image: user.image ?? undefined, role },
          select: { id: true, role: true },
        });
        token.uid = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      return session;
    },
  },
});

export type SessionUser = { id: string; email: string; name: string | null; role: Role };

/** Signed-in user or null. Cheap: decodes the JWT, no DB. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { id: u.id, email: u.email, name: u.name ?? null, role: u.role };
}

/**
 * Owner check for protected routes. Re-verifies the role from the DB
 * (single PK lookup) so a revoked owner is cut off immediately.
 */
export async function requireOwner(): Promise<SessionUser | null> {
  const user = await currentUser();
  if (!user) return null;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (row?.role !== 'OWNER') return null;
  return { ...user, role: 'OWNER' };
}
