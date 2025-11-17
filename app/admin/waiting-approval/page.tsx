'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function WaitingApprovalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<{
    approved: boolean;
    role: string;
    loading: boolean;
  }>({
    approved: false,
    role: 'user',
    loading: true,
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let isRedirecting = false;

    const checkApprovalStatus = async () => {
      // Prevent multiple redirects
      if (isRedirecting) return;

      try {
        const response = await fetch('/api/users/me');
        const data = await response.json();
        
        if (data.approved) {
          // User is approved - check what pages they can access
          const usersResponse = await fetch('/api/users');
          const usersData = await usersResponse.json();
          const currentUser = usersData.users?.find((u: any) => u.email === session?.user?.email);
          
          if (currentUser) {
            // Superadmins go to dashboard
            if (currentUser.role === 'superadmin') {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              isRedirecting = true;
              router.replace('/admin');
              return;
            }
            
            // Find first page user has view permission for
            if (currentUser.pagePermissions && currentUser.pagePermissions.length > 0) {
              const firstAllowedPage = currentUser.pagePermissions.find((p: any) => 
                p.permissions && p.permissions.includes('view')
              );
              
              if (firstAllowedPage) {
                const page = usersData.availablePages?.find((p: any) => p.id === firstAllowedPage.pageId);
                if (page) {
                  if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                  }
                  isRedirecting = true;
                  router.replace(page.path);
                  return;
                }
              }
            }
            
            // User is approved but has no permissions yet
            setUserStatus({
              approved: true,
              role: data.role || 'user',
              loading: false,
            });
          } else {
            setUserStatus({
              approved: true,
              role: data.role || 'user',
              loading: false,
            });
          }
        } else {
          setUserStatus({
            approved: false,
            role: data.role || 'user',
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
        setUserStatus({
          approved: false,
          role: 'user',
          loading: false,
        });
      }
    };

    if (status === 'authenticated') {
      checkApprovalStatus();
      // Check every 10 seconds, but stop if redirecting
      intervalId = setInterval(() => {
        if (!isRedirecting) {
          checkApprovalStatus();
        }
      }, 10000);
      
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

  if (status === 'loading' || userStatus.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin mb-4" />
          <p className="text-emerald-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="bg-white shadow-xl border-2 border-emerald-200">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Waiting for Approval
            </CardTitle>
            <CardDescription className="text-base sm:text-lg">
              Your account is pending administrator approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                    Account Under Review
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    Your account has been created successfully. An administrator will review your request and grant you access to the system. 
                    You will be automatically redirected once your account is approved.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Account Created</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {userStatus.approved 
                      ? 'Status: Approved - Waiting for Permissions' 
                      : 'Status: Pending Approval'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userStatus.approved
                      ? 'Your account is approved. A super admin will grant you page permissions shortly.'
                      : 'Waiting for administrator review'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs sm:text-sm text-center text-muted-foreground mb-4">
                This page will automatically refresh and redirect you once your account is approved.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  Refresh Status
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="flex-1 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

