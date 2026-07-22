import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { returnItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { allowedReturnStationIds } from '@/lib/isp/issue-types';
import { notifyEquipmentReturn, notifyRouterReplacementPending } from '@/lib/isp/equipment-sms';
import {
  createRouterReplacementReturn,
  processRouterReplacementReturn,
} from '@/lib/isp/router-replacement-service';

async function countUnitsStillIssued(
  routersCol: { find: (q: object) => { toArray: () => Promise<unknown[]> } },
  routerUnitIds: string[]
): Promise<number> {
  if (!routerUnitIds.length) return 0;
  const units = (await routersCol.find({ id: { $in: routerUnitIds } }).toArray()) as { status: string }[];
  return units.filter((u) => u.status === 'issued').length;
}

async function refreshIssueStatusFromUnits(
  db: {
    collection: (name: string) => {
      find: (q: object) => { toArray: () => Promise<unknown[]> };
      updateOne: (q: object, u: object) => Promise<unknown>;
    };
  },
  issueId: string
) {
  const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
  const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
  const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

  const allItems = (await issueItemsCol.find({ technicianIssueId: issueId }).toArray()) as {
    quantityReturned: number;
    quantityTaken: number;
    routerUnitIds?: string[];
  }[];

  let allClosed = true;
  for (const item of allItems) {
    if (item.routerUnitIds?.length) {
      const stillIssued = await countUnitsStillIssued(routersCol, item.routerUnitIds);
      if (stillIssued > 0) allClosed = false;
    } else if (item.quantityReturned < item.quantityTaken) {
      allClosed = false;
    }
  }

  await issuesCol.updateOne(
    { id: issueId },
    { $set: { status: allClosed ? 'CLOSED' : 'PARTIAL_RETURN', updatedAt: new Date() } }
  );
  return allClosed ? 'CLOSED' : 'PARTIAL_RETURN';
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = returnItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
    const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);
    const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

    const issueItem = await issueItemsCol.findOne({ id: parsed.data.issueItemId });
    if (!issueItem) {
      return NextResponse.json({ error: 'Issue item not found' }, { status: 404 });
    }

    const issue = await issuesCol.findOne({ id: issueItem.technicianIssueId });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const accessStation = issue.sourceStationId || issue.stationId;
    if (!(await canAccessStation(accessStation))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const disposition = parsed.data.disposition || 'returned';
    const defaultReturnStation = issue.sourceStationId || issue.stationId;
    const returnStationId = parsed.data.returnStationId || defaultReturnStation;
    const allowedStations = allowedReturnStationIds(issue as Parameters<typeof allowedReturnStationIds>[0]);

    if (!allowedStations.includes(returnStationId)) {
      return NextResponse.json({ error: 'Invalid return station for this issue' }, { status: 400 });
    }
    if (!(await canAccessStation(returnStationId))) {
      return NextResponse.json({ error: 'Access denied to return station' }, { status: 403 });
    }

    const unitIds = parsed.data.routerUnitIds || [];
    const qty = unitIds.length || parsed.data.quantityReturned || 0;

    if (unitIds.length) {
      const issuedIds: string[] = issueItem.routerUnitIds || [];
      for (const uid of unitIds) {
        if (!issuedIds.includes(uid)) {
          return NextResponse.json({ error: 'Unit was not part of this issue' }, { status: 400 });
        }
      }
      const units = await routersCol.find({ id: { $in: unitIds } }).toArray();
      for (const u of units as { status: string }[]) {
        if (u.status !== 'issued') {
          return NextResponse.json({ error: 'Unit is not currently issued out' }, { status: 400 });
        }
      }
    }

    const stillIssuedBefore = issueItem.routerUnitIds?.length
      ? await countUnitsStillIssued(routersCol, issueItem.routerUnitIds)
      : issueItem.quantityTaken - issueItem.quantityReturned;

    if (qty > stillIssuedBefore) {
      return NextResponse.json({ error: 'Cannot process more units than still outstanding' }, { status: 400 });
    }

    const jobRef = parsed.data.jobReference || issue.jobReference || null;
    const item = await itemsCol.findOne({ id: issueItem.itemId });
    const itemName = (item as { itemName?: string } | null)?.itemName || issueItem.itemId;

    // ── Installed at client ──
    if (disposition === 'installed') {
      if (unitIds.length) {
        await routersCol.updateMany(
          { id: { $in: unitIds } },
          {
            $set: {
              status: 'installed',
              technicianId: null,
              jobReference: jobRef,
              issueItemId: null,
              ticketId: jobRef,
              updatedAt: new Date(),
            },
          }
        );
      }

      await issueItemsCol.updateOne(
        { id: parsed.data.issueItemId },
        {
          $set: {
            returnCondition: 'Installed',
            returnTime: new Date(),
            updatedAt: new Date(),
            notes: parsed.data.notes || issueItem.notes,
          },
        }
      );

      await createAuditLog({
        userId: ctx.userId,
        stationId: returnStationId,
        action: 'INSTALLED',
        entityType: 'technicianIssueItem',
        entityId: parsed.data.issueItemId,
        afterData: { routerUnitIds: unitIds, jobReference: jobRef, disposition },
      });

      const finalStatus = await refreshIssueStatusFromUnits(db, issue.id);
      const updated = await issueItemsCol.findOne({ id: parsed.data.issueItemId });

      return NextResponse.json({
        success: true,
        issueItem: updated,
        status: finalStatus,
        disposition: 'installed',
      });
    }

    // ── Router replacement (new installed, old tracked) ──
    if (disposition === 'replaced') {
      const newUnit = unitIds.length ? await routersCol.findOne({ id: unitIds[0] }) : null;
      const newLabel =
        (newUnit as { serialNumber?: string; macAddress?: string } | null)?.serialNumber ||
        (newUnit as { macAddress?: string } | null)?.macAddress ||
        'new router';
      const oldLabel = parsed.data.oldRouterSerial?.trim() || parsed.data.oldRouterMac?.trim() || 'old router';

      if (unitIds.length) {
        await routersCol.updateMany(
          { id: { $in: unitIds } },
          {
            $set: {
              status: 'installed',
              technicianId: null,
              jobReference: jobRef,
              issueItemId: null,
              ticketId: jobRef,
              updatedAt: new Date(),
            },
          }
        );
      }

      await issueItemsCol.updateOne(
        { id: parsed.data.issueItemId },
        {
          $set: {
            returnCondition: 'Replaced',
            returnTime: new Date(),
            updatedAt: new Date(),
            notes: parsed.data.notes || issueItem.notes,
          },
        }
      );

      const replacement = await createRouterReplacementReturn(db, {
        stationId: returnStationId,
        technicianId: String(issue.technicianId),
        technicianName: (issue as { technicianName?: string }).technicianName,
        ticketId: jobRef,
        jobReference: jobRef,
        issueItemId: parsed.data.issueItemId,
        sourceIssueId: issue.id,
        itemId: issueItem.itemId,
        itemName,
        newRouterUnitId: unitIds[0],
        newRouterSerial: (newUnit as { serialNumber?: string } | null)?.serialNumber,
        newRouterMac: (newUnit as { macAddress?: string } | null)?.macAddress,
        oldRouterSerial: parsed.data.oldRouterSerial,
        oldRouterMac: parsed.data.oldRouterMac,
        notes: parsed.data.notes || null,
      });

      if (parsed.data.oldRouterStatus === 'returned_now') {
        await processRouterReplacementReturn(db, {
          replacementId: replacement.id,
          returnCondition: parsed.data.oldRouterReturnCondition || 'Good',
          returnStationId,
          oldRouterSerial: parsed.data.oldRouterSerial,
          oldRouterMac: parsed.data.oldRouterMac,
          notes: parsed.data.notes,
          userId: ctx.userId,
        });
      } else if (parsed.data.oldRouterStatus === 'lost') {
        await processRouterReplacementReturn(db, {
          replacementId: replacement.id,
          returnCondition: 'Lost',
          returnStationId,
          markLost: true,
          userId: ctx.userId,
        });
      } else {
        try {
          await notifyRouterReplacementPending({
            technicianId: String(issue.technicianId),
            stationId: returnStationId,
            newRouterLabel: newLabel,
            oldRouterLabel: oldLabel,
            ticketId: jobRef,
          });
        } catch (err) {
          console.error('[Replacement SMS]', err);
        }
      }

      await createAuditLog({
        userId: ctx.userId,
        stationId: returnStationId,
        action: 'ROUTER_REPLACED',
        entityType: 'technicianIssueItem',
        entityId: parsed.data.issueItemId,
        afterData: {
          routerUnitIds: unitIds,
          oldRouterSerial: parsed.data.oldRouterSerial,
          oldRouterMac: parsed.data.oldRouterMac,
          oldRouterStatus: parsed.data.oldRouterStatus,
          replacementId: replacement.id,
        },
      });

      const finalStatus = await refreshIssueStatusFromUnits(db, issue.id);
      const updated = await issueItemsCol.findOne({ id: parsed.data.issueItemId });

      return NextResponse.json({
        success: true,
        issueItem: updated,
        status: finalStatus,
        disposition: 'replaced',
        replacementId: replacement.id,
      });
    }

    // ── Standard return to stock ──
    const condition = parsed.data.returnCondition || 'Good';
    const isDamagedOrLost = condition === 'Damaged' || condition === 'Lost' || condition === 'Repair';
    const qtyReturned = qty;
    const newReturned = issueItem.quantityReturned + qtyReturned;
    const newUsed = issueItem.quantityTaken - newReturned;

    await issueItemsCol.updateOne(
      { id: parsed.data.issueItemId },
      {
        $set: {
          quantityReturned: newReturned,
          quantityUsed: newUsed,
          returnCondition: condition,
          returnTime: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (unitIds.length) {
      await routersCol.updateMany(
        { id: { $in: unitIds } },
        {
          $set: {
            status: isDamagedOrLost ? 'damaged' : 'available',
            technicianId: null,
            jobReference: null,
            issueItemId: null,
            updatedAt: new Date(),
          },
        }
      );
    }

    if (item && !isDamagedOrLost && qtyReturned > 0) {
      const balanceBefore = item.quantityAvailable;
      const balanceAfter = balanceBefore + qtyReturned;
      await itemsCol.updateOne(
        { id: issueItem.itemId },
        { $set: { quantityAvailable: balanceAfter, updatedAt: new Date() } }
      );

      await txCol.insertOne({
        id: generateUUID(),
        stationId: returnStationId,
        itemId: issueItem.itemId,
        transactionType: 'RETURN',
        quantity: qtyReturned,
        balanceBefore,
        balanceAfter,
        technicianId: issue.technicianId,
        jobReference: issue.jobReference || null,
        approvedBy: ctx.userId,
        notes: parsed.data.notes || (returnStationId !== defaultReturnStation ? 'Returned to alternate station' : undefined),
        createdBy: ctx.userId,
        createdAt: new Date(),
      });
    } else if (item && isDamagedOrLost) {
      await txCol.insertOne({
        id: generateUUID(),
        stationId: defaultReturnStation,
        itemId: issueItem.itemId,
        transactionType: 'DAMAGE',
        quantity: qtyReturned,
        balanceBefore: item.quantityAvailable,
        balanceAfter: item.quantityAvailable,
        technicianId: issue.technicianId,
        jobReference: issue.jobReference || null,
        approvedBy: ctx.userId,
        notes: parsed.data.notes || condition,
        createdBy: ctx.userId,
        createdAt: new Date(),
      });
    }

    const finalStatus = issueItem.routerUnitIds?.length
      ? await refreshIssueStatusFromUnits(db, issue.id)
      : await (async () => {
          const allClosed = newReturned >= issueItem.quantityTaken;
          await issuesCol.updateOne(
            { id: issue.id },
            { $set: { status: allClosed ? 'CLOSED' : 'PARTIAL_RETURN', updatedAt: new Date() } }
          );
          return allClosed ? 'CLOSED' : 'PARTIAL_RETURN';
        })();

    const isShared = issue.issueType === 'SHARED_STATIONS';
    const auditAction = isShared
      ? condition === 'Partial' || newReturned < issueItem.quantityTaken
        ? 'SHARED_PARTIAL_RETURN'
        : isDamagedOrLost
          ? 'SHARED_DAMAGED'
          : 'SHARED_RETURN'
      : 'RETURN';

    await createAuditLog({
      userId: ctx.userId,
      stationId: returnStationId,
      action: auditAction,
      entityType: 'technicianIssueItem',
      entityId: parsed.data.issueItemId,
      afterData: {
        quantityReturned: newReturned,
        quantityUsed: newUsed,
        routerUnitIds: unitIds,
        returnStationId,
        returnCondition: condition,
        disposition: 'returned',
      },
    });

    const updated = await issueItemsCol.findOne({ id: parsed.data.issueItemId });

    try {
      await notifyEquipmentReturn({
        technicianId: String(issue.technicianId),
        stationId: returnStationId,
        itemsSummary: itemName,
        quantityReturned: qtyReturned,
        unitType: issueItem.unitType,
        returnCondition: condition,
        processedByUserId: ctx.userId,
        notes: parsed.data.notes || null,
      });
    } catch (err) {
      console.error('[ISP Return SMS]', err);
    }

    return NextResponse.json({ success: true, issueItem: updated, status: finalStatus, returnStationId });
  } catch (error) {
    console.error('[ISP Return]', error);
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 });
  }
}
