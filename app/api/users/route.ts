import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { generateUUID } from '@/lib/uuid';
import { AVAILABLE_PAGES, PERMISSION_TYPES, type PermissionType } from '@/lib/constants';

// Ensure Node.js runtime for crypto module
export const runtime = 'nodejs';

// Re-export from shared constants for backward compatibility
export { AVAILABLE_PAGES, PERMISSION_TYPES, type PermissionType };

interface PagePermission {
  pageId: string;
  permissions: PermissionType[];
}

interface User {
  id?: string;
  _id?: any;
  email: string;
  name: string;
  image?: string;
  pagePermissions: PagePermission[];
  role?: 'superadmin' | 'admin' | 'user';
  approved?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper function to check if current user is superadmin
async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) {
    return false;
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const usersCollection = db.collection<User>('users');

  const user = await usersCollection.findOne({
    email: session.user.email.toLowerCase(),
  });

  return user?.role === 'superadmin';
}

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    // Auto-sync current logged-in user to database if they don't exist
    const currentUserEmail = session.user.email.toLowerCase();
    const existingCurrentUser = await usersCollection.findOne({ email: currentUserEmail });

    if (!existingCurrentUser) {
      // Create user record for current logged-in user
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
              permissions: ['view', 'add', 'edit', 'delete'], // First user (superadmin) gets full permissions
            }))
          : [], // New users start with no permissions
        role: isFirstUser ? 'superadmin' : 'user', // First user is superadmin, others are regular users
        approved: isFirstUser, // First user is auto-approved, others need approval
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.insertOne(newUser);
    } else {
      // Update user info if it has changed (name or image)
      const needsUpdate = 
        existingCurrentUser.name !== (session.user.name || 'User') ||
        existingCurrentUser.image !== (session.user.image || null);

      if (needsUpdate) {
        await usersCollection.updateOne(
          { email: currentUserEmail },
          {
            $set: {
              name: session.user.name || 'User',
              image: session.user.image || null,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Fetch ALL users from database (no filtering)
    const users = await usersCollection.find({}).toArray();
    
    // Log for debugging
    console.log(`[GET /api/users] Found ${users.length} users in database`);

    const usersWithStringIds = users.map((user) => ({
      id: user.id || user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
      pagePermissions: user.pagePermissions || [],
      role: user.role || 'user',
      approved: user.approved !== undefined ? user.approved : false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json({ users: usersWithStringIds, availablePages: AVAILABLE_PAGES });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - Create or update a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to add users
    const userIsSuperAdmin = await isSuperAdmin();
    
    if (!userIsSuperAdmin) {
      // Check if user has edit permission on users page
      const client = await clientPromise;
      const db = client.db('tixmgmt');
      const usersCollection = db.collection<User>('users');
      
      const currentUser = await usersCollection.findOne({
        email: session.user.email.toLowerCase(),
      });
      
      if (!currentUser || !currentUser.approved) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const usersPagePermission = currentUser.pagePermissions?.find((p) => p.pageId === 'users');
      const hasEditPermission = usersPagePermission?.permissions.includes('edit');
      
      if (!hasEditPermission) {
        return NextResponse.json({ 
          error: 'You do not have permission to add users. Only super admins or users with edit permission on the Users page can add users.' 
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const { email, name, image, pagePermissions, role } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Only superadmins can set permissions, roles, and approvals
    // Users with edit permission can only add basic users
    if (!userIsSuperAdmin) {
      if (pagePermissions !== undefined && pagePermissions.length > 0) {
        return NextResponse.json({ 
          error: 'Only super admins can set page permissions when creating users.' 
        }, { status: 403 });
      }
      if (role !== undefined && role !== 'user') {
        return NextResponse.json({ 
          error: 'Only super admins can set user roles when creating users.' 
        }, { status: 403 });
      }
    }

    // Validate: Admin users must have at least one permission (only for superadmins)
    if (userIsSuperAdmin && role === 'admin') {
      const finalPagePermissions = pagePermissions || [];
      const hasAnyPermission = finalPagePermissions.some((p: any) => 
        p.permissions && p.permissions.length > 0
      );
      if (!hasAnyPermission) {
        return NextResponse.json({ 
          error: 'Admin users must have at least one page permission. Please grant permissions before creating admin user.' 
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.trim().toLowerCase() });

    const userId = existingUser?.id || existingUser?._id?.toString() || generateUUID();

    const userData: User = {
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      image: image || null,
      pagePermissions: userIsSuperAdmin ? (pagePermissions || []) : [], // Only superadmins can set permissions
      role: userIsSuperAdmin ? (role || 'user') : 'user', // Only superadmins can set roles
      approved: existingUser ? existingUser.approved : (userIsSuperAdmin && (role === 'admin' || role === 'superadmin') ? true : false), // Only superadmins can auto-approve
      updatedAt: new Date(),
    };

    if (!existingUser) {
      userData.createdAt = new Date();
      await usersCollection.insertOne(userData);
    } else {
      await usersCollection.updateOne(
        { email: email.trim().toLowerCase() },
        { $set: userData }
      );
    }

    return NextResponse.json({
      message: existingUser ? 'User updated successfully' : 'User created successfully',
      user: {
        id: userId,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        pagePermissions: userData.pagePermissions,
        role: userData.role,
      },
    });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json({ error: 'Failed to create/update user' }, { status: 500 });
  }
}

