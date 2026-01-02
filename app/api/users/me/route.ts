import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { generateUUID } from '@/lib/uuid';
import { AVAILABLE_PAGES } from '@/lib/constants';

// Ensure Node.js runtime for MongoDB
export const runtime = 'nodejs';

interface User {
  id?: string;
  _id?: any;
  email: string;
  name: string;
  image?: string;
  pagePermissions: any[];
  role?: 'superadmin' | 'admin' | 'user';
  approved?: boolean;
}

// GET - Get current user's approval status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add timeout protection and use projection for performance
    const fetchUser = async () => {
      const client = await clientPromise;
      const db = client.db('tixmgmt');
      const usersCollection = db.collection<User>('users');

      const currentUserEmail = session.user.email!.toLowerCase();
      
      // Use projection to only fetch needed fields
      return await usersCollection.findOne(
        { email: currentUserEmail },
        {
          projection: {
            id: 1,
            email: 1,
            name: 1,
            role: 1,
            approved: 1,
            pagePermissions: 1,
          }
        }
      );
    };

    let user = await Promise.race([
      fetchUser(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]) as User | null;

    // Auto-create user if they don't exist (when they first log in)
    if (!user) {
      const userId = generateUUID();
      
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
        console.error('[Users API] Error checking user count:', error);
        isFirstUser = false;
      }

      const newUser: User = {
        id: userId,
        email: currentUserEmail,
        name: session.user.name || 'User',
        image: session.user.image || null,
        pagePermissions: isFirstUser 
          ? AVAILABLE_PAGES.map((page) => ({
              pageId: page.id,
              permissions: ['view', 'add', 'edit', 'delete'],
            }))
          : [],
        role: isFirstUser ? 'superadmin' : 'user',
        approved: isFirstUser,
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
        user = newUser;
      } catch (insertError) {
        console.error('[Users API] Error inserting new user:', insertError);
        // Return error response if insert fails
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      approved: user.approved !== undefined ? user.approved : false,
      role: user.role || 'user',
      email: user.email,
      name: user.name,
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120', // Cache for 60s, serve stale for 120s
      }
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    return NextResponse.json({ error: 'Failed to fetch user status' }, { status: 500 });
  }
}

