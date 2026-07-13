import clientPromise from '@/lib/mongodb';
import { accountTypeFromUser, isSuperAdminAccount, type AccountType } from '@/lib/user-account-types';

export interface StaffNotificationRecipient {
  email: string;
  name: string;
  phone: string;
  accountType: AccountType;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}

/** Approved super admins with phone numbers (issue/return SMS). */
export async function getSuperAdminRecipients(): Promise<StaffNotificationRecipient[]> {
  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const users = await db
    .collection('users')
    .find({
      approved: true,
      phone: { $exists: true, $nin: [null, ''] },
    })
    .project({
      email: 1,
      name: 1,
      phone: 1,
      role: 1,
      accountType: 1,
      ispRole: 1,
      approved: 1,
    })
    .toArray();

  const byPhone = new Map<string, StaffNotificationRecipient>();

  for (const user of users) {
    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (!phone) continue;

    if (!isSuperAdminAccount(user)) continue;

    const accountType = accountTypeFromUser(user);
    const key = normalizePhone(phone);
    if (!byPhone.has(key)) {
      byPhone.set(key, {
        email: user.email,
        name: user.name || user.email,
        phone,
        accountType,
      });
    }
  }

  if (byPhone.size === 0) {
    console.warn(
      '[Equipment SMS] No super admin phone numbers found. Ensure super admins are approved and have phone numbers in the users collection.'
    );
  } else {
    console.log(`[Equipment SMS] Found ${byPhone.size} super admin phone number(s)`);
  }

  return [...byPhone.values()];
}

/** @deprecated Use getSuperAdminRecipients — kept for compatibility. */
export async function getAdminSuperAdminRecipients(): Promise<StaffNotificationRecipient[]> {
  return getSuperAdminRecipients();
}

/** Resolve one technician's contact (approved user with phone, or technicians collection fallback). */
export async function resolveTechnicianContact(
  technicianId: string
): Promise<{ name: string; phone: string } | null> {
  if (!technicianId?.trim()) return null;

  const client = await clientPromise;
  const db = client.db('tixmgmt');

  const user = await db.collection('users').findOne(
    {
      id: technicianId,
      approved: true,
      phone: { $exists: true, $nin: [null, ''] },
    },
    { projection: { name: 1, phone: 1, email: 1 } }
  );

  if (user?.phone) {
    return {
      name: user.name || user.email || 'Technician',
      phone: user.phone.trim(),
    };
  }

  const tech = await db.collection('technicians').findOne({
    $or: [{ ispUserId: technicianId }, { id: technicianId }],
    phone: { $exists: true, $nin: [null, ''] },
  });

  if (tech?.phone) {
    return {
      name: tech.name || 'Technician',
      phone: String(tech.phone).trim(),
    };
  }

  return null;
}

export async function resolveStaffName(userId: string): Promise<string> {
  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const user = await db.collection('users').findOne({ id: userId }, { projection: { name: 1, email: 1 } });
  return user?.name || user?.email || 'Staff';
}

export async function resolveStationName(stationId: string): Promise<string> {
  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const { ObjectId } = await import('mongodb');
  const or: Record<string, unknown>[] = [{ stationId }];
  if (ObjectId.isValid(stationId)) {
    or.push({ _id: new ObjectId(stationId) });
  }
  const station = await db.collection('stations').findOne({ $or: or });
  return station?.name || station?.stationName || stationId;
}
