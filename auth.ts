import NextAuth from 'next-auth';
import { authOptions } from './lib/auth-options';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authOptions,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});

