import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    if (stationId && !(await canAccessStation(stationId))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const usersCol = db.collection('users');

    // Return all approved users for technician selection
    const users = await usersCol
      .find({ approved: true })
      .project({ id: 1, name: 1, email: 1, assignedStationId: 1 })
      .sort({ name: 1 })
      .toArray();

    const technicians = users.map((u: { id: string; name: string; email: string }) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
    }));

    return NextResponse.json({ technicians }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Technicians]', error);
    return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 });
  }
}
