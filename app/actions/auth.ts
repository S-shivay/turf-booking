'use server';

import { signIn, signOut } from '@/lib/auth';

/** Only same-origin paths — never an absolute URL (open-redirect guard). */
function safePath(p: string | undefined): string {
  return p && p.startsWith('/') && !p.startsWith('//') ? p : '/';
}

export async function signInWithGoogle(redirectTo?: string) {
  await signIn('google', { redirectTo: safePath(redirectTo) });
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
