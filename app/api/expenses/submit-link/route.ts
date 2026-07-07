import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { getExpenseMobileBaseUrl, getExpenseMobileSubmitUrl } from '@/lib/expenses/expense-mobile-urls';

export const runtime = 'nodejs';

async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;
  const client = await clientPromise;
  const user = await client.db('tixmgmt').collection('users').findOne(
    { email: session.user.email.toLowerCase() },
    { projection: { role: 1 } }
  );
  return user?.role === 'superadmin';
}

export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  const baseUrl = getExpenseMobileBaseUrl(request.headers.get('origin'));
  const url = getExpenseMobileSubmitUrl(baseUrl);

  return NextResponse.json({ url });
}

export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  const baseUrl = getExpenseMobileBaseUrl(request.headers.get('origin'));
  return NextResponse.json({ url: getExpenseMobileSubmitUrl(baseUrl) });
}
