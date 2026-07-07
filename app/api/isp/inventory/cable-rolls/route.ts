import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { resolveStationId } from '@/lib/isp/station-resolve';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { getRollDetailsForItem } from '@/lib/isp/inventory-roll-stats';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const stationIdParam = searchParams.get('stationId');

    if (!itemId || !stationIdParam) {
      return NextResponse.json({ error: 'itemId and stationId are required' }, { status: 400 });
    }

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const stationId = await resolveStationId(stationIdParam);
    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const item = await db.collection(ISP_COLLECTIONS.inventoryItems).findOne({ id: itemId });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const details = await getRollDetailsForItem(db, stationId, itemId, item.itemName);
    return NextResponse.json({ item, ...details }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Cable Rolls Detail]', error);
    return NextResponse.json({ error: 'Failed to fetch roll details' }, { status: 500 });
  }
}
