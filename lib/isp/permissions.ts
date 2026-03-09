import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ISP_COLLECTIONS, ISP_DB } from './models';

export type IspUserRole = 'SUPER_ADMIN' | 'STATION_MANAGER' | 'INVENTORY_OFFICER' | 'TECHNICIAN';

interface IspUserRecord {
  id: string;
  email: string;
  name: string;
  role?: string;
  ispRole?: IspUserRole;
  assignedStationId?: string | null;
  approved?: boolean;
}

/**
 * Get current user's ISP role and station assignment
 * Superadmins are treated as SUPER_ADMIN
 */
export async function getIspUserContext(): Promise<{
  userId: string;
  email: string;
  name: string;
  role: IspUserRole;
  assignedStationId: string | null;
  canAccessAllStations: boolean;
} | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const usersCol = db.collection('users');
  const user = await usersCol.findOne(
    { email: session.user.email.toLowerCase() },
    { projection: { id: 1, email: 1, name: 1, role: 1, ispRole: 1, assignedStationId: 1, approved: 1 } }
  ) as IspUserRecord | null;

  if (!user || user.approved === false) return null;

  // Superadmin in main system = SUPER_ADMIN in ISP
  const ispRole: IspUserRole =
    user.role === 'superadmin'
      ? 'SUPER_ADMIN'
      : (user.ispRole as IspUserRole) || 'TECHNICIAN';

  const canAccessAllStations = ispRole === 'SUPER_ADMIN';
  const assignedStationId = user.assignedStationId ?? null;

  return {
    userId: user.id || (user as { _id?: unknown }).toString(),
    email: user.email,
    name: user.name,
    role: ispRole,
    assignedStationId,
    canAccessAllStations,
  };
}

/**
 * Check if user can access a specific station
 * stationId can be actual stationId (ST-001) or MongoDB _id when stations have duplicate IDs
 */
export async function canAccessStation(stationIdOrMongoId: string): Promise<boolean> {
  const ctx = await getIspUserContext();
  if (!ctx) return false;
  if (ctx.canAccessAllStations) return true;
  // Resolve mongoId to stationId for comparison
  const resolved = await import('./station-resolve').then((m) => m.resolveStationId(stationIdOrMongoId));
  return ctx.assignedStationId === resolved || ctx.assignedStationId === stationIdOrMongoId;
}

/**
 * Check if user can access super admin page
 */
export async function canAccessSuperAdmin(): Promise<boolean> {
  const ctx = await getIspUserContext();
  return ctx?.role === 'SUPER_ADMIN';
}

/**
 * Get station IDs the user can access (for filtering)
 */
export async function getAccessibleStationIds(): Promise<string[]> {
  const ctx = await getIspUserContext();
  if (!ctx) return [];
  if (ctx.canAccessAllStations) {
    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const stations = await db.collection(ISP_COLLECTIONS.stations).find({}).toArray();
    return stations.map((s: { stationId: string }) => s.stationId);
  }
  return ctx.assignedStationId ? [ctx.assignedStationId] : [];
}
