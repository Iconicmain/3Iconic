import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const auditCol = db.collection(ISP_COLLECTIONS.auditLogs);
    const usersCol = db.collection('users');

    const stationId = stationIdParam
      ? await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam)
      : null;

    let query: Record<string, unknown> = {};
    if (stationId) {
      if (!(await canAccessStation(stationIdParam))) {
        return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
      }
      query = { $or: [{ stationId }, { stationId: null }] };
    } else if (!ctx.canAccessAllStations) {
      const stationIds = await import('@/lib/isp/permissions').then((m) => m.getAccessibleStationIds());
      if (stationIds.length > 0) {
        query = { stationId: { $in: stationIds } };
      }
    }

    const logs = await auditCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const userIds = [...new Set(logs.map((l: { userId: string }) => l.userId))];
    const users = await usersCol.find({ id: { $in: userIds } }).toArray();
    const userMap = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));

    const activities = logs.map((l: { userId: string; action: string; entityType: string; stationId?: string; createdAt: Date }) => ({
      ...l,
      userName: userMap.get(l.userId) || l.userId,
    }));

    return NextResponse.json({ activities }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Activity]', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
