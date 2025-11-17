import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { AVAILABLE_PAGES } from '@/lib/constants';

// Ensure Node.js runtime for MongoDB
export const runtime = 'nodejs';

interface User {
  id?: string;
  _id?: any;
  email: string;
  name: string;
  pagePermissions: any[];
  role?: 'superadmin' | 'admin' | 'user';
  approved?: boolean;
}

// POST - Promote a specific user to superadmin
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    // Find the user
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user to superadmin with all permissions
    const updateData = {
      role: 'superadmin',
      approved: true,
      pagePermissions: AVAILABLE_PAGES.map((page) => ({
        pageId: page.id,
        permissions: ['view', 'add', 'edit', 'delete'],
      })),
      updatedAt: new Date(),
    };

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: updateData }
    );

    const updatedUser = await usersCollection.findOne({ _id: user._id });

    return NextResponse.json({
      message: 'User promoted to superadmin successfully',
      user: {
        id: updatedUser?.id || updatedUser?._id.toString(),
        email: updatedUser?.email,
        name: updatedUser?.name,
        role: updatedUser?.role,
        approved: updatedUser?.approved,
        pagePermissions: updatedUser?.pagePermissions,
      },
    });
  } catch (error) {
    console.error('Error promoting user to superadmin:', error);
    return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
  }
}

