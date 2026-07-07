import clientPromise from '@/lib/mongodb';
import { accountTypeFromUser, type AccountType } from '@/lib/user-account-types';

const ADMIN_ACCOUNT_TYPES = new Set<AccountType>(['superadmin', 'admin']);

export interface StaffNotificationRecipient {
  email: string;
  name: string;
  phone: string;
  accountType: AccountType;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}

/** Approved super admins and admins with phone numbers. */
export async function getAdminSuperAdminRecipients(): Promise<StaffNotificationRecipient[]> {
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

    const accountType = accountTypeFromUser(user);
    if (!ADMIN_ACCOUNT_TYPES.has(accountType)) continue;

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

  return [...byPhone.values()];
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
