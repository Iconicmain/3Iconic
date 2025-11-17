import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { AVAILABLE_PAGES } from '@/lib/constants';
import { redirect } from 'next/navigation';

interface User {
  role?: 'superadmin' | 'admin' | 'user';
  approved?: boolean;
  pagePermissions?: Array<{
    pageId: string;
    permissions: string[];
  }>;
}

/**
 * Check if user has permission to access a page
 * Returns user data if authorized, throws redirect if not
 */
export async function checkPagePermission(pagePath: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const usersCollection = db.collection<User>('users');

  const user = await usersCollection.findOne({
    email: session.user.email.toLowerCase(),
  });

  if (!user) {
    redirect('/admin/waiting-approval');
  }

  // Check if user is approved
  if (user.approved === false) {
    redirect('/admin/waiting-approval');
  }

  // Superadmins have access to everything
  if (user.role === 'superadmin') {
    return user;
  }

  // Find the page by path
  const page = AVAILABLE_PAGES.find((p) => {
    // Match exact path or path with trailing slash
    return p.path === pagePath || p.path === `${pagePath}/`;
  });

  if (!page) {
    // Page not in available pages list, allow access (for now)
    return user;
  }

  // Check if user has view permission for this page
  // Dashboard also requires explicit permission - no default access
  const pagePermission = user.pagePermissions?.find((p) => p.pageId === page.id);
  const hasViewPermission = pagePermission?.permissions.includes('view');

  if (!hasViewPermission) {
    // User doesn't have permission, redirect to waiting page
    redirect('/admin/waiting-approval');
  }

  return user;
}

/**
 * Check if user has a specific permission for a page
 */
export async function hasPagePermission(
  pagePath: string,
  permission: 'view' | 'add' | 'edit' | 'delete'
): Promise<boolean> {
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

  if (!user || user.approved === false) {
    return false;
  }

  // Superadmins have all permissions
  if (user.role === 'superadmin') {
    return true;
  }

  const page = AVAILABLE_PAGES.find((p) => {
    return p.path === pagePath || p.path === `${pagePath}/`;
  });

  if (!page) {
    return false;
  }

  const pagePermission = user.pagePermissions?.find((p) => p.pageId === page.id);
  return pagePermission?.permissions.includes(permission) || false;
}

/**
 * Get the first page the user has view permission for
 * Returns null if user has no permissions
 */
export async function getFirstAllowedPage(): Promise<string | null> {
  const session = await auth();
  
  if (!session?.user?.email) {
    return null;
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const usersCollection = db.collection<User>('users');

  const user = await usersCollection.findOne({
    email: session.user.email.toLowerCase(),
  });

  if (!user || user.approved === false) {
    return null;
  }

  // Superadmins can access dashboard
  if (user.role === 'superadmin') {
    return '/admin';
  }

  // Find the first page user has view permission for
  if (user.pagePermissions && user.pagePermissions.length > 0) {
    for (const pagePerm of user.pagePermissions) {
      if (pagePerm.permissions.includes('view')) {
        const page = AVAILABLE_PAGES.find((p) => p.id === pagePerm.pageId);
        if (page) {
          return page.path;
        }
      }
    }
  }

  return null;
}

