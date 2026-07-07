import { NextResponse } from 'next/server';
import { getIspUserContext } from '@/lib/isp/permissions';

export async function GET() {
  const ctx = await getIspUserContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(ctx);
}
