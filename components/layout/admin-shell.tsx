'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

const BARE_ADMIN_ROUTES = new Set([
  '/admin/login',
  '/admin/waiting-approval',
  '/admin/expenses-mobile',
]);

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (BARE_ADMIN_ROUTES.has(pathname || '')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full md:ml-72 flex-1 min-w-0">{children}</div>
    </div>
  );
}
