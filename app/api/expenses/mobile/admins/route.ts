import { NextRequest, NextResponse } from 'next/server';
import { validateSubmitToken } from '@/lib/expenses/mobile-submit-token';
import { listSubmitEligibleSuperAdmins } from '@/lib/expenses/expense-submit-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-expense-submit-token') ||
    new URL(request.url).searchParams.get('token');

  if (!token || !(await validateSubmitToken(token))) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 });
  }

  const admins = await listSubmitEligibleSuperAdmins();
  return NextResponse.json({ admins });
}
