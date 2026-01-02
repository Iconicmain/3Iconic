import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  // Wrap auth() call in try-catch to handle any errors gracefully
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    // If auth() fails, log the error and treat as no session
    console.error('[Middleware] Error getting session:', error);
    // Continue with session = null, which will redirect to login
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  const isWaitingPage = request.nextUrl.pathname === '/admin/waiting-approval';

  // If trying to access admin routes without session, redirect to login
  if (isAdminRoute && !isLoginPage && !isWaitingPage && !session) {
    const loginUrl = new URL('/admin/login', request.url);
    // Preserve full URL including query parameters
    const fullCallbackUrl = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set('callbackUrl', fullCallbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and trying to access login page, redirect to admin
  // Note: Approval check is handled client-side in the waiting-approval page
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

