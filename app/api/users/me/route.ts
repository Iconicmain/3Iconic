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

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    const currentUserEmail = session.user.email.toLowerCase();
    let user = await usersCollection.findOne({ 
      email: currentUserEmail 
    });

    // Auto-create user if they don't exist (when they first log in)
    if (!user) {
      const userId = generateUUID();
      
      // Check if this is the first user (no users in database)
      const totalUsers = await usersCollection.countDocuments();
      const isFirstUser = totalUsers === 0;

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

      await usersCollection.insertOne(newUser);
      user = newUser;
    }

    return NextResponse.json({
      approved: user.approved !== undefined ? user.approved : false,
      role: user.role || 'user',
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    return NextResponse.json({ error: 'Failed to fetch user status' }, { status: 500 });
  }
}

