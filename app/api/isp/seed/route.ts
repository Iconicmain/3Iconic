import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateUUID } from '@/lib/uuid';
import { canAccessSuperAdmin } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function POST(request: NextRequest) {
  try {
    if (!(await canAccessSuperAdmin())) {
      return NextResponse.json({ error: 'Super Admin only' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const stationsCol = db.collection(ISP_COLLECTIONS.stations);

    const existing = await stationsCol.countDocuments();
    if (existing > 0) {
      return NextResponse.json({
        message: 'Stations already exist',
        count: existing,
      });
    }

    const stations = [
      { stationName: 'Main Depot', code: 'MD-001', location: 'Nairobi HQ' },
      { stationName: 'West Station', code: 'WS-002', location: 'Westlands' },
      { stationName: 'East Station', code: 'ES-003', location: 'Eastleigh' },
    ];

    for (const s of stations) {
      await stationsCol.insertOne({
        id: generateUUID(),
        stationName: s.stationName,
        code: s.code,
        location: s.location,
        managerName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      message: `Created ${stations.length} stations`,
      stations: stations.map((s) => s.stationName),
    });
  } catch (error) {
    console.error('[ISP Seed]', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
