import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { returnItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

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

    const issueItem = await issueItemsCol.findOne({ id: parsed.data.issueItemId });
    if (!issueItem) {
      return NextResponse.json({ error: 'Issue item not found' }, { status: 404 });
    }

    const issue = await issuesCol.findOne({ id: issueItem.technicianIssueId });
    if (!issue || !(await canAccessStation(issue.stationId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (parsed.data.quantityReturned > issueItem.quantityTaken) {
      return NextResponse.json({ error: 'Cannot return more than was taken' }, { status: 400 });
    }

    const newReturned = issueItem.quantityReturned + parsed.data.quantityReturned;
    const newUsed = issueItem.quantityTaken - newReturned;

    await issueItemsCol.updateOne(
      { id: parsed.data.issueItemId },
      {
        $set: {
          quantityReturned: newReturned,
          quantityUsed: newUsed,
          returnCondition: parsed.data.returnCondition || null,
          returnTime: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const item = await itemsCol.findOne({ id: issueItem.itemId });
    if (item) {
      const balanceBefore = item.quantityAvailable;
      const balanceAfter = balanceBefore + parsed.data.quantityReturned;
      await itemsCol.updateOne(
        { id: issueItem.itemId },
        { $set: { quantityAvailable: balanceAfter, updatedAt: new Date() } }
      );

      await txCol.insertOne({
        id: generateUUID(),
        stationId: issue.stationId,
        itemId: issueItem.itemId,
        transactionType: 'RETURN',
        quantity: parsed.data.quantityReturned,
        balanceBefore,
        balanceAfter,
        technicianId: issue.technicianId,
        jobReference: issue.jobReference || null,
        approvedBy: ctx.userId,
        notes: parsed.data.notes || null,
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

    await createAuditLog({
      userId: ctx.userId,
      stationId: issue.stationId,
      action: 'RETURN',
      entityType: 'technicianIssueItem',
      entityId: parsed.data.issueItemId,
      afterData: { quantityReturned: newReturned, quantityUsed: newUsed },
    });

    const updated = await issueItemsCol.findOne({ id: parsed.data.issueItemId });
    return NextResponse.json({ success: true, issueItem: updated, status: finalStatus });
  } catch (error) {
    console.error('[ISP Return]', error);
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 });
  }
}
