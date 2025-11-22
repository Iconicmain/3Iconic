'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { PWAInstaller } from '@/components/pwa/pwa-installer';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PWAInstaller />
    </SessionProvider>
  );
}

