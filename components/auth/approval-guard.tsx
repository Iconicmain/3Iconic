'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkApproval = () => {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      // Use session data if available (fast path - no API call)
      if (session.user?.approved !== undefined) {
        if (!session.user.approved) {
          // User not approved, redirect to waiting page
          if (pathname !== '/admin/waiting-approval') {
            router.push('/admin/waiting-approval');
          }
        } else {
          // User is approved, allow access
          setChecking(false);
        }
        return;
      }

      // Fallback to API call if session data not available
      // Always bypass cache for approval checks - critical operation
      const checkApprovalAPI = async () => {
        try {
          const response = await fetch('/api/users/me', {
            // Always bypass cache for approval checks - critical for security
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });
          const data = await response.json();
          
          if (!data.approved) {
            // User not approved, redirect to waiting page
            if (pathname !== '/admin/waiting-approval') {
              router.push('/admin/waiting-approval');
            }
          } else {
            // User is approved, allow access
            setChecking(false);
          }
        } catch (error) {
          console.error('Error checking approval:', error);
          // On error, allow access (fail open)
          setChecking(false);
        }
      };

      checkApprovalAPI();
    };

    // Skip check for waiting-approval page
    if (pathname === '/admin/waiting-approval') {
      setChecking(false);
      return;
    }

    checkApproval();
  }, [session, status, router, pathname]);

  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin mb-4" />
          <p className="text-emerald-700">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

