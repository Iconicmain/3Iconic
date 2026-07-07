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
    const itemName = searchParams.get('itemName');
    const status = searchParams.get('status');

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

    const query: Record<string, unknown> = { stationIds: stationId };
    if (itemName) query.itemName = new RegExp(itemName, 'i');
    if (status) query.status = status;

    const routers = await routersCol.find(query).sort({ itemName: 1, createdAt: -1 }).toArray();
    return NextResponse.json({ routers }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Routers GET]', error);
    return NextResponse.json({ error: 'Failed to fetch routers' }, { status: 500 });
  }
}
