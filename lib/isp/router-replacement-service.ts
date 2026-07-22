import type { Db } from 'mongodb';
import { generateUUID } from '@/lib/uuid';
import { createAuditLog } from '@/lib/isp/audit';
import { ISP_COLLECTIONS, type RouterReplacementReturn } from '@/lib/isp/models';

function normalizeId(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

export async function findRouterUnitByIdentifiers(
  db: Db,
  serial?: string | null,
  mac?: string | null
) {
  const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);
  const serialNorm = normalizeId(serial);
  const macNorm = normalizeId(mac);

  if (!serialNorm && !macNorm) return null;

  const or: Record<string, unknown>[] = [];
  if (serialNorm) {
    or.push({ serialNumber: { $regex: new RegExp(`^${escapeRegex(serial!.trim())}$`, 'i') } });
  }
  if (macNorm) {
    or.push({ macAddress: { $regex: new RegExp(`^${escapeRegex(mac!.trim())}$`, 'i') } });
  }

  return routersCol.findOne(or.length === 1 ? or[0] : { $or: or });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createRouterReplacementReturn(
  db: Db,
  params: {
    stationId: string;
    technicianId: string;
    technicianName?: string;
    ticketId?: string;
    jobReference?: string | null;
    issueItemId: string;
    sourceIssueId: string;
    itemId: string;
    itemName?: string;
    newRouterUnitId: string;
    newRouterSerial?: string | null;
    newRouterMac?: string | null;
    oldRouterSerial?: string | null;
    oldRouterMac?: string | null;
    notes?: string | null;
  }
): Promise<RouterReplacementReturn> {
  const col = db.collection(ISP_COLLECTIONS.routerReplacementReturns);
  const now = new Date();

  let oldRouterUnitId: string | null = null;
  const existingOld = await findRouterUnitByIdentifiers(
    db,
    params.oldRouterSerial,
    params.oldRouterMac
  );
  if (existingOld) {
    oldRouterUnitId = (existingOld as { id: string }).id;
  }

  const doc: RouterReplacementReturn = {
    id: generateUUID(),
    stationId: params.stationId,
    technicianId: params.technicianId,
    technicianName: params.technicianName || null,
    ticketId: params.ticketId || null,
    jobReference: params.jobReference || null,
    issueItemId: params.issueItemId,
    sourceIssueId: params.sourceIssueId,
    itemId: params.itemId,
    itemName: params.itemName || null,
    newRouterUnitId: params.newRouterUnitId,
    newRouterSerial: params.newRouterSerial || null,
    newRouterMac: params.newRouterMac || null,
    oldRouterSerial: params.oldRouterSerial?.trim() || null,
    oldRouterMac: params.oldRouterMac?.trim() || null,
    oldRouterUnitId,
    status: 'pending',
    returnCondition: null,
    returnTime: null,
    returnStationId: null,
    notes: params.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(doc);
  return doc;
}

export async function processRouterReplacementReturn(
  db: Db,
  params: {
    replacementId: string;
    returnCondition: string;
    returnStationId: string;
    oldRouterSerial?: string | null;
    oldRouterMac?: string | null;
    notes?: string | null;
    markLost?: boolean;
    userId: string;
  }
): Promise<{ replacement: RouterReplacementReturn; stockRestored: boolean }> {
  const replacementsCol = db.collection(ISP_COLLECTIONS.routerReplacementReturns);
  const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);
  const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
  const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

  const replacement = (await replacementsCol.findOne({
    id: params.replacementId,
  })) as RouterReplacementReturn | null;

  if (!replacement) {
    throw new Error('Replacement record not found');
  }
  if (replacement.status !== 'pending') {
    throw new Error('This replacement return was already processed');
  }

  const isLost = params.markLost || params.returnCondition === 'Lost';
  const isDamaged = !isLost && ['Damaged', 'Repair'].includes(params.returnCondition);
  const serial = params.oldRouterSerial?.trim() || replacement.oldRouterSerial;
  const mac = params.oldRouterMac?.trim() || replacement.oldRouterMac;

  if (!isLost && !serial && !mac) {
    throw new Error('Enter serial or MAC for the old router being returned');
  }

  const now = new Date();
  let oldRouterUnitId = replacement.oldRouterUnitId;
  let stockRestored = false;

  if (!isLost) {
    let unit = oldRouterUnitId
      ? await routersCol.findOne({ id: oldRouterUnitId })
      : await findRouterUnitByIdentifiers(db, serial, mac);

    if (unit) {
      oldRouterUnitId = (unit as { id: string }).id;
      await routersCol.updateOne(
        { id: oldRouterUnitId },
        {
          $set: {
            status: isDamaged ? 'damaged' : 'available',
            technicianId: null,
            jobReference: replacement.ticketId || null,
            issueItemId: null,
            ticketId: isDamaged ? replacement.ticketId || null : null,
            stationIds: [(unit as { stationIds?: string[] }).stationIds?.[0] || params.returnStationId],
            updatedAt: now,
          },
        }
      );
    } else {
      const item = await itemsCol.findOne({ id: replacement.itemId });
      const itemName = (item as { itemName?: string } | null)?.itemName || replacement.itemName || 'Router';
      const newId = generateUUID();
      await routersCol.insertOne({
        id: newId,
        stationIds: [params.returnStationId],
        itemName,
        serialNumber: serial || null,
        macAddress: mac || null,
        status: isDamaged ? 'damaged' : 'available',
        ticketId: isDamaged ? replacement.ticketId || null : null,
        createdAt: now,
        updatedAt: now,
      });
      oldRouterUnitId = newId;
    }

    if (!isDamaged) {
      const item = await itemsCol.findOne({ id: replacement.itemId });
      if (item) {
        const balanceBefore = (item as { quantityAvailable: number }).quantityAvailable;
        const balanceAfter = balanceBefore + 1;
        await itemsCol.updateOne(
          { id: replacement.itemId },
          { $set: { quantityAvailable: balanceAfter, updatedAt: now } }
        );
        await txCol.insertOne({
          id: generateUUID(),
          stationId: params.returnStationId,
          itemId: replacement.itemId,
          transactionType: 'RETURN',
          quantity: 1,
          balanceBefore,
          balanceAfter,
          technicianId: replacement.technicianId,
          jobReference: replacement.ticketId || replacement.jobReference || null,
          approvedBy: params.userId,
          notes:
            params.notes ||
            `Replacement return — old router ${serial || mac || 'unit'} from ticket ${replacement.ticketId || 'N/A'}`,
          createdBy: params.userId,
          createdAt: now,
        });
        stockRestored = true;
      }
    } else {
      const item = await itemsCol.findOne({ id: replacement.itemId });
      if (item) {
        await txCol.insertOne({
          id: generateUUID(),
          stationId: params.returnStationId,
          itemId: replacement.itemId,
          transactionType: 'DAMAGE',
          quantity: 1,
          balanceBefore: (item as { quantityAvailable: number }).quantityAvailable,
          balanceAfter: (item as { quantityAvailable: number }).quantityAvailable,
          technicianId: replacement.technicianId,
          jobReference: replacement.ticketId || null,
          approvedBy: params.userId,
          notes: params.notes || params.returnCondition,
          createdBy: params.userId,
          createdAt: now,
        });
      }
    }
  }

  const status = isLost ? 'lost' : isDamaged ? 'damaged' : 'returned';

  await replacementsCol.updateOne(
    { id: params.replacementId },
    {
      $set: {
        status,
        returnCondition: params.returnCondition,
        returnTime: now,
        returnStationId: params.returnStationId,
        oldRouterSerial: serial || replacement.oldRouterSerial,
        oldRouterMac: mac || replacement.oldRouterMac,
        oldRouterUnitId,
        notes: params.notes || replacement.notes,
        updatedAt: now,
      },
    }
  );

  await createAuditLog({
    userId: params.userId,
    stationId: params.returnStationId,
    action: isLost ? 'ROUTER_REPLACEMENT_LOST' : 'ROUTER_REPLACEMENT_RETURN',
    entityType: 'routerReplacementReturn',
    entityId: params.replacementId,
    afterData: {
      status,
      returnCondition: params.returnCondition,
      oldRouterSerial: serial,
      oldRouterMac: mac,
      ticketId: replacement.ticketId,
    },
  });

  const updated = (await replacementsCol.findOne({ id: params.replacementId })) as RouterReplacementReturn;
  return { replacement: updated, stockRestored };
}
