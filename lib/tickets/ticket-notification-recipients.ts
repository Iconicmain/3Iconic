import clientPromise from '@/lib/mongodb';
import {
  accountTypeFromUser,
  type AccountType,
} from '@/lib/user-account-types';

const NOTIFY_ACCOUNT_TYPES = new Set<AccountType>([
  'superadmin',
  'admin',
  'technician',
  'customer_care',
]);

export interface TicketNotificationRecipient {
  email: string;
  name: string;
  phone: string;
  accountType: AccountType;
}

/**
 * Approved staff with phone numbers who should receive new-ticket SMS alerts.
 */
export async function getTicketNotificationRecipients(): Promise<TicketNotificationRecipient[]> {
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

  const byPhone = new Map<string, TicketNotificationRecipient>();

  for (const user of users) {
    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (!phone) continue;

    const accountType = accountTypeFromUser(user);
    if (!NOTIFY_ACCOUNT_TYPES.has(accountType)) continue;

    const normalized = phone.replace(/\s+/g, '');
    if (!byPhone.has(normalized)) {
      byPhone.set(normalized, {
        email: user.email,
        name: user.name || user.email,
        phone,
        accountType,
      });
    }
  }

  return [...byPhone.values()];
}

export async function getTicketNotificationPhoneNumbers(): Promise<string[]> {
  return (await getTicketNotificationRecipients()).map((r) => r.phone);
}
