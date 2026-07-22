import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const stationId = request.nextUrl.searchParams.get('stationId');
    if (!stationId) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }
    if (!(await canAccessStation(stationId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const statusParam = request.nextUrl.searchParams.get('status');
    const statuses = statusParam
      ? statusParam.split(',').map((s) => s.trim())
      : ['pending', 'returned', 'lost', 'damaged'];

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const col = db.collection(ISP_COLLECTIONS.routerReplacementReturns);
    const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

    const records = await col
      .find({
        stationId,
        status: { $in: statuses },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const unitIds = [
      ...new Set(
        records.flatMap((r: { newRouterUnitId?: string; oldRouterUnitId?: string }) =>
          [r.newRouterUnitId, r.oldRouterUnitId].filter(Boolean)
        )
      ),
    ] as string[];

    const units =
      unitIds.length > 0 ? await routersCol.find({ id: { $in: unitIds } }).toArray() : [];
    const unitMap = new Map(units.map((u: { id: string }) => [u.id, u]));

    const enriched = records.map((r: Record<string, unknown>) => {
      const newUnit = r.newRouterUnitId ? unitMap.get(r.newRouterUnitId as string) : null;
      const oldUnit = r.oldRouterUnitId ? unitMap.get(r.oldRouterUnitId as string) : null;
      return {
        ...r,
        newRouterLabel:
          (newUnit as { serialNumber?: string; macAddress?: string } | undefined)?.serialNumber ||
          (newUnit as { macAddress?: string } | undefined)?.macAddress ||
          r.newRouterSerial ||
          r.newRouterMac,
        oldRouterLabel:
          r.oldRouterSerial ||
          r.oldRouterMac ||
          (oldUnit as { serialNumber?: string; macAddress?: string } | undefined)?.serialNumber ||
          (oldUnit as { macAddress?: string } | undefined)?.macAddress,
      };
    });

    const pendingCount = enriched.filter((r: { status: string }) => r.status === 'pending').length;

    return NextResponse.json(
      { replacements: enriched, pendingCount },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[ISP Router Replacements GET]', error);
    return NextResponse.json({ error: 'Failed to load replacement returns' }, { status: 500 });
  }
}
