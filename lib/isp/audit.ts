import clientPromise from '@/lib/mongodb';
import { generateUUID } from '@/lib/uuid';
import { ISP_COLLECTIONS, ISP_DB } from './models';

export async function createAuditLog(params: {
  userId: string;
  stationId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    const client = await clientPromise;
    const db = client.db(ISP_DB);
    await db.collection(ISP_COLLECTIONS.auditLogs).insertOne({
      id: generateUUID(),
      ...params,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[Audit] Failed to create audit log:', err);
  }
}
