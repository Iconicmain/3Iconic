import { checkPagePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { InventoryStationPage } from './inventory-client';
import { ISP_DB } from '@/lib/isp/models';
import {
  filterStationsForUser,
  mapStationRecords,
  normalizeAssignedStationIds,
} from '@/lib/isp/station-access';

export default async function InventoryPage() {
  await checkPagePermission('/admin/inventory');

  const session = await auth();
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  let isSuperAdmin = session.user.role === 'superadmin';
  let assignedStationIds: string[] = [];
  let mappedStations: ReturnType<typeof mapStationRecords> = [];

  try {
    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const usersCol = db.collection('users');
    const stationsCol = db.collection('stations');

    const user = await usersCol.findOne(
      { email: session.user.email.toLowerCase() },
      { projection: { role: 1, assignedStationId: 1, assignedStationIds: 1, ispRole: 1 } }
    ) as {
      role?: string;
      assignedStationId?: string | null;
      assignedStationIds?: string[] | null;
      ispRole?: string;
    } | null;

    isSuperAdmin = user?.role === 'superadmin';
    assignedStationIds = isSuperAdmin ? [] : normalizeAssignedStationIds(user || {});

    const rawStations = await stationsCol.find({}).sort({ name: 1 }).toArray();
    const allMapped = mapStationRecords(
      rawStations as Parameters<typeof mapStationRecords>[0]
    );

    mappedStations = isSuperAdmin
      ? allMapped
      : filterStationsForUser(allMapped, assignedStationIds);
  } catch (error) {
    console.error('[InventoryPage] Database error:', error);
  }

  let defaultStationId: string | null = null;
  if (isSuperAdmin) {
    defaultStationId = 'all';
  } else if (mappedStations.length === 1) {
    defaultStationId = mappedStations[0].id;
  } else if (mappedStations.length > 1) {
    defaultStationId = mappedStations[0].id;
  }

  return (
    <InventoryStationPage
      stations={mappedStations}
      allStationsForSelection={mappedStations}
      defaultStationId={defaultStationId}
      isSuperAdmin={isSuperAdmin}
      scopedStationAccess={!isSuperAdmin}
    />
  );
}
