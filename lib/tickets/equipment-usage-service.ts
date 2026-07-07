import clientPromise from '@/lib/mongodb';
import { generateUUID } from '@/lib/uuid';
import { createAuditLog } from '@/lib/isp/audit';
import { stationVisibilityFilter } from '@/lib/isp/issue-types';
import { syncInventoryItemMeters } from '@/lib/isp/inventory-roll-stats';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import type { Db } from 'mongodb';
import type {
  EquipmentUsageType,
  IssuedEquipmentOption,
  TicketActivityEntry,
  TicketEquipmentUsageRecord,
} from './equipment-usage-types';

const TICKET_ACTIVITY_COLLECTION = 'ticket_activity_logs';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function resolveIspStationIdFromTicketStation(stationName: string): Promise<{
  stationId: string | null;
  stationLabel: string;
}> {
  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const station = await db.collection('stations').findOne({
    name: { $regex: new RegExp(`^${escapeRegex(stationName.trim())}$`, 'i') },
  });
  if (!station) {
    return { stationId: null, stationLabel: stationName };
  }
  const stationId = (station as { stationId?: string; _id?: { toString(): string } }).stationId
    || (station as { _id?: { toString(): string } })._id?.toString()
    || null;
  return {
    stationId,
    stationLabel: (station as { name?: string }).name || stationName,
  };
}

export async function resolveTechnicianIdsByNames(names: string[]): Promise<
  Map<string, { id: string; name: string }>
> {
  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const map = new Map<string, { id: string; name: string }>();

  const trimmedNames = names.map((n) => n.trim()).filter(Boolean);
  if (trimmedNames.length === 0) return map;

  // Prefer explicit ispUserId links on ticket technicians
  const techDocs = await db
    .collection('technicians')
    .find({ name: { $in: trimmedNames } })
    .project({ name: 1, ispUserId: 1, linkedEmail: 1 })
    .toArray();

  for (const rawName of trimmedNames) {
    const linked = techDocs.find(
      (t: { name?: string; ispUserId?: string; linkedEmail?: string }) =>
        (t.name || '').toLowerCase() === rawName.toLowerCase() && t.ispUserId
    );
    if (linked) {
      map.set(rawName, { id: linked.ispUserId!, name: linked.name || rawName });
    }
  }

  // Match by linked Gmail on technician record
  for (const rawName of trimmedNames) {
    if (map.has(rawName)) continue;
    const tech = techDocs.find(
      (t: { name?: string; linkedEmail?: string }) =>
        (t.name || '').toLowerCase() === rawName.toLowerCase() && t.linkedEmail
    );
    if (tech?.linkedEmail) {
      const user = await db.collection('users').findOne({ email: tech.linkedEmail.toLowerCase() });
      if (user) {
        const id = (user as { id: string }).id;
        map.set(rawName, { id, name: (user as { name?: string }).name || rawName });
      }
    }
  }

  const users = await db
    .collection('users')
    .find({ approved: true })
    .project({ id: 1, name: 1, email: 1, isTechnicianProfile: 1 })
    .toArray();

  for (const rawName of trimmedNames) {
    if (map.has(rawName)) continue;
    const name = rawName;
    const match = users.find(
      (u: { name?: string; email?: string }) =>
        (u.name || '').toLowerCase() === name.toLowerCase() ||
        (u.email || '').toLowerCase() === name.toLowerCase()
    );
    if (match) {
      map.set(name, { id: (match as { id: string }).id, name: (match as { name?: string }).name || name });
    }
  }
  return map;
}

function itemOutstanding(item: {
  quantityTaken: number;
  quantityReturned: number;
  quantityUsed?: number;
  routerUnitIds?: string[];
  serializedUnits?: { status?: string }[];
}): number {
  if (item.serializedUnits?.length) {
    return item.serializedUnits.filter((u) => u.status === 'issued').length;
  }
  return Math.max(
    0,
    item.quantityTaken - item.quantityReturned - (item.quantityUsed || 0)
  );
}

async function enrichIssueItems(
  db: Db,
  issueItems: { itemId: string; routerUnitIds?: string[]; [key: string]: unknown }[]
) {
  const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
  const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);
  const allUnitIds = issueItems.flatMap((ii) => ii.routerUnitIds || []);
  const units =
    allUnitIds.length > 0
      ? await routersCol.find({ id: { $in: allUnitIds } }).toArray()
      : [];
  const unitMap = new Map(units.map((u: { id: string }) => [u.id, u]));

  return Promise.all(
    issueItems.map(async (ii) => {
      const invItem = await itemsCol.findOne({ id: ii.itemId });
      const serializedUnits = (ii.routerUnitIds || [])
        .map((id) => unitMap.get(id))
        .filter(Boolean)
        .map(
          (u: {
            id: string;
            serialNumber?: string;
            macAddress?: string;
            status?: string;
          }) => ({
            id: u.id,
            serialNumber: u.serialNumber || null,
            macAddress: u.macAddress || null,
            status: u.status || 'unknown',
            label: u.serialNumber || u.macAddress || u.id,
          })
        );
      return {
        ...ii,
        itemName: invItem?.itemName,
        itemCode: invItem?.itemCode,
        unitType: invItem?.unitType || ii.unitType,
        isCable: invItem?.isCable,
        serializedUnits,
      };
    })
  );
}

export async function fetchIssuedEquipmentForTicket(params: {
  stationName: string;
  technicianNames: string[];
  ticketId?: string;
}): Promise<{
  options: IssuedEquipmentOption[];
  stationId: string | null;
  technicianMatches: { name: string; id: string | null }[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const { stationId } = await resolveIspStationIdFromTicketStation(params.stationName);
  if (!stationId) {
    return {
      options: [],
      stationId: null,
      technicianMatches: params.technicianNames.map((n) => ({ name: n, id: null })),
      warnings: [`No inventory station found matching "${params.stationName}"`],
    };
  }

  const techMap = await resolveTechnicianIdsByNames(params.technicianNames);
  const technicianMatches = params.technicianNames.map((name) => ({
    name,
    id: techMap.get(name)?.id || null,
  }));

  const unmatched = technicianMatches.filter((t) => !t.id);
  if (unmatched.length > 0) {
    warnings.push(
      `Could not match inventory account for: ${unmatched.map((t) => t.name).join(', ')}`
    );
  }

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
  const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
  const logsCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);
  const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);

  const options: IssuedEquipmentOption[] = [];
  const techIds = [...techMap.values()].map((t) => t.id);

  for (const tech of techMap.values()) {
    const issues = await issuesCol
      .find({
        ...stationVisibilityFilter(stationId),
        technicianId: tech.id,
        status: { $in: ['OPEN', 'PARTIAL_RETURN'] },
      })
      .toArray();

    for (const issue of issues as { id: string; technicianId: string }[]) {
      const rawItems = await issueItemsCol.find({ technicianIssueId: issue.id }).toArray();
      const items = await enrichIssueItems(
        db,
        rawItems as { itemId: string; routerUnitIds?: string[]; id: string }[]
      );

      for (const item of items as {
        id: string;
        itemId: string;
        itemName?: string;
        itemCode?: string;
        unitType?: string;
        isCable?: boolean;
        serializedUnits?: { id: string; status?: string; label: string; serialNumber: string | null; macAddress: string | null }[];
        quantityTaken: number;
        quantityReturned: number;
        quantityUsed?: number;
      }[]) {
        if (item.isCable) continue;
        const outstanding = itemOutstanding(item);
        if (outstanding <= 0) continue;
        const isSerialized = (item.serializedUnits?.length || 0) > 0;
        options.push({
          kind: 'item',
          technicianId: tech.id,
          technicianName: tech.name,
          sourceIssueId: issue.id,
          issueItemId: item.id,
          itemId: item.itemId,
          itemName: item.itemName || 'Unknown item',
          itemCode: item.itemCode,
          unit: 'pcs',
          outstanding,
          isSerialized,
          serializedUnits: isSerialized
            ? item.serializedUnits!.filter((u) => u.status === 'issued')
            : undefined,
          optionKey: `item:${item.id}`,
        });
      }
    }

    const cableQuery = {
      $or: [
        { stationId },
        { sourceStationId: stationId },
        { primaryStationId: stationId },
        { sharedStationIds: stationId },
      ],
      technicianId: tech.id,
    };
    const logs = await logsCol.find(cableQuery).sort({ createdAt: -1 }).limit(50).toArray();
    const rollIds = [...new Set(logs.map((l: { rollId: string }) => l.rollId))];
    const rolls =
      rollIds.length > 0 ? await rollsCol.find({ id: { $in: rollIds } }).toArray() : [];
    const rollMap = new Map(
      rolls.map((r: { id: string; rollCode: string; cableType: string }) => [r.id, r])
    );

    for (const log of logs as {
      id: string;
      rollId: string;
      metersIssued: number;
      metersReturned: number;
      metersUsed?: number;
      wasteMeters?: number;
    }[]) {
      const settled = (log.metersReturned || 0) + (log.metersUsed || 0) + (log.wasteMeters || 0);
      const outstanding = log.metersIssued - settled;
      if (outstanding <= 0) continue;
      const roll = rollMap.get(log.rollId) as { rollCode?: string; cableType?: string } | undefined;
      options.push({
        kind: 'cable',
        technicianId: tech.id,
        technicianName: tech.name,
        sourceIssueId: log.id,
        usageLogId: log.id,
        itemName: roll?.cableType || 'Drop Cable',
        rollId: log.rollId,
        rollCode: roll?.rollCode,
        unit: 'm',
        outstanding,
        isSerialized: false,
        metersIssued: log.metersIssued,
        optionKey: `cable:${log.id}`,
      });
    }
  }

  if (techIds.length === 0) {
    warnings.push('Select technicians on the ticket to load issued equipment.');
  } else if (options.length === 0) {
    warnings.push('No pending issued equipment found for the selected technicians at this station.');
  }

  return { options, stationId, technicianMatches, warnings };
}

function usageTypeToReturnCondition(usageType: EquipmentUsageType): string {
  switch (usageType) {
    case 'damaged':
      return 'Damaged';
    case 'lost':
      return 'Lost';
    case 'repair':
      return 'Repair';
    case 'returned_unused':
      return 'Good';
    default:
      return 'Good';
  }
}

async function refreshIssueStatus(db: Db, issueId: string) {
  const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
  const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
  const allItems = await issueItemsCol.find({ technicianIssueId: issueId }).toArray();
  const allClosed = allItems.every(
    (i: { quantityReturned: number; quantityTaken: number; quantityUsed?: number }) =>
      i.quantityReturned + (i.quantityUsed || 0) >= i.quantityTaken
  );
  await issuesCol.updateOne(
    { id: issueId },
    {
      $set: {
        status: allClosed ? 'CLOSED' : 'PARTIAL_RETURN',
        updatedAt: new Date(),
      },
    }
  );
}

async function applyItemUsage(
  db: Db,
  row: TicketEquipmentUsageRecord,
  ticket: { ticketId: string; _id?: unknown },
  userId: string,
  stationId: string
): Promise<string[]> {
  const messages: string[] = [];
  const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
  const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
  const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
  const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);
  const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

  const issueItem = await issueItemsCol.findOne({ id: row.issueItemId });
  if (!issueItem) throw new Error(`Issue item not found: ${row.itemName}`);

  const issue = await issuesCol.findOne({ id: row.sourceIssueId });
  if (!issue) throw new Error(`Issue record not found for ${row.itemName}`);

  const qty = row.routerUnitIds?.length || row.quantityUsed || 0;
  const outstanding =
    issueItem.quantityTaken -
    issueItem.quantityReturned -
    (issueItem.quantityUsed || 0);

  if (row.usageType === 'still_with_technician') {
    messages.push(`${row.itemName} still with ${row.technicianName} (ticket ${ticket.ticketId})`);
    return messages;
  }

  if (qty > outstanding) {
    throw new Error(`Cannot use more than ${outstanding} of ${row.itemName}`);
  }

  if (row.routerUnitIds?.length) {
    const issuedIds: string[] = issueItem.routerUnitIds || [];
    for (const uid of row.routerUnitIds) {
      if (!issuedIds.includes(uid)) {
        throw new Error(`Unit was not part of the issue for ${row.itemName}`);
      }
    }
    const units = await routersCol.find({ id: { $in: row.routerUnitIds } }).toArray();
    for (const u of units as { status: string; macAddress?: string; serialNumber?: string }[]) {
      if (u.status !== 'issued') {
        throw new Error('Selected unit is no longer issued out');
      }
    }
  }

  const returnStationId = (issue as { sourceStationId?: string; stationId: string }).sourceStationId
    || (issue as { stationId: string }).stationId;

  if (row.usageType === 'installed') {
    if (row.routerUnitIds?.length) {
      await routersCol.updateMany(
        { id: { $in: row.routerUnitIds } },
        {
          $set: {
            status: 'installed',
            technicianId: null,
            jobReference: ticket.ticketId,
            issueItemId: null,
            ticketId: ticket.ticketId,
            updatedAt: new Date(),
          },
        }
      );
    }
    await issueItemsCol.updateOne(
      { id: row.issueItemId },
      {
        $inc: { quantityUsed: qty },
        $set: { updatedAt: new Date(), notes: row.notes || issueItem.notes },
      }
    );

    const invItem = await itemsCol.findOne({ id: issueItem.itemId });
    if (invItem && !row.routerUnitIds?.length) {
      await txCol.insertOne({
        id: generateUUID(),
        stationId: returnStationId,
        itemId: issueItem.itemId,
        transactionType: 'ISSUE',
        quantity: qty,
        balanceBefore: invItem.quantityAvailable,
        balanceAfter: invItem.quantityAvailable,
        technicianId: row.technicianId,
        jobReference: ticket.ticketId,
        approvedBy: userId,
        notes: row.notes || `Installed on ticket ${ticket.ticketId}`,
        createdBy: userId,
        createdAt: new Date(),
      });
    }

    await createAuditLog({
      userId,
      stationId,
      action: 'TICKET_EQUIPMENT_INSTALLED',
      entityType: 'ticket',
      entityId: ticket.ticketId,
      afterData: { row, ticketId: ticket.ticketId },
    });

    messages.push(
      row.routerUnitIds?.length
        ? `${row.itemName} installed on ticket ${ticket.ticketId}`
        : `${qty} ${row.itemName} used on ticket ${ticket.ticketId}`
    );
  } else {
    const condition = usageTypeToReturnCondition(row.usageType);
    const isDamagedOrLost = ['Damaged', 'Lost', 'Repair'].includes(condition);
    const newReturned = issueItem.quantityReturned + qty;

    await issueItemsCol.updateOne(
      { id: row.issueItemId },
      {
        $inc: { quantityReturned: qty },
        $set: {
          returnCondition: condition,
          returnTime: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (row.routerUnitIds?.length) {
      await routersCol.updateMany(
        { id: { $in: row.routerUnitIds } },
        {
          $set: {
            status: isDamagedOrLost ? 'damaged' : 'available',
            technicianId: null,
            jobReference: row.usageType === 'returned_unused' ? null : ticket.ticketId,
            issueItemId: null,
            ticketId: row.usageType === 'returned_unused' ? null : ticket.ticketId,
            updatedAt: new Date(),
          },
        }
      );
    }

    const invItem = await itemsCol.findOne({ id: issueItem.itemId });
    if (invItem && !isDamagedOrLost && row.usageType === 'returned_unused' && qty > 0) {
      const balanceBefore = invItem.quantityAvailable;
      const balanceAfter = balanceBefore + qty;
      await itemsCol.updateOne(
        { id: issueItem.itemId },
        { $set: { quantityAvailable: balanceAfter, updatedAt: new Date() } }
      );
      await txCol.insertOne({
        id: generateUUID(),
        stationId: returnStationId,
        itemId: issueItem.itemId,
        transactionType: 'RETURN',
        quantity: qty,
        balanceBefore,
        balanceAfter,
        technicianId: row.technicianId,
        jobReference: ticket.ticketId,
        approvedBy: userId,
        notes: row.notes || `Returned unused from ticket ${ticket.ticketId}`,
        createdBy: userId,
        createdAt: new Date(),
      });
      messages.push(`${qty} ${row.itemName} returned unused from ticket ${ticket.ticketId}`);
    } else if (row.usageType === 'damaged' || row.usageType === 'lost' || row.usageType === 'repair') {
      await createAuditLog({
        userId,
        stationId,
        action: 'TICKET_EQUIPMENT_DAMAGED',
        entityType: 'technicianIssueItem',
        entityId: row.issueItemId,
        afterData: { condition, ticketId: ticket.ticketId, row },
      });
      messages.push(`${row.itemName} marked ${condition.toLowerCase()} during ticket ${ticket.ticketId}`);
    }
  }

  await refreshIssueStatus(db, row.sourceIssueId);
  return messages;
}

async function applyCableUsage(
  db: Db,
  row: TicketEquipmentUsageRecord,
  ticket: { ticketId: string },
  userId: string,
  stationId: string
): Promise<string[]> {
  const messages: string[] = [];
  const logsCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);
  const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);

  const log = await logsCol.findOne({ id: row.usageLogId });
  if (!log) throw new Error(`Cable issue not found for ${row.itemName}`);

  if (row.usageType === 'still_with_technician') {
    messages.push(`${row.itemName} (${row.rollCode || row.rollId}) still with ${row.technicianName}`);
    return messages;
  }

  const metersUsed = row.metersUsed || 0;
  const metersReturned = row.metersReturned || 0;
  const wasteMeters = row.wasteMeters || 0;
  const alreadySettled =
    (log.metersReturned || 0) + (log.metersUsed || 0) + (log.wasteMeters || 0);
  const outstanding = log.metersIssued - alreadySettled;

  if (metersUsed + metersReturned + wasteMeters > outstanding) {
    throw new Error(
      `Cable meters cannot exceed ${outstanding}m outstanding on ${row.rollCode || row.rollId}`
    );
  }

  const newMetersReturned = (log.metersReturned || 0) + metersReturned;
  const newWasteMeters = (log.wasteMeters || 0) + wasteMeters;
  const newMetersUsed = (log.metersUsed || 0) + metersUsed;

  await logsCol.updateOne(
    { id: row.usageLogId },
    {
      $set: {
        metersReturned: newMetersReturned,
        metersUsed: newMetersUsed,
        wasteMeters: newWasteMeters,
        closingMeters: log.closingMeters + metersReturned,
        returnedAt: metersReturned > 0 ? new Date() : log.returnedAt,
        notes: row.notes || log.notes,
        updatedAt: new Date(),
      },
    }
  );

  const roll = await rollsCol.findOne({ id: log.rollId });
  if (roll && metersReturned > 0) {
    const newRemaining = roll.currentRemainingMeters + metersReturned;
    await rollsCol.updateOne(
      { id: log.rollId },
      {
        $set: {
          currentRemainingMeters: newRemaining,
          status: newRemaining > 0 && roll.status === 'FINISHED' ? 'ACTIVE' : roll.status,
          updatedAt: new Date(),
        },
      }
    );
    await syncInventoryItemMeters(
      db,
      roll,
      metersReturned,
      userId,
      `Returned ${metersReturned}m unused from ticket ${ticket.ticketId}`
    );
    messages.push(`${metersReturned}m unused cable returned from ticket ${ticket.ticketId}`);
  }

  if (metersUsed > 0) {
    messages.push(`${metersUsed}m ${row.itemName} used on ticket ${ticket.ticketId}`);
  }
  if (wasteMeters > 0) {
    messages.push(`${wasteMeters}m cable marked damaged/waste on ticket ${ticket.ticketId}`);
  }

  await createAuditLog({
    userId,
    stationId,
    action: 'TICKET_CABLE_USED',
    entityType: 'cableUsageLog',
    entityId: row.usageLogId,
    afterData: { metersUsed, metersReturned, wasteMeters, ticketId: ticket.ticketId },
  });

  return messages;
}

export async function applyTicketEquipmentUsage(params: {
  ticket: { ticketId: string; _id?: unknown; station: string };
  rows: TicketEquipmentUsageRecord[];
  userId: string;
  userEmail?: string | null;
}): Promise<{ equipmentUsed: TicketEquipmentUsageRecord[]; activityMessages: string[] }> {
  const { stationId } = await resolveIspStationIdFromTicketStation(params.ticket.station);
  if (!stationId) {
    throw new Error(`Cannot process equipment: no inventory station for "${params.ticket.station}"`);
  }

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const activityMessages: string[] = [`Ticket ${params.ticket.ticketId} resolved with equipment used`];

  for (const row of params.rows) {
    const rowMessages =
      row.kind === 'cable'
        ? await applyCableUsage(db, row, params.ticket, params.userId, stationId)
        : await applyItemUsage(db, row, params.ticket, params.userId, stationId);
    activityMessages.push(...rowMessages);
  }

  return { equipmentUsed: params.rows, activityMessages };
}

export async function appendTicketActivityLogs(
  ticketMongoId: string,
  entries: Omit<TicketActivityEntry, 'id' | 'createdAt'>[]
): Promise<void> {
  if (entries.length === 0) return;
  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const now = new Date();
  const docs = entries.map((e) => ({
    id: generateUUID(),
    ticketMongoId,
    ticketId: e.meta?.ticketId,
    action: e.action,
    message: e.message,
    createdBy: e.createdBy || null,
    meta: e.meta || {},
    createdAt: now,
  }));
  await db.collection(TICKET_ACTIVITY_COLLECTION).insertMany(docs);
}

export async function buildEquipmentSummaryMessage(
  rows: TicketEquipmentUsageRecord[],
  technicianName?: string
): Promise<string> {
  const parts: string[] = [];
  for (const row of rows) {
    if (row.kind === 'cable') {
      if (row.metersUsed) parts.push(`${row.metersUsed}m ${row.itemName}`);
    } else {
      const qty = row.routerUnitIds?.length || row.quantityUsed || 1;
      parts.push(`${qty} ${row.itemName}`);
    }
  }
  const tech = technicianName || rows[0]?.technicianName || 'Technician';
  return `Ticket resolved by ${tech}. Used ${parts.join(' and ') || 'equipment'}.`;
}
