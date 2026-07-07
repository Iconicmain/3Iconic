import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { canAccessSuperAdmin } from '@/lib/isp/permissions';
import { ISP_DB } from '@/lib/isp/models';
import { ObjectId } from 'mongodb';

/**
 * Fix duplicate stationIds - assign unique IDs to stations that share the same stationId.
 * Super Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await canAccessSuperAdmin())) {
      return NextResponse.json({ error: 'Super Admin only' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const stationsCol = db.collection('stations');

    const allStations = await stationsCol.find({}).sort({ name: 1 }).toArray();

    // Group by stationId to find duplicates
    const byStationId = new Map<string, { _id: ObjectId; name: string; stationId: string }[]>();
    for (const s of allStations) {
      const sid = s.stationId || s._id?.toString?.() || 'unknown';
      if (!byStationId.has(sid)) byStationId.set(sid, []);
      byStationId.get(sid)!.push({
        _id: s._id,
        name: s.name,
        stationId: s.stationId,
      });
    }

    const updates: { _id: ObjectId; newStationId: string }[] = [];
    let nextNum = 1;
    const usedIds = new Set<string>(allStations.map((s) => s.stationId).filter(Boolean));

    for (const [, stations] of byStationId) {
      if (stations.length <= 1) continue;
      // Keep first, assign new IDs to rest
      for (let i = 1; i < stations.length; i++) {
        while (usedIds.has(`ST-${String(nextNum).padStart(3, '0')}`)) nextNum++;
        const newId = `ST-${String(nextNum).padStart(3, '0')}`;
        usedIds.add(newId);
        updates.push({ _id: stations[i]._id, newStationId: newId });
        nextNum++;
      }
    }

    for (const u of updates) {
      await stationsCol.updateOne(
        { _id: u._id },
        { $set: { stationId: u.newStationId, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} duplicate station ID(s)`,
      updated: updates.length,
    });
  } catch (error) {
    console.error('[Fix duplicate station IDs]', error);
    return NextResponse.json({ error: 'Failed to fix duplicates' }, { status: 500 });
  }
}
