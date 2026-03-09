import { checkPagePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { getAccessibleStationIds } from '@/lib/isp/permissions';
import { InventoryStationPage } from './inventory-client';
import { ISP_DB } from '@/lib/isp/models';

export default async function InventoryPage() {
  await checkPagePermission('/admin/inventory');

  const session = await auth();
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const usersCol = db.collection('users');
  const stationsCol = db.collection('stations'); // Same collection as /admin/stations

  const user = await usersCol.findOne(
    { email: session.user.email.toLowerCase() },
    { projection: { role: 1, assignedStationId: 1 } }
  ) as { role?: string; assignedStationId?: string | null } | null;

  const isSuperAdmin = user?.role === 'superadmin';
  const assignedStationId = user?.assignedStationId;

  // Fetch ALL stations from DB (same as /admin/stations) - no filtering
  const rawStations = await stationsCol.find({}).sort({ name: 1 }).toArray();

  // Map to inventory format - each station gets UNIQUE id (use _id when stationId duplicated)
  const seenStationIds = new Set<string>();
  const mappedStations = rawStations
    .map((s: { stationId?: string; _id?: unknown; name?: string; location?: string }) => {
      const stationId = s.stationId || '';
      const mongoId = s._id?.toString?.() || '';
      const isDuplicateStationId = stationId && seenStationIds.has(stationId);
      if (stationId) seenStationIds.add(stationId);
      // Use _id as id when stationId is duplicated so each station is selectable separately
      const id = isDuplicateStationId ? mongoId : (stationId || mongoId);
      return {
        id,
        stationId: stationId || mongoId, // For API calls - resolved by API when id is _id
        _id: mongoId,
        stationName: s.name || 'Unknown',
        code: stationId || mongoId,
        location: s.location || '',
      };
    })
    .filter((s) => s.id);

  const stationIds = mappedStations.map((s) => s.id);
  let defaultStationId: string | null = null;
  if (assignedStationId && stationIds.includes(assignedStationId)) {
    defaultStationId = assignedStationId;
  } else if (mappedStations.length > 0) {
    defaultStationId = mappedStations[0].id;
  }

  return (
    <InventoryStationPage
      stations={mappedStations}
      allStationsForSelection={mappedStations}
      defaultStationId={defaultStationId}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
