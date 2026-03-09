import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { canAccessSuperAdmin } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    if (!(await canAccessSuperAdmin())) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [stations, inventoryItems, technicianIssues, technicianIssueItems, cableRolls, cableLogs] =
      await Promise.all([
        db.collection(ISP_COLLECTIONS.stations).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.inventoryItems).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.technicianIssues).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.technicianIssueItems).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.cableRolls).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.cableUsageLogs)
          .find({ createdAt: { $gte: todayStart, $lt: todayEnd } })
          .toArray(),
      ]);

    const todayIssues = technicianIssues.filter(
      (i: { issueDate: Date }) => i.issueDate >= todayStart && i.issueDate < todayEnd
    );
    const todayIssueIds = new Set(todayIssues.map((i: { id: string }) => i.id));
    const todayIssueItems = technicianIssueItems.filter((ii: { technicianIssueId: string }) =>
      todayIssueIds.has(ii.technicianIssueId)
    );

    const totalIssuedToday = todayIssueItems.reduce(
      (s: number, ii: { quantityTaken: number }) => s + ii.quantityTaken,
      0
    );
    const totalReturnedToday = todayIssueItems.reduce(
      (s: number, ii: { quantityReturned: number }) => s + ii.quantityReturned,
      0
    );
    const totalPending = technicianIssueItems
      .filter((ii: { quantityReturned: number; quantityTaken: number }) => ii.quantityReturned < ii.quantityTaken)
      .reduce((s: number, ii: { quantityTaken: number; quantityReturned: number }) => s + (ii.quantityTaken - ii.quantityReturned), 0);

    const lowStockCount = inventoryItems.filter(
      (i: { quantityAvailable: number; minimumLevel: number }) => i.quantityAvailable <= i.minimumLevel
    ).length;

    const totalCableRemaining = cableRolls.reduce(
      (s: number, r: { currentRemainingMeters: number }) => s + r.currentRemainingMeters,
      0
    );

    const activeTechniciansToday = new Set(
      todayIssues.map((i: { technicianId: string }) => i.technicianId)
    ).size;

    const cableIssuedToday = cableLogs.reduce(
      (s: number, l: { metersIssued: number }) => s + l.metersIssued,
      0
    );
    const cableReturnedToday = cableLogs.reduce(
      (s: number, l: { metersReturned: number }) => s + l.metersReturned,
      0
    );
    const cableUsedToday = cableLogs.reduce(
      (s: number, l: { metersUsed: number }) => s + l.metersUsed,
      0
    );

    const stationComparison = await Promise.all(
      stations.map(async (st: { stationId: string; name: string }) => {
        const stItems = inventoryItems.filter((i: { stationId: string }) => i.stationId === st.stationId);
        const stIssues = technicianIssues.filter((i: { stationId: string }) => i.stationId === st.stationId);
        const stTodayIssues = stIssues.filter(
          (i: { issueDate: Date }) => i.issueDate >= todayStart && i.issueDate < todayEnd
        );
        const stTodayIds = new Set(stTodayIssues.map((i: { id: string }) => i.id));
        const stTodayItems = technicianIssueItems.filter((ii: { technicianIssueId: string }) =>
          stTodayIds.has(ii.technicianIssueId)
        );
        const stPending = technicianIssueItems.filter(
          (ii: { quantityReturned: number; quantityTaken: number }) =>
            ii.quantityReturned < ii.quantityTaken &&
            stIssues.some((si: { id: string }) => si.id === ii.technicianIssueId)
        );
        const stCable = cableRolls.filter((r: { stationId: string }) => r.stationId === st.stationId);
        const stCableRemaining = stCable.reduce(
          (s: number, r: { currentRemainingMeters: number }) => s + r.currentRemainingMeters,
          0
        );
        const lastActivity = await db
          .collection(ISP_COLLECTIONS.auditLogs)
          .findOne({ stationId: st.stationId }, { sort: { createdAt: -1 } });

        return {
          id: st.stationId,
          stationName: st.name,
          totalStockItems: stItems.length,
          itemsIssuedToday: stTodayItems.reduce((s: number, ii: { quantityTaken: number }) => s + ii.quantityTaken, 0),
          itemsReturnedToday: stTodayItems.reduce((s: number, ii: { quantityReturned: number }) => s + ii.quantityReturned, 0),
          pendingReturns: stPending.reduce((s: number, ii: { quantityTaken: number; quantityReturned: number }) => s + (ii.quantityTaken - ii.quantityReturned), 0),
          lowStockCount: stItems.filter((i: { quantityAvailable: number; minimumLevel: number }) => i.quantityAvailable <= i.minimumLevel).length,
          totalCableRemaining: stCableRemaining,
          activeTechnicians: new Set(stTodayIssues.map((i: { technicianId: string }) => i.technicianId)).size,
          lastActivityTime: lastActivity?.createdAt || null,
        };
      })
    );

    const technicianAccountability = new Map<string, {
      technicianId: string;
      stationId: string;
      itemsTaken: number;
      itemsReturned: number;
      itemsPending: number;
      cableMetersUsed: number;
    }>();

    for (const ii of technicianIssueItems) {
      const issue = technicianIssues.find((i: { id: string }) => i.id === ii.technicianIssueId);
      if (!issue) continue;
      const key = `${ii.technicianId}-${issue.stationId}`;
      const existing = technicianAccountability.get(key) || {
        technicianId: ii.technicianId,
        stationId: issue.stationId,
        itemsTaken: 0,
        itemsReturned: 0,
        itemsPending: 0,
        cableMetersUsed: 0,
      };
      existing.itemsTaken += ii.quantityTaken;
      existing.itemsReturned += ii.quantityReturned;
      existing.itemsPending += Math.max(0, ii.quantityTaken - ii.quantityReturned);
      technicianAccountability.set(key, existing);
    }

    for (const log of cableLogs) {
      const key = `${log.technicianId}-${log.stationId}`;
      const existing = technicianAccountability.get(key);
      if (existing) {
        existing.cableMetersUsed += log.metersUsed || 0;
      } else {
        technicianAccountability.set(key, {
          technicianId: log.technicianId,
          stationId: log.stationId,
          itemsTaken: 0,
          itemsReturned: 0,
          itemsPending: 0,
          cableMetersUsed: log.metersUsed || 0,
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalStations: stations.length,
        totalInventoryItems: inventoryItems.length,
        totalIssuedToday: totalIssuedToday,
        totalReturnedToday: totalReturnedToday,
        totalPendingReturns: totalPending,
        totalLowStock: lowStockCount,
        totalCableRemaining,
        activeTechniciansToday,
        cableIssuedToday,
        cableReturnedToday,
        cableUsedToday,
      },
      stationComparison,
      technicianAccountability: Array.from(technicianAccountability.values()),
      cableOverview: {
        rolls: cableRolls,
        totalIssuedToday: cableIssuedToday,
        totalReturnedToday: cableReturnedToday,
        totalUsedToday: cableUsedToday,
      },
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Aggregate]', error);
    return NextResponse.json({ error: 'Failed to fetch aggregate data' }, { status: 500 });
  }
}
