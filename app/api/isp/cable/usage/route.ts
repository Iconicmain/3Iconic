import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { canAccessStation } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');
    const rollId = searchParams.get('rollId');
    const technicianId = searchParams.get('technicianId');
    const date = searchParams.get('date');

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const logsCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);

    const query: Record<string, unknown> = { stationId };
    if (rollId) query.rollId = rollId;
    if (technicianId) query.technicianId = technicianId;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      query.createdAt = { $gte: d, $lt: next };
    }

    const logs = await logsCol.find(query).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ logs }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Cable Usage GET]', error);
    return NextResponse.json({ error: 'Failed to fetch cable usage' }, { status: 500 });
  }
}
