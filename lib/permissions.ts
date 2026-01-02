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
 * Uses session data first (fast), falls back to DB if needed
 */
export async function checkPagePermission(pagePath: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  // Use session data if available (fast path - no DB query)
  if (session.user.role && session.user.approved !== undefined) {
    // Check if user is approved
    if (session.user.approved === false) {
      redirect('/admin/waiting-approval');
    }

    // Superadmins have access to everything
    if (session.user.role === 'superadmin') {
      return {
        role: session.user.role,
        approved: session.user.approved,
        pagePermissions: session.user.pagePermissions || [],
      };
    }

    // Find the page by path
    const page = AVAILABLE_PAGES.find((p) => {
      return p.path === pagePath || p.path === `${pagePath}/`;
    });

    if (!page) {
      // Page not in available pages list, allow access
      return {
        role: session.user.role,
        approved: session.user.approved,
        pagePermissions: session.user.pagePermissions || [],
      };
    }

    // Check if user has view permission for this page
    const pagePermission = session.user.pagePermissions?.find((p) => p.pageId === page.id);
    const hasViewPermission = pagePermission?.permissions.includes('view');

    if (!hasViewPermission) {
      redirect('/admin/waiting-approval');
    }

    return {
      role: session.user.role,
      approved: session.user.approved,
      pagePermissions: session.user.pagePermissions || [],
    };
  }

  // Fallback to database query if session data not available (slow path)
  try {
    const fetchUser = async () => {
      const client = await clientPromise;
      const db = client.db('tixmgmt');
      const usersCollection = db.collection<User>('users');

      // Use projection to only fetch needed fields
      const user = await usersCollection.findOne(
        { email: session.user.email!.toLowerCase() },
        {
          projection: {
            role: 1,
            approved: 1,
            pagePermissions: 1,
          }
        }
      );
      return user;
    };

    // Add timeout protection
    const user = await Promise.race([
      fetchUser(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]) as User | null;

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
      return p.path === pagePath || p.path === `${pagePath}/`;
    });

    if (!page) {
      return user;
    }

    // Check if user has view permission for this page
    const pagePermission = user.pagePermissions?.find((p) => p.pageId === page.id);
    const hasViewPermission = pagePermission?.permissions.includes('view');

    if (!hasViewPermission) {
      redirect('/admin/waiting-approval');
    }

    return user;
  } catch (error) {
    console.error('[Permissions] Error checking page permission:', error);
    // On error, redirect to waiting page for safety
    redirect('/admin/waiting-approval');
  }
}

/**
 * Check if user has a specific permission for a page
 * Uses session data first (fast), falls back to DB if needed
 */
export async function hasPagePermission(
  pagePath: string,
  permission: 'view' | 'add' | 'edit' | 'delete'
): Promise<boolean> {
  const session = await auth();
  
  if (!session?.user?.email) {
    return false;
  }

  // Use session data if available (fast path - no DB query)
  if (session.user.role && session.user.approved !== undefined) {
    if (session.user.approved === false) {
      return false;
    }

    // Superadmins have all permissions
    if (session.user.role === 'superadmin') {
      return true;
    }

    const page = AVAILABLE_PAGES.find((p) => {
      return p.path === pagePath || p.path === `${pagePath}/`;
    });

    if (!page) {
      return false;
    }

    const pagePermission = session.user.pagePermissions?.find((p) => p.pageId === page.id);
    return pagePermission?.permissions.includes(permission) || false;
  }

  // Fallback to database query if session data not available
  try {
    const fetchUser = async () => {
      const client = await clientPromise;
      const db = client.db('tixmgmt');
      const usersCollection = db.collection<User>('users');

      const user = await usersCollection.findOne(
        { email: session.user.email!.toLowerCase() },
        {
          projection: {
            role: 1,
            approved: 1,
            pagePermissions: 1,
          }
        }
      );
      return user;
    };

    // Add timeout protection
    const user = await Promise.race([
      fetchUser(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]) as User | null;

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
  } catch (error) {
    console.error('[Permissions] Error checking permission:', error);
    // On error, deny access for safety
    return false;
  }
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

  // Use session data if available (fast path - no DB query)
  if (session.user.role && session.user.approved !== undefined) {
    if (session.user.approved === false) {
      return null;
    }

    // Superadmins can access dashboard
    if (session.user.role === 'superadmin') {
      return '/admin';
    }

    // Find the first page user has view permission for
    if (session.user.pagePermissions && session.user.pagePermissions.length > 0) {
      for (const pagePerm of session.user.pagePermissions) {
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

  // Fallback to database query with timeout protection
  try {
    const fetchUser = async () => {
      const client = await clientPromise;
      const db = client.db('tixmgmt');
      const usersCollection = db.collection<User>('users');

      return await usersCollection.findOne(
        { email: session.user.email!.toLowerCase() },
        {
          projection: {
            role: 1,
            approved: 1,
            pagePermissions: 1,
          }
        }
      );
    };

    const user = await Promise.race([
      fetchUser(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]) as User | null;

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
  } catch (error) {
    console.error('[Permissions] Error getting first allowed page:', error);
    // Return null on error
  }

  return null;
}

