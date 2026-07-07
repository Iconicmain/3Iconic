import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { getIspUserContext, getAccessibleStationIds } from '@/lib/isp/permissions';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

// Uses the same 'stations' collection as /admin/stations (stationId, name, location, region)
export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const stationsCol = db.collection(ISP_COLLECTIONS.stations);

    const stationIds = await getAccessibleStationIds();
    const query = stationIds.length > 0 ? { stationId: { $in: stationIds } } : {};
    const rawStations = await stationsCol.find(query).sort({ name: 1 }).toArray();

    const stations = rawStations.map((s: { stationId: string; name: string; location: string }) => ({
      id: s.stationId,
      stationName: s.name,
      code: s.stationId,
      location: s.location,
    }));

    return NextResponse.json({ stations }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Stations GET]', error);
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
