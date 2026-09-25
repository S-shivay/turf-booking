import type { DefaultSession } from 'next-auth';
import type { Role } from '@/generated/prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

// next-auth/jwt is a bare re-export; the interface lives in @auth/core.
declare module '@auth/core/jwt' {
  interface JWT {
    uid: string;
    role: Role;
  }
}
