'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { PWAInstaller } from '@/components/pwa/pwa-installer';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/next';

function isExpenseMobilePath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith('/expense-mobile'));
}

export function ConditionalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lite = isExpenseMobilePath(pathname);

  if (lite) {
    return <>{children}</>;
  }

  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      {children}
      <PWAInstaller />
      <Toaster />
      <Analytics />
    </SessionProvider>
  );
}
