import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ISP_DB } from './models';

const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Resolve stationIdOrMongoId to actual stationId for DB queries.
 * When id is a MongoDB ObjectId (24 hex chars), look up the station and return its stationId.
 */
export async function resolveStationId(stationIdOrMongoId: string): Promise<string> {
  if (!stationIdOrMongoId) return stationIdOrMongoId;
  if (!MONGO_ID_REGEX.test(stationIdOrMongoId)) return stationIdOrMongoId;

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const station = await db.collection('stations').findOne(
    { _id: new ObjectId(stationIdOrMongoId) },
    { projection: { stationId: 1 } }
  );
  return station?.stationId ?? stationIdOrMongoId;
}
