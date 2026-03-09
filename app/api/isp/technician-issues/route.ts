import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { issueItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');
    const technicianId = searchParams.get('technicianId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
    const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

    const query: Record<string, unknown> = { stationId };
    if (technicianId) query.technicianId = technicianId;
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      query.issueDate = { $gte: d, $lt: next };
    }

    const issues = await issuesCol.find(query).sort({ issueDate: -1, createdAt: -1 }).toArray();

    const issuesWithItems = await Promise.all(
      issues.map(async (issue: { id: string; [key: string]: unknown }) => {
        const items = await issueItemsCol.find({ technicianIssueId: issue.id }).toArray();
        const itemsWithDetails = await Promise.all(
          items.map(async (ii: { itemId: string; [key: string]: unknown }) => {
            const invItem = await itemsCol.findOne({ id: ii.itemId });
            return { ...ii, itemName: invItem?.itemName, itemCode: invItem?.itemCode };
          })
        );
        return { ...issue, items: itemsWithDetails };
      })
    );

    return NextResponse.json({ issues: issuesWithItems }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Technician Issues GET]', error);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const stationId = body.stationId;
    if (!stationId || !(await canAccessStation(stationId))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const parsed = issueItemSchema.safeParse({
      technicianId: body.technicianId,
      jobReference: body.jobReference,
      items: body.items,
      notes: body.notes,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
    const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

    for (const it of parsed.data.items) {
      const item = await itemsCol.findOne({ id: it.itemId });
      if (!item) {
        return NextResponse.json({ error: `Item ${it.itemId} not found` }, { status: 404 });
      }
      if (item.quantityAvailable < it.quantityTaken) {
        return NextResponse.json({
          error: `Insufficient stock for ${item.itemName}. Available: ${item.quantityAvailable}`,
        }, { status: 400 });
      }
    }

    const issueDate = new Date();
    const issue = {
      id: generateUUID(),
      stationId,
      technicianId: parsed.data.technicianId,
      issueDate,
      jobReference: parsed.data.jobReference || null,
      status: 'OPEN' as const,
      approvedBy: ctx.userId,
      notes: parsed.data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await issuesCol.insertOne(issue);

    for (const it of parsed.data.items) {
      const item = await itemsCol.findOne({ id: it.itemId });
      const balanceBefore = item.quantityAvailable;
      const balanceAfter = balanceBefore - it.quantityTaken;

      await itemsCol.updateOne(
        { id: it.itemId },
        { $set: { quantityAvailable: balanceAfter, updatedAt: new Date() } }
      );

      const issueItem = {
        id: generateUUID(),
        technicianIssueId: issue.id,
        itemId: it.itemId,
        quantityTaken: it.quantityTaken,
        quantityReturned: 0,
        quantityUsed: it.quantityTaken,
        unitType: it.unitType,
        timeOut: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await issueItemsCol.insertOne(issueItem);

      await txCol.insertOne({
        id: generateUUID(),
        stationId,
        itemId: it.itemId,
        transactionType: 'ISSUE',
        quantity: -it.quantityTaken,
        balanceBefore,
        balanceAfter,
        technicianId: parsed.data.technicianId,
        jobReference: parsed.data.jobReference || null,
        approvedBy: ctx.userId,
        notes: parsed.data.notes || null,
        createdBy: ctx.userId,
        createdAt: new Date(),
      });
    }

    await createAuditLog({
      userId: ctx.userId,
      stationId,
      action: 'ISSUE',
      entityType: 'technicianIssue',
      entityId: issue.id,
      afterData: issue,
    });

    const fullIssue = await issuesCol.findOne({ id: issue.id });
    const items = await issueItemsCol.find({ technicianIssueId: issue.id }).toArray();
    const itemsWithDetails = await Promise.all(
      items.map(async (ii: { itemId: string }) => {
        const invItem = await itemsCol.findOne({ id: ii.itemId });
        return { ...ii, itemName: invItem?.itemName, itemCode: invItem?.itemCode };
      })
    );

    return NextResponse.json({ issue: { ...fullIssue, items: itemsWithDetails } }, { status: 201 });
  } catch (error) {
    console.error('[ISP Technician Issues POST]', error);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}
