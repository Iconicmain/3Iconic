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
      if (!user?.email) {
        console.error('[NextAuth] signIn: No user email provided');
        return false;
      }

      try {
        // Lazy-load MongoDB client to avoid Edge runtime issues
        const { default: clientPromise } = await import('@/lib/mongodb');
        const client = await clientPromise;
        const db = client.db('tixmgmt');
        const usersCollection = db.collection<User>('users');
        
        const userEmail = user.email.toLowerCase();
        
        // Add timeout protection and use projection for performance
        const fetchExistingUser = async () => {
          return await usersCollection.findOne(
            { email: userEmail },
            {
              projection: {
                id: 1,
                email: 1,
                name: 1,
                image: 1,
                role: 1,
                approved: 1,
                pagePermissions: 1,
              }
            }
          );
        };

        let existingUser: User | null = null;
        try {
          existingUser = await Promise.race([
            fetchExistingUser(),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
          ]) as User | null;
        } catch (error) {
          console.error('[NextAuth] Error fetching existing user:', error);
          // Continue with user creation/update even if fetch fails
        }
        
        if (!existingUser) {
          // Check if this is the first user (no users in database) with timeout
          let isFirstUser = false;
          try {
            const totalUsers = await Promise.race([
              usersCollection.countDocuments(),
              new Promise<number>((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
              )
            ]) as number;
            isFirstUser = totalUsers === 0;
          } catch (error) {
            console.error('[NextAuth] Error checking user count:', error);
            // Default to not first user on error
            isFirstUser = false;
          }
          
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
          
          try {
            await Promise.race([
              usersCollection.insertOne(newUser),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database insert timeout')), 5000)
              )
            ]);
            console.log(`[NextAuth] Created new user in database: ${userEmail} (${isFirstUser ? 'superadmin' : 'user'})`);
          } catch (insertError) {
            console.error('[NextAuth] Error inserting new user:', insertError);
            // Don't block sign-in if insert fails
          }
        } else {
          // Update user info if it has changed (name or image) with timeout
          const needsUpdate = 
            existingUser.name !== (user.name || 'User') ||
            existingUser.image !== (user.image || null);
          
          if (needsUpdate) {
            try {
              await Promise.race([
                usersCollection.updateOne(
                  { email: userEmail },
                  {
                    $set: {
                      name: user.name || 'User',
                      image: user.image || null,
                      updatedAt: new Date(),
                    },
                  }
                ),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Database update timeout')), 5000)
                )
              ]);
            } catch (updateError) {
              console.error('[NextAuth] Error updating user:', updateError);
              // Don't block sign-in if update fails
            }
          }
        }
      } catch (error) {
        console.error('[NextAuth] Error creating/updating user in database:', error);
        // Log detailed error information
        if (error instanceof Error) {
          console.error('[NextAuth] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        // Don't block sign-in if database operation fails - allow user to sign in anyway
        // The user data will be fetched on next request via JWT callback
      }
      
      return true; // Allow sign-in to proceed
    },
    async jwt({ token, user, trigger }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id;
      }

      // Fetch user data from database (with caching - only refresh every 5 minutes)
      // BUT: Always bypass cache if trigger is 'update' (permissions/role/approval changed)
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      
      // Always refresh if explicitly triggered (permissions/role/approval changed)
      // Otherwise use cache if still valid
      const shouldBypassCache = trigger === 'update' || 
        !token.lastFetched || 
        (now - (token.lastFetched as number)) > CACHE_DURATION;
      
      if (shouldBypassCache) {
        try {
          // Use Promise.race for timeout protection
          const fetchUserData = async () => {
            const { default: clientPromise } = await import('@/lib/mongodb');
            const client = await clientPromise;
            const db = client.db('tixmgmt');
            const usersCollection = db.collection<User>('users');
            
            // Use projection to only fetch needed fields
            const user = await usersCollection.findOne(
              { email: token.email?.toString().toLowerCase() },
              { 
                projection: {
                  role: 1,
                  approved: 1,
                  pagePermissions: 1,
                }
              }
            );

            if (user) {
              token.role = user.role;
              token.approved = user.approved;
              token.pagePermissions = user.pagePermissions || [];
              token.lastFetched = now;
            }
          };

          // Add timeout protection (5 second timeout)
          await Promise.race([
            fetchUserData(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
          ]);
        } catch (error) {
          // Only log non-source-map errors to avoid console noise
          if (error instanceof Error && !error.message.includes('source map')) {
            console.error('[NextAuth] Error fetching user data for JWT:', error);
          }
          // On error, keep existing token data (don't clear it)
          // This prevents auth failures if DB is temporarily unavailable
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.approved = token.approved;
        session.user.pagePermissions = token.pagePermissions;
      }
      return session;
    },
  },
  trustHost: true,
  session: {
    strategy: 'jwt', // Use JWT strategy for better performance (no database lookups)
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  // Optimize JWT settings
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days (match session)
  },
};

