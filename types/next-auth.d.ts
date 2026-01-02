import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'superadmin' | 'admin' | 'user';
      approved?: boolean;
      pagePermissions?: Array<{
        pageId: string;
        permissions: string[];
      }>;
    };
  }

  interface User {
    id: string;
    role?: 'superadmin' | 'admin' | 'user';
    approved?: boolean;
    pagePermissions?: Array<{
      pageId: string;
      permissions: string[];
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: 'superadmin' | 'admin' | 'user';
    approved?: boolean;
    pagePermissions?: Array<{
      pageId: string;
      permissions: string[];
    }>;
    lastFetched?: number; // Timestamp for cache invalidation
  }
}

