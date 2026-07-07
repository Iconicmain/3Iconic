import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { Db } from 'mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';
import { canAccessStation, getIspUserContext } from '@/lib/isp/permissions';
import { resolveStationId } from '@/lib/isp/station-resolve';
import { itemBelongsToStation, computeStationHealth } from '@/lib/isp/station-query';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export const dynamic = 'force-dynamic';

function todayRange() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  return { todayStart, todayEnd };
}

async function buildStationStats(
  db: Db,
  stationId: string,
  stationName: string,
  stationSelectorId: string,
  inventoryItems: unknown[],
  technicianIssues: unknown[],
  technicianIssueItems: unknown[],
  cableRolls: unknown[],
  cableLogs: unknown[]
) {
  const { todayStart, todayEnd } = todayRange();

  const stItems = (inventoryItems as { stationId?: string; stationIds?: string[]; quantityAvailable: number; minimumLevel: number }[]).filter(
    (i) => itemBelongsToStation(i, stationId)
  );

  const stIssues = (technicianIssues as { id: string; stationId: string; issueDate: Date; technicianId: string }[]).filter(
    (i) => i.stationId === stationId
  );
  const stTodayIssues = stIssues.filter((i) => i.issueDate >= todayStart && i.issueDate < todayEnd);
  const stTodayIds = new Set(stTodayIssues.map((i) => i.id));

  const stTodayItems = (technicianIssueItems as { technicianIssueId: string; quantityTaken: number; quantityReturned: number }[]).filter(
    (ii) => stTodayIds.has(ii.technicianIssueId)
  );

  const stPending = (technicianIssueItems as { technicianIssueId: string; quantityTaken: number; quantityReturned: number }[]).filter(
    (ii) =>
      ii.quantityReturned < ii.quantityTaken &&
      stIssues.some((si) => si.id === ii.technicianIssueId)
  );

  const stCable = (cableRolls as { stationId: string; currentRemainingMeters: number }[]).filter(
    (r) => r.stationId === stationId
  );
  const stCableRemaining = stCable.reduce((s, r) => s + r.currentRemainingMeters, 0);

  const stCableLogs = (cableLogs as { stationId: string; metersIssued: number; metersReturned: number; metersUsed: number; wasteMeters?: number }[]).filter(
    (l) => l.stationId === stationId
  );

  const lastActivity = await db
    .collection(ISP_COLLECTIONS.auditLogs)
    .findOne({ stationId }, { sort: { createdAt: -1 } });

  const itemsIssuedToday = stTodayItems.reduce((s, ii) => s + ii.quantityTaken, 0);
  const itemsReturnedToday = stTodayItems.reduce((s, ii) => s + ii.quantityReturned, 0);
  const pendingReturns = stPending.reduce(
    (s, ii) => s + (ii.quantityTaken - ii.quantityReturned),
    0
  );
  const lowStockCount = stItems.filter((i) => i.quantityAvailable <= i.minimumLevel).length;

  return {
    id: stationSelectorId,
    stationId,
    stationName,
    totalStockItems: stItems.length,
    itemsIssuedToday,
    itemsReturnedToday,
    pendingReturns,
    lowStockCount,
    totalCableRemaining: stCableRemaining,
    activeTechnicians: new Set(stTodayIssues.map((i) => i.technicianId)).size,
    cableIssuedToday: stCableLogs.reduce((s, l) => s + l.metersIssued, 0),
    cableReturnedToday: stCableLogs.reduce((s, l) => s + l.metersReturned, 0),
    cableUsedToday: stCableLogs.reduce((s, l) => s + l.metersUsed, 0),
    cableWastedToday: stCableLogs.reduce((s, l) => s + (l.wasteMeters || 0), 0),
    lastActivityTime: lastActivity?.createdAt || null,
    healthStatus: computeStationHealth({
      totalStockItems: stItems.length,
      lowStockCount,
      pendingReturns,
      itemsIssuedToday,
      itemsReturnedToday,
      lastActivityTime: lastActivity?.createdAt || null,
    }),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId') || 'all';

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const { todayStart, todayEnd } = todayRange();

    const rawStations = await db.collection(ISP_COLLECTIONS.stations).find({}).sort({ name: 1 }).toArray();

    const seenStationIds = new Set<string>();
    const mappedStations = rawStations
      .map((s: { stationId?: string; _id?: { toString(): string }; name?: string }) => {
        const sid = s.stationId || '';
        const mongoId = s._id?.toString?.() || '';
        const isDup = sid && seenStationIds.has(sid);
        if (sid) seenStationIds.add(sid);
        const selectorId = isDup ? mongoId : sid || mongoId;
        return {
          selectorId,
          stationId: sid || mongoId,
          stationName: s.name || 'Unknown',
        };
      })
      .filter((s) => s.selectorId);

    const [inventoryItems, technicianIssues, technicianIssueItems, cableRolls, cableLogs, routerUnits] =
      await Promise.all([
        db.collection(ISP_COLLECTIONS.inventoryItems).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.technicianIssues).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.technicianIssueItems).find({}).toArray(),
        db.collection(ISP_COLLECTIONS.cableRolls).find({}).toArray(),
        db
          .collection(ISP_COLLECTIONS.cableUsageLogs)
          .find({ createdAt: { $gte: todayStart, $lt: todayEnd } })
          .toArray(),
        db.collection(ISP_COLLECTIONS.routerUnits).find({ status: 'damaged' }).toArray(),
      ]);

    const damagedLostCount = routerUnits.length;

    if (stationIdParam !== 'all') {
      if (!(await canAccessStation(stationIdParam))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      const resolvedId = await resolveStationId(stationIdParam);
      const stationMeta = mappedStations.find((s) => s.selectorId === stationIdParam || s.stationId === resolvedId);
      const stats = await buildStationStats(
        db,
        resolvedId,
        stationMeta?.stationName || resolvedId,
        stationIdParam,
        inventoryItems,
        technicianIssues,
        technicianIssueItems,
        cableRolls,
        cableLogs
      );

      const stRoutersDamaged = (routerUnits as { stationIds?: string[]; stationId?: string }[]).filter((r) => {
        const ids = r.stationIds?.length ? r.stationIds : r.stationId ? [r.stationId] : [];
        return ids.includes(resolvedId);
      }).length;

      return NextResponse.json(
        {
          mode: 'station',
          summary: {
            totalStations: 1,
            totalActiveItems: stats.totalStockItems,
            lowStockItems: stats.lowStockCount,
            issuedToday: stats.itemsIssuedToday,
            returnedToday: stats.itemsReturnedToday,
            pendingReturns: stats.pendingReturns,
            cableAvailable: stats.totalCableRemaining,
            cableIssuedToday: stats.cableIssuedToday,
            cableReturnedToday: stats.cableReturnedToday,
            cableUsedToday: stats.cableUsedToday,
            cableWastedToday: stats.cableWastedToday,
            techniciansActiveToday: stats.activeTechnicians,
            damagedLostItems: stRoutersDamaged || damagedLostCount,
          },
          stationComparison: [stats],
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!ctx.canAccessAllStations) {
      return NextResponse.json({ error: 'All-stations view requires elevated access' }, { status: 403 });
    }

    const stationComparison = await Promise.all(
      mappedStations.map((st) =>
        buildStationStats(
          db,
          st.stationId,
          st.stationName,
          st.selectorId,
          inventoryItems,
          technicianIssues,
          technicianIssueItems,
          cableRolls,
          cableLogs
        )
      )
    );

    const todayIssues = (technicianIssues as { issueDate: Date }[]).filter(
      (i) => i.issueDate >= todayStart && i.issueDate < todayEnd
    );
    const todayIssueIds = new Set(
      (todayIssues as { id: string }[]).map((i) => i.id)
    );
    const todayIssueItems = (technicianIssueItems as { technicianIssueId: string; quantityTaken: number; quantityReturned: number }[]).filter(
      (ii) => todayIssueIds.has(ii.technicianIssueId)
    );

    const summary = {
      totalStations: mappedStations.length,
      totalActiveItems: inventoryItems.length,
      lowStockItems: (inventoryItems as { quantityAvailable: number; minimumLevel: number }[]).filter(
        (i) => i.quantityAvailable <= i.minimumLevel
      ).length,
      issuedToday: todayIssueItems.reduce((s, ii) => s + ii.quantityTaken, 0),
      returnedToday: todayIssueItems.reduce((s, ii) => s + ii.quantityReturned, 0),
      pendingReturns: (technicianIssueItems as { quantityTaken: number; quantityReturned: number }[])
        .filter((ii) => ii.quantityReturned < ii.quantityTaken)
        .reduce((s, ii) => s + (ii.quantityTaken - ii.quantityReturned), 0),
      cableAvailable: (cableRolls as { currentRemainingMeters: number }[]).reduce(
        (s, r) => s + r.currentRemainingMeters,
        0
      ),
      cableIssuedToday: (cableLogs as { metersIssued: number }[]).reduce((s, l) => s + l.metersIssued, 0),
      cableReturnedToday: (cableLogs as { metersReturned: number }[]).reduce(
        (s, l) => s + l.metersReturned,
        0
      ),
      cableUsedToday: (cableLogs as { metersUsed: number }[]).reduce((s, l) => s + l.metersUsed, 0),
      cableWastedToday: (cableLogs as { wasteMeters?: number }[]).reduce(
        (s, l) => s + (l.wasteMeters || 0),
        0
      ),
      techniciansActiveToday: new Set(
        (todayIssues as { technicianId: string }[]).map((i) => i.technicianId)
      ).size,
      damagedLostItems: damagedLostCount,
    };

    return NextResponse.json(
      { mode: 'all', summary, stationComparison },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[ISP Dashboard Summary]', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}
