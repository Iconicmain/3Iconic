import { NextRequest, NextResponse } from 'next/server';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import clientPromise from '@/lib/mongodb';
import { canAccessStation } from '@/lib/isp/permissions';
import { resolveStationId } from '@/lib/isp/station-resolve';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const stationId = await resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [items, issues, issueItems, cableRolls, cableLogs] = await Promise.all([
      db.collection(ISP_COLLECTIONS.inventoryItems).find({ stationId }).toArray(),
      db.collection(ISP_COLLECTIONS.technicianIssues).find({
        stationId,
        issueDate: { $gte: todayStart, $lt: todayEnd },
      }).toArray(),
      db.collection(ISP_COLLECTIONS.technicianIssueItems).find({}).toArray(),
      db.collection(ISP_COLLECTIONS.cableRolls).find({ stationId }).toArray(),
      db.collection(ISP_COLLECTIONS.cableUsageLogs).find({
        stationId,
        createdAt: { $gte: todayStart, $lt: todayEnd },
      }).toArray(),
    ]);

    const todayIssueIds = new Set(issues.map((i: { id: string }) => i.id));
    const todayItems = issueItems.filter((ii: { technicianIssueId: string }) =>
      todayIssueIds.has(ii.technicianIssueId)
    );

    const itemsIssuedToday = todayItems.reduce((s: number, ii: { quantityTaken: number }) => s + ii.quantityTaken, 0);
    const itemsReturnedToday = todayItems.reduce((s: number, ii: { quantityReturned: number }) => s + ii.quantityReturned, 0);

    const allOpenIssues = await db
      .collection(ISP_COLLECTIONS.technicianIssues)
      .find({ stationId, status: { $in: ['OPEN', 'PARTIAL_RETURN'] } })
      .toArray();
    const openIssueIds = new Set(allOpenIssues.map((i: { id: string }) => i.id));
    const pendingItems = issueItems.filter((ii: { technicianIssueId: string }) =>
      openIssueIds.has(ii.technicianIssueId) && ii.quantityReturned < ii.quantityTaken
    );
    const pendingReturns = pendingItems.reduce(
      (s: number, ii: { quantityTaken: number; quantityReturned: number }) => s + (ii.quantityTaken - ii.quantityReturned),
      0
    );

    const lowStockCount = items.filter(
      (i: { quantityAvailable: number; minimumLevel: number }) => i.quantityAvailable <= i.minimumLevel
    ).length;

    const totalCableRemaining = cableRolls.reduce(
      (s: number, r: { currentRemainingMeters: number }) => s + r.currentRemainingMeters,
      0
    );

    const activeTechnicians = new Set(issues.map((i: { technicianId: string }) => i.technicianId)).size;

    return NextResponse.json(
      {
      totalActiveItems: items.length,
      lowStockItems: lowStockCount,
      itemsIssuedToday,
      itemsReturnedToday,
      pendingReturns,
      totalCableRemaining,
      activeTechniciansToday: activeTechnicians,
    },
    { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[ISP Station Stats]', error);
    return NextResponse.json({ error: 'Failed to fetch station stats' }, { status: 500 });
  }
}
