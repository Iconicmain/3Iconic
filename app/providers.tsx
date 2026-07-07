'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { PWAInstaller } from '@/components/pwa/pwa-installer';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Optimize session refetch interval for better performance
      refetchInterval={5 * 60} // Refetch session every 5 minutes (instead of default)
      refetchOnWindowFocus={false} // Don't refetch on window focus (reduces unnecessary calls)
    >
      {children}
      <PWAInstaller />
    </SessionProvider>
  );
}

