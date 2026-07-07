import { sendSMS } from '@/lib/sms';
import clientPromise from '@/lib/mongodb';
import { accountTypeFromUser } from '@/lib/user-account-types';
import { resolveStationName } from '@/lib/isp/equipment-notification-recipients';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export function crossedLowStockThreshold(
  balanceBefore: number,
  balanceAfter: number,
  minimumLevel: number
): boolean {
  return balanceBefore > minimumLevel && balanceAfter <= minimumLevel;
}

async function getSuperAdminPhones(): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const users = await db
    .collection('users')
    .find({
      approved: true,
      phone: { $exists: true, $nin: [null, ''] },
    })
    .project({
      phone: 1,
      role: 1,
      accountType: 1,
      ispRole: 1,
      approved: 1,
    })
    .toArray();

  const phones = new Set<string>();
  for (const user of users) {
    if (accountTypeFromUser(user) !== 'superadmin') continue;
    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (phone) phones.add(phone);
  }
  return [...phones];
}

export async function notifyLowStockIfNeeded(params: {
  itemId: string;
  itemName: string;
  itemCode?: string | null;
  stationId: string;
  balanceBefore: number;
  balanceAfter: number;
  minimumLevel: number;
  unitType?: string;
}): Promise<void> {
  if (!crossedLowStockThreshold(params.balanceBefore, params.balanceAfter, params.minimumLevel)) {
    return;
  }

  const phones = await getSuperAdminPhones();
  if (phones.length === 0) {
    console.warn(`[Low Stock SMS] No super admin phones for item ${params.itemName}`);
    return;
  }

  const stationName = await resolveStationName(params.stationId);
  const unit = params.unitType === 'meters' || params.unitType === 'm' ? 'm' : 'pcs';
  const statusLabel =
    params.balanceAfter <= 0 ? 'OUT OF STOCK' : 'LOW STOCK';

  const message = `${statusLabel} Alert\n\nItem: ${params.itemName}${
    params.itemCode ? `\nCode: ${params.itemCode}` : ''
  }\nStation: ${stationName}\nAvailable: ${params.balanceAfter} ${unit}\nMinimum: ${params.minimumLevel} ${unit}\n\nIconic Fibre Inventory`;

  try {
    await sendSMS({ mobile: phones, msg: message });
    console.log(
      `[Low Stock SMS] ✅ Sent ${statusLabel} alert for ${params.itemName} at ${stationName} to ${phones.length} super admin(s)`
    );

    await clientPromise.then((client) =>
      client
        .db(ISP_DB)
        .collection(ISP_COLLECTIONS.inventoryItems)
        .updateOne(
          { id: params.itemId },
          { $set: { lastLowStockAlertAt: new Date(), updatedAt: new Date() } }
        )
    );
  } catch (error) {
    console.error(`[Low Stock SMS] ❌ Failed for ${params.itemName}:`, error);
  }
}

/** Load item fields and run low-stock check after a quantity change. */
export async function checkItemLowStockAfterUpdate(
  itemId: string,
  balanceBefore: number,
  balanceAfter: number,
  stationId: string
): Promise<void> {
  const client = await clientPromise;
  const item = await client.db(ISP_DB).collection(ISP_COLLECTIONS.inventoryItems).findOne(
    { id: itemId },
    { projection: { itemName: 1, itemCode: 1, minimumLevel: 1, unitType: 1 } }
  );
  if (!item) return;

  await notifyLowStockIfNeeded({
    itemId,
    itemName: item.itemName,
    itemCode: item.itemCode,
    stationId,
    balanceBefore,
    balanceAfter,
    minimumLevel: item.minimumLevel ?? 0,
    unitType: item.unitType,
  });
}
