import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ISP_DB } from './models';
import { resolveStationId } from './station-resolve';

export interface InventoryStationOption {
  id: string;
  stationId: string;
  _id: string;
  stationName: string;
  code: string;
  location: string;
}

/** Same station list shape as /admin/inventory (handles duplicate stationIds). */
export function mapStationRecords(
  rawStations: Array<{ stationId?: string; _id?: unknown; name?: string; location?: string }>
): InventoryStationOption[] {
  const seenStationIds = new Set<string>();
  return rawStations
    .map((s) => {
      const stationId = s.stationId || '';
      const mongoId = s._id?.toString?.() || '';
      const isDuplicateStationId = stationId && seenStationIds.has(stationId);
      if (stationId) seenStationIds.add(stationId);
      const id = isDuplicateStationId ? mongoId : stationId || mongoId;
      return {
        id,
        stationId: stationId || mongoId,
        _id: mongoId,
        stationName: s.name || 'Unknown',
        code: stationId || mongoId,
        location: s.location || '',
      };
    })
    .filter((s) => s.id);
}

export function normalizeAssignedStationIds(user: {
  assignedStationIds?: string[] | null;
  assignedStationId?: string | null;
}): string[] {
  if (Array.isArray(user.assignedStationIds) && user.assignedStationIds.length > 0) {
    return [...new Set(user.assignedStationIds.map(String))];
  }
  if (user.assignedStationId) return [String(user.assignedStationId)];
  return [];
}

export function filterStationsForUser(
  stations: InventoryStationOption[],
  assignedIds: string[]
): InventoryStationOption[] {
  if (assignedIds.length === 0) return [];
  const allowed = new Set(assignedIds.map(String));
  return stations.filter(
    (s) => allowed.has(s.id) || allowed.has(s.stationId) || allowed.has(s._id)
  );
}

export async function stationMatchesAssignment(
  stationIdOrMongoId: string,
  assignedIds: string[]
): Promise<boolean> {
  if (assignedIds.length === 0) return false;
  const allowed = new Set(assignedIds.map(String));
  if (allowed.has(stationIdOrMongoId)) return true;

  const resolved = await resolveStationId(stationIdOrMongoId);
  if (allowed.has(resolved)) return true;

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const orClauses: Record<string, unknown>[] = [
    { stationId: stationIdOrMongoId },
    { stationId: resolved },
  ];
  if (ObjectId.isValid(stationIdOrMongoId)) {
    orClauses.push({ _id: new ObjectId(stationIdOrMongoId) });
  }

  const station = await db.collection('stations').findOne({ $or: orClauses });
  if (!station) return false;

  const keys = [station.stationId, station._id?.toString()].filter(Boolean) as string[];
  return keys.some((k) => allowed.has(k));
}

export async function fetchAllInventoryStations(): Promise<InventoryStationOption[]> {
  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const raw = await db.collection('stations').find({}).sort({ name: 1 }).toArray();
  return mapStationRecords(raw as Parameters<typeof mapStationRecords>[0]);
}
