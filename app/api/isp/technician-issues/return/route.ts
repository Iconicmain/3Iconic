import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { returnItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { allowedReturnStationIds } from '@/lib/isp/issue-types';
import { notifyEquipmentReturn } from '@/lib/isp/equipment-sms';

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

    const returnCount = parsed.data.routerUnitIds?.length || parsed.data.quantityReturned;
    const outstanding = issueItem.quantityTaken - issueItem.quantityReturned;

    if (returnCount > outstanding) {
      return NextResponse.json({ error: 'Cannot return more than was taken' }, { status: 400 });
    }

    if (parsed.data.routerUnitIds?.length) {
      const issuedIds: string[] = issueItem.routerUnitIds || [];
      for (const uid of parsed.data.routerUnitIds) {
        if (!issuedIds.includes(uid)) {
          return NextResponse.json({ error: 'Unit was not part of this issue' }, { status: 400 });
        }
      }
      const units = await routersCol.find({ id: { $in: parsed.data.routerUnitIds } }).toArray();
      for (const u of units as { status: string }[]) {
        if (u.status !== 'issued') {
          return NextResponse.json({ error: 'Unit is not currently issued out' }, { status: 400 });
        }
      }
    }

    const allowedStations = allowedReturnStationIds(issue as Parameters<typeof allowedReturnStationIds>[0]);
    const defaultReturnStation = issue.sourceStationId || issue.stationId;
    const returnStationId = parsed.data.returnStationId || defaultReturnStation;

    if (!allowedStations.includes(returnStationId)) {
      return NextResponse.json({ error: 'Invalid return station for this issue' }, { status: 400 });
    }
    if (!(await canAccessStation(returnStationId))) {
      return NextResponse.json({ error: 'Access denied to return station' }, { status: 403 });
    }

    const qtyReturned = parsed.data.routerUnitIds?.length || parsed.data.quantityReturned;
    const newReturned = issueItem.quantityReturned + qtyReturned;
    const newUsed = issueItem.quantityTaken - newReturned;
    const condition = parsed.data.returnCondition || 'Good';
    const isDamagedOrLost = condition === 'Damaged' || condition === 'Lost' || condition === 'Repair';

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

    if (parsed.data.routerUnitIds?.length) {
      await routersCol.updateMany(
        { id: { $in: parsed.data.routerUnitIds } },
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

    const item = await itemsCol.findOne({ id: issueItem.itemId });
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
        notes: parsed.data.notes || (returnStationId !== defaultReturnStation ? `Returned to alternate station` : undefined),
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

    const status = newReturned >= issueItem.quantityTaken ? 'CLOSED' : 'PARTIAL_RETURN';
    const allItems = await issueItemsCol.find({ technicianIssueId: issue.id }).toArray();
    const allClosed = allItems.every(
      (i: { quantityReturned: number; quantityTaken: number }) => i.quantityReturned >= i.quantityTaken
    );
    const finalStatus = allClosed ? 'CLOSED' : status;

    await issuesCol.updateOne(
      { id: issue.id },
      { $set: { status: finalStatus, updatedAt: new Date() } }
    );

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
        routerUnitIds: parsed.data.routerUnitIds,
        returnStationId,
        returnCondition: condition,
        issueType: issue.issueType,
        sharedStationIds: issue.sharedStationIds,
      },
    });

    const updated = await issueItemsCol.findOne({ id: parsed.data.issueItemId });

    const itemDoc = item as { itemName?: string } | null;
    const itemsSummary = itemDoc?.itemName || issueItem.itemId;
    notifyEquipmentReturn({
      technicianId: String(issue.technicianId),
      stationId: returnStationId,
      itemsSummary,
      quantityReturned: qtyReturned,
      unitType: issueItem.unitType,
      returnCondition: condition,
      processedByUserId: ctx.userId,
      notes: parsed.data.notes || null,
    }).catch((err) => console.error('[ISP Return SMS]', err));

    return NextResponse.json({ success: true, issueItem: updated, status: finalStatus, returnStationId });
  } catch (error) {
    console.error('[ISP Return]', error);
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 });
  }
}
