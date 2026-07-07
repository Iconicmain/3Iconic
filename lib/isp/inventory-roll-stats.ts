import clientPromise from '@/lib/mongodb';
import { generateUUID } from '@/lib/uuid';
import { ISP_COLLECTIONS } from '@/lib/isp/models';

type Db = ReturnType<Awaited<ReturnType<typeof clientPromise>>['db']>;

export interface RollSummary {
  rollCount: number;
  activeRolls: number;
  finishedRolls: number;
  damagedRolls: number;
}

export interface RollDetail {
  id: string;
  rollCode: string;
  originalMeters: number;
  remainingMeters: number;
  metersIssued: number;
  metersUsed: number;
  metersReturned: number;
  wasteMeters: number;
  status: string;
  createdAt: Date;
  lastMovement: Date;
}

function isMeterItem(item: Record<string, unknown>): boolean {
  return !!(item.isCable || item.unitType === 'meters' || item.unitType === 'm');
}

export async function enrichItemsWithRollStats(
  db: Db,
  items: Record<string, unknown>[],
  stationId?: string
) {
  const meterItems = items.filter(isMeterItem);
  const itemIds = meterItems.map((i) => i.id as string);
  const itemNames = meterItems.map((i) => i.itemName as string);

  const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);
  const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

  let allRolls: Record<string, unknown>[] = [];
  if (itemIds.length > 0 || stationId) {
    const rollQuery: Record<string, unknown> = {
      $or: [
        ...(itemIds.length ? [{ inventoryItemId: { $in: itemIds } }] : []),
        ...(itemNames.length ? [{ cableType: { $in: itemNames }, inventoryItemId: { $exists: false } }] : []),
      ],
    };
    if (stationId) rollQuery.stationId = stationId;
    if (rollQuery.$or && (rollQuery.$or as unknown[]).length === 0) delete rollQuery.$or;
    allRolls = await rollsCol.find(rollQuery).toArray();
  }

  const lastTx = await txCol
    .find({ itemId: { $in: items.map((i) => i.id as string) } })
    .sort({ createdAt: -1 })
    .toArray();
  const lastTxByItem = new Map<string, Date>();
  for (const tx of lastTx as { itemId: string; createdAt: Date }[]) {
    if (!lastTxByItem.has(tx.itemId)) lastTxByItem.set(tx.itemId, tx.createdAt);
  }

  return items.map((item) => {
    let rollSummary: RollSummary | null = null;
    if (isMeterItem(item)) {
      let itemRolls = (allRolls as {
        inventoryItemId?: string;
        cableType?: string;
        stationId?: string;
        status: string;
        currentRemainingMeters: number;
      }[]).filter(
        (r) =>
          r.inventoryItemId === item.id ||
          (!r.inventoryItemId && r.cableType === item.itemName)
      );
      if (stationId) itemRolls = itemRolls.filter((r) => r.stationId === stationId);
      rollSummary = {
        rollCount: itemRolls.length,
        activeRolls: itemRolls.filter((r) => r.status === 'ACTIVE' && r.currentRemainingMeters > 0).length,
        finishedRolls: itemRolls.filter((r) => r.status === 'FINISHED' || r.status === 'CLOSED').length,
        damagedRolls: itemRolls.filter((r) => r.status === 'DAMAGED').length,
      };
    }
    return {
      ...item,
      rollSummary,
      lastMovement: lastTxByItem.get(item.id as string) || item.updatedAt || null,
    };
  });
}

export async function getRollDetailsForItem(
  db: Db,
  stationId: string,
  itemId: string,
  itemName: string
) {
  const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);
  const usageCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);

  const rolls = await rollsCol
    .find({
      stationId,
      $or: [{ inventoryItemId: itemId }, { cableType: itemName, inventoryItemId: { $exists: false } }],
    })
    .sort({ rollCode: 1 })
    .toArray();

  const rollIds = rolls.map((r: { id: string }) => r.id);
  const usageLogs =
    rollIds.length > 0
      ? await usageCol.find({ rollId: { $in: rollIds } }).toArray()
      : [];

  const usageByRoll = new Map<string, { issued: number; used: number; returned: number; waste: number }>();
  for (const log of usageLogs as {
    rollId: string;
    metersIssued: number;
    metersUsed: number;
    metersReturned: number;
    wasteMeters?: number;
  }[]) {
    const u = usageByRoll.get(log.rollId) || { issued: 0, used: 0, returned: 0, waste: 0 };
    u.issued += log.metersIssued || 0;
    u.used += log.metersUsed || 0;
    u.returned += log.metersReturned || 0;
    u.waste += log.wasteMeters || 0;
    usageByRoll.set(log.rollId, u);
  }

  const rollDetails: RollDetail[] = rolls.map(
    (r: {
      id: string;
      rollCode: string;
      originalMeters: number;
      currentRemainingMeters: number;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }) => {
      const u = usageByRoll.get(r.id) || { issued: 0, used: 0, returned: 0, waste: 0 };
      return {
        id: r.id,
        rollCode: r.rollCode,
        originalMeters: r.originalMeters,
        remainingMeters: r.currentRemainingMeters,
        metersIssued: u.issued,
        metersUsed: u.used,
        metersReturned: u.returned,
        wasteMeters: u.waste,
        status: r.status,
        createdAt: r.createdAt,
        lastMovement: r.updatedAt,
      };
    }
  );

  const activeRolls = rollDetails.filter((r) => r.status === 'ACTIVE' && r.remainingMeters > 0).length;
  const finishedRolls = rollDetails.filter((r) => r.status === 'FINISHED' || r.status === 'CLOSED').length;
  const totalOriginal = rollDetails.reduce((s, r) => s + r.originalMeters, 0);
  const totalRemaining = rollDetails.reduce((s, r) => s + r.remainingMeters, 0);
  const totalWaste = rollDetails.reduce((s, r) => s + r.wasteMeters, 0);

  return {
    rolls: rollDetails,
    rollCount: rollDetails.length,
    activeRolls,
    finishedRolls,
    totalOriginal,
    totalRemaining,
    totalWaste,
  };
}

export async function syncInventoryItemMeters(
  db: Db,
  roll: { inventoryItemId?: string; cableType?: string; stationId: string },
  deltaMeters: number,
  userId: string,
  notes: string
) {
  const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
  const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

  let item = roll.inventoryItemId
    ? await itemsCol.findOne({ id: roll.inventoryItemId })
    : await itemsCol.findOne({
        itemName: roll.cableType,
        $or: [{ stationId: roll.stationId }, { stationIds: roll.stationId }],
        isCable: true,
      });

  if (!item) return;

  const balanceBefore = item.quantityAvailable || 0;
  const balanceAfter = Math.max(0, balanceBefore + deltaMeters);

  await itemsCol.updateOne(
    { id: item.id },
    { $set: { quantityAvailable: balanceAfter, updatedAt: new Date() } }
  );

  await txCol.insertOne({
    id: generateUUID(),
    stationId: roll.stationId,
    itemId: item.id,
    transactionType: deltaMeters >= 0 ? 'RETURN' : 'ISSUE',
    quantity: Math.abs(deltaMeters),
    balanceBefore,
    balanceAfter,
    notes,
    createdBy: userId,
    createdAt: new Date(),
  });
}
