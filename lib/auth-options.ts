import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { generateUUID } from '@/lib/uuid';
import { AVAILABLE_PAGES } from '@/lib/constants';

interface User {
  id?: string;
  _id?: any;
  email: string;
  name: string;
  image?: string;
  pagePermissions: Array<{
    pageId: string;
    permissions: string[];
  }>;
  role?: 'superadmin' | 'admin' | 'user';
  approved?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const authOptions: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Create user in database when they sign in for the first time
      if (user?.email) {
        try {
          // Lazy-load MongoDB client to avoid Edge runtime issues
          const { default: clientPromise } = await import('@/lib/mongodb');
          const client = await clientPromise;
          const db = client.db('tixmgmt');
          const usersCollection = db.collection<User>('users');
          
          const userEmail = user.email.toLowerCase();
          const existingUser = await usersCollection.findOne({ email: userEmail });
          
          if (!existingUser) {
            // Check if this is the first user (no users in database)
            const totalUsers = await usersCollection.countDocuments();
            const isFirstUser = totalUsers === 0;
            
            const userId = generateUUID();
            const newUser: User = {
              id: userId,
              email: userEmail,
              name: user.name || 'User',
              image: user.image || null,
              pagePermissions: isFirstUser 
                ? AVAILABLE_PAGES.map((page) => ({
                    pageId: page.id,
                    permissions: ['view', 'add', 'edit', 'delete'], // First user (superadmin) gets full permissions
                  }))
                : [], // New users start with no permissions
              role: isFirstUser ? 'superadmin' : 'user', // First user is superadmin, others are regular users
              approved: isFirstUser, // First user is auto-approved, others need approval
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            await usersCollection.insertOne(newUser);
            console.log(`[NextAuth] Created new user in database: ${userEmail} (${isFirstUser ? 'superadmin' : 'user'})`);
          } else {
            // Update user info if it has changed (name or image)
            const needsUpdate = 
              existingUser.name !== (user.name || 'User') ||
              existingUser.image !== (user.image || null);
            
            if (needsUpdate) {
              await usersCollection.updateOne(
                { email: userEmail },
                {
                  $set: {
                    name: user.name || 'User',
                    image: user.image || null,
                    updatedAt: new Date(),
                  },
                }
              );
            }
          }
        } catch (error) {
          console.error('[NextAuth] Error creating/updating user in database:', error);
          // Don't block sign-in if database operation fails
        }
      }
      
      return true; // Allow sign-in to proceed
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  trustHost: true,
};

