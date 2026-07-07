import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { canAccessStation, getIspUserContext } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { stationVisibilityFilter } from '@/lib/isp/issue-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');
    const rollId = searchParams.get('rollId');
    const technicianId = searchParams.get('technicianId');
    const date = searchParams.get('date');
    const pendingOnly = searchParams.get('pendingOnly') === 'true';

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const logsCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);
    const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);

    const query: Record<string, unknown> = {};

    if (stationIdParam === 'all') {
      const ctx = await getIspUserContext();
      if (!ctx?.canAccessAllStations) {
        return NextResponse.json({ error: 'All-stations view requires elevated access' }, { status: 403 });
      }
    } else {
      const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);
      if (!(await canAccessStation(stationIdParam))) {
        return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
      }
      query.$or = [
        { stationId: stationId },
        { sourceStationId: stationId },
        { primaryStationId: stationId },
        { sharedStationIds: stationId },
      ];
    }
    if (rollId) query.rollId = rollId;
    if (technicianId) query.technicianId = technicianId;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      query.createdAt = { $gte: d, $lt: next };
    }

    let logs = await logsCol.find(query).sort({ createdAt: -1 }).limit(100).toArray();

    if (pendingOnly) {
      logs = logs.filter(
        (l: { metersIssued: number; metersReturned: number; metersUsed?: number; wasteMeters?: number }) => {
          const settled = (l.metersReturned || 0) + (l.metersUsed || 0) + (l.wasteMeters || 0);
          return settled < l.metersIssued;
        }
      );
    }

    const rollIds = [...new Set(logs.map((l: { rollId: string }) => l.rollId))];
    const techIds = [...new Set(logs.map((l: { technicianId: string }) => l.technicianId))];
    const stationIds = new Set<string>();
    for (const log of logs as {
      stationId?: string;
      sourceStationId?: string;
      primaryStationId?: string;
      sharedStationIds?: string[];
    }[]) {
      if (log.stationId) stationIds.add(log.stationId);
      if (log.sourceStationId) stationIds.add(log.sourceStationId);
      if (log.primaryStationId) stationIds.add(log.primaryStationId);
      for (const sid of log.sharedStationIds || []) stationIds.add(sid);
    }

    const rolls =
      rollIds.length > 0 ? await rollsCol.find({ id: { $in: rollIds } }).toArray() : [];
    const rollMap = new Map(rolls.map((r: { id: string; rollCode: string; cableType: string }) => [r.id, r]));

    const users =
      techIds.length > 0
        ? await db.collection('users').find({ id: { $in: techIds } }, { projection: { id: 1, name: 1 } }).toArray()
        : [];
    const nameMap = new Map(users.map((u: { id: string; name?: string }) => [u.id, u.name]));

    const stations =
      stationIds.size > 0
        ? await db
            .collection('stations')
            .find({
              $or: [
                { stationId: { $in: [...stationIds] } },
                { _id: { $in: [...stationIds].filter((id) => id.length === 24) } },
              ],
            })
            .toArray()
        : [];
    const stationNameMap = new Map<string, string>();
    for (const s of stations as { stationId?: string; _id?: { toString(): string }; name?: string }[]) {
      if (s.stationId) stationNameMap.set(s.stationId, s.name || s.stationId);
      if (s._id) stationNameMap.set(s._id.toString(), s.name || s.stationId || s._id.toString());
    }

    const enriched = logs.map((log: {
      rollId: string;
      technicianId: string;
      metersIssued: number;
      metersReturned: number;
      metersUsed?: number;
      wasteMeters?: number;
      sourceStationId?: string;
      primaryStationId?: string;
      sharedStationIds?: string[];
      stationId?: string;
    }) => {
      const roll = rollMap.get(log.rollId) as { rollCode?: string; cableType?: string } | undefined;
      const outstanding = log.metersIssued - (log.metersReturned || 0) - (log.metersUsed || 0) - (log.wasteMeters || 0);
      const sourceId = log.sourceStationId || log.stationId;
      return {
        ...log,
        rollCode: roll?.rollCode || null,
        cableType: roll?.cableType || null,
        technicianName: nameMap.get(log.technicianId) || null,
        sourceStationName: sourceId ? stationNameMap.get(sourceId) || null : null,
        primaryStationName: log.primaryStationId ? stationNameMap.get(log.primaryStationId) || null : null,
        sharedStationNames: (log.sharedStationIds || []).map((id) => stationNameMap.get(id) || id),
        outstandingMeters: Math.max(0, outstanding),
      };
    });

    return NextResponse.json({ logs: enriched }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Cable Usage GET]', error);
    return NextResponse.json({ error: 'Failed to fetch cable usage' }, { status: 500 });
  }
}
