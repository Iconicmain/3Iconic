import clientPromise from '@/lib/mongodb';
import { ISP_DB } from '@/lib/isp/models';

export interface LinkTechnicianResult {
  ispUserId: string;
  email: string;
  name: string;
}

/**
 * Manually link a ticket technician to an existing Gmail / login user by email.
 */
export async function linkTechnicianByEmail(
  email: string
): Promise<LinkTechnicianResult | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const user = await db.collection('users').findOne({ email: normalized });

  if (!user) return null;

  const ispUserId = (user as { id?: string; _id?: { toString(): string } }).id
    || (user as { _id?: { toString(): string } })._id?.toString();

  if (!ispUserId) return null;

  await db.collection('users').updateOne(
    { email: normalized },
    {
      $set: {
        ispRole: (user as { ispRole?: string }).ispRole || 'TECHNICIAN',
        accountType: (user as { accountType?: string }).accountType || 'technician',
        updatedAt: new Date(),
      },
    }
  );

  return {
    ispUserId,
    email: normalized,
    name: (user as { name?: string }).name || normalized,
  };
}
