import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { canAccessStation } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);

    const item = await itemsCol.findOne({ id });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!(await canAccessStation(item.stationId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const transactions = await txCol
      .find({ itemId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ item, transactions }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Inventory History]', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
