import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';
import { AVAILABLE_PAGES } from '@/lib/constants';

// Ensure Node.js runtime for MongoDB and crypto modules
export const runtime = 'nodejs';

interface PagePermission {
  pageId: string;
  permissions: string[];
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

// GET - Fetch a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    let user;
    // Try to find by MongoDB ObjectId first
    if (ObjectId.isValid(id)) {
      user = await usersCollection.findOne({ _id: new ObjectId(id) });
    }
    // If not found, try by id field
    if (!user) {
      user = await usersCollection.findOne({ id: id });
    }
    // If still not found, try by email
    if (!user && id && typeof id === 'string') {
      user = await usersCollection.findOne({ email: id.toLowerCase() });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userResponse = {
      id: user.id || user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
      pagePermissions: user.pagePermissions || [],
      role: user.role || 'user',
      approved: user.approved !== undefined ? user.approved : false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json({ user: userResponse });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
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

// PUT - Update a user's permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15+
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, image, pagePermissions, role, approved } = body;

    // Only superadmins can modify permissions, roles, and approvals
    const userIsSuperAdmin = await isSuperAdmin();
    console.log(`[PUT /api/users/${id}] User is superadmin: ${userIsSuperAdmin}, approved: ${approved}`);
    
    if (!userIsSuperAdmin && (pagePermissions !== undefined || role !== undefined || approved !== undefined)) {
      console.error(`[PUT /api/users/${id}] Access denied - not a superadmin`);
      return NextResponse.json({ 
        error: 'Only super admins can manage user permissions, roles, and approvals',
        userIsSuperAdmin: false
      }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    // Find user - try multiple methods
    let user;
    
    // Try by MongoDB ObjectId first
    if (ObjectId.isValid(id)) {
      user = await usersCollection.findOne({ _id: new ObjectId(id) });
    }
    
    // Try by id field (UUID string)
    if (!user) {
      user = await usersCollection.findOne({ id: id });
    }
    
    // Try by email as fallback
    if (!user && id && typeof id === 'string') {
      user = await usersCollection.findOne({ email: id.toLowerCase() });
    }

    if (!user) {
      console.error(`[PUT /api/users/${id}] User not found. Searched by: ObjectId, id field, and email`);
      // Log all users for debugging
      const allUsers = await usersCollection.find({}).toArray();
      console.error(`[PUT /api/users/${id}] Available users:`, allUsers.map(u => ({ id: u.id, email: u.email, _id: u._id?.toString() })));
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[PUT /api/users/${id}] Found user: ${user.email} (id: ${user.id}, _id: ${user._id?.toString()})`);

    const updateData: Partial<User> = {
      updatedAt: new Date(),
    };

    // Non-superadmins can only update name and image
    if (name !== undefined) updateData.name = name.trim();
    if (image !== undefined) updateData.image = image;
    
    // Only superadmins can modify these fields
    if (userIsSuperAdmin) {
      if (pagePermissions !== undefined) updateData.pagePermissions = pagePermissions;
      if (role !== undefined) {
        updateData.role = role;
        // Auto-approve when promoted to admin or superadmin
        if (role === 'admin' || role === 'superadmin') {
          updateData.approved = true;
        }
        // Superadmins automatically get all permissions for all pages
        if (role === 'superadmin') {
          updateData.pagePermissions = AVAILABLE_PAGES.map((page) => ({
            pageId: page.id,
            permissions: ['view', 'add', 'edit', 'delete'],
          }));
        }
        // When promoting to admin, require at least one permission
        if (role === 'admin') {
          const finalPagePermissions = pagePermissions !== undefined ? pagePermissions : user.pagePermissions || [];
          const hasAnyPermission = finalPagePermissions.some((p: any) => 
            p.permissions && p.permissions.length > 0
          );
          if (!hasAnyPermission) {
            return NextResponse.json({ 
              error: 'Admin users must have at least one page permission. Please grant permissions before promoting to admin.' 
            }, { status: 400 });
          }
        }
      }
      if (approved !== undefined) {
        updateData.approved = approved;
        console.log(`[PUT /api/users/${id}] Setting approved to: ${approved}`);
        
        // When approving a user, check if they have permissions
        // If not, they'll stay on waiting-approval page
        if (approved === true) {
          const finalPagePermissions = pagePermissions !== undefined ? pagePermissions : user.pagePermissions || [];
          const hasAnyPermission = finalPagePermissions.some((p: any) => 
            p.permissions && p.permissions.length > 0
          );
          if (!hasAnyPermission && user.role !== 'superadmin') {
            console.log(`[PUT /api/users/${id}] User approved but has no permissions - they'll need permissions to access pages`);
          }
        }
      }
    }

    console.log(`[PUT /api/users/${id}] Update data:`, updateData);
    
    const updateResult = await usersCollection.updateOne(
      { _id: user._id },
      { $set: updateData }
    );
    
    console.log(`[PUT /api/users/${id}] Update result:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

    const updatedUser = await usersCollection.findOne({ _id: user._id });

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser?.id || updatedUser?._id.toString(),
        email: updatedUser?.email,
        name: updatedUser?.name,
        image: updatedUser?.image,
        pagePermissions: updatedUser?.pagePermissions || [],
        role: updatedUser?.role || 'user',
        approved: updatedUser?.approved !== undefined ? updatedUser.approved : false,
      },
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    const errorMessage = error?.message || 'Failed to update user';
    return NextResponse.json({ 
      error: errorMessage,
      details: error?.toString() 
    }, { status: 500 });
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Only superadmins can delete users
    const userIsSuperAdmin = await isSuperAdmin();
    if (!userIsSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can delete users' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection<User>('users');

    // Find user
    let user;
    if (ObjectId.isValid(id)) {
      user = await usersCollection.findOne({ _id: new ObjectId(id) });
    }
    if (!user) {
      user = await usersCollection.findOne({ id: id });
    }
    if (!user && id && typeof id === 'string') {
      user = await usersCollection.findOne({ email: id.toLowerCase() });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await usersCollection.deleteOne({ _id: user._id });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

