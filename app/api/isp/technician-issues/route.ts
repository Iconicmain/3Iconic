import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { issueItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { stationVisibilityFilter, normalizeIssuePayload } from '@/lib/isp/issue-types';
import { notifyEquipmentIssue } from '@/lib/isp/equipment-sms';
import { checkItemLowStockAfterUpdate } from '@/lib/isp/low-stock-alert';
import type { Db } from 'mongodb';

async function enrichIssueItems(
  db: Db,
  issueItems: { itemId: string; routerUnitIds?: string[]; [key: string]: unknown }[],
  itemsCol: ReturnType<Db['collection']>
) {
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
        .map((u: { id: string; serialNumber?: string; macAddress?: string; status?: string }) => ({
          id: u.id,
          serialNumber: u.serialNumber || null,
          macAddress: u.macAddress || null,
          status: u.status,
          label: u.serialNumber || u.macAddress || u.id,
        }));
      return {
        ...ii,
        itemName: invItem?.itemName,
        itemCode: invItem?.itemCode,
        serializedUnits,
      };
    })
  );
}

async function attachStationNames<T extends { stationId?: unknown; sourceStationId?: unknown; primaryStationId?: unknown; sharedStationIds?: unknown[] }>(
  db: Db,
  issues: T[]
): Promise<(T & { sourceStationName?: string; primaryStationName?: string; sharedStationNames?: string[] })[]> {
  const stationIds = new Set<string>();
  for (const i of issues) {
    if (i.stationId) stationIds.add(String(i.stationId));
    if (i.sourceStationId) stationIds.add(String(i.sourceStationId));
    if (i.primaryStationId) stationIds.add(String(i.primaryStationId));
    for (const sid of (i.sharedStationIds as string[]) || []) stationIds.add(sid);
  }
  if (stationIds.size === 0) return issues;

  const stations = await db
    .collection(ISP_STATIONS_COLLECTION)
    .find({
      $or: [
        { stationId: { $in: [...stationIds] } },
        { _id: { $in: [...stationIds].filter((id) => id.length === 24) } },
      ],
    })
    .toArray();

  const nameMap = new Map<string, string>();
  for (const s of stations as { stationId?: string; _id?: { toString(): string }; name?: string }[]) {
    if (s.stationId) nameMap.set(s.stationId, s.name || s.stationId);
    if (s._id) nameMap.set(s._id.toString(), s.name || s.stationId || s._id.toString());
  }

  return issues.map((i) => ({
    ...i,
    sourceStationName: nameMap.get(String(i.sourceStationId || i.stationId || '')),
    primaryStationName: nameMap.get(String(i.primaryStationId || i.stationId || '')),
    sharedStationNames: ((i.sharedStationIds as string[]) || []).map((id) => nameMap.get(id) || id),
  }));
}

const ISP_STATIONS_COLLECTION = 'stations';

async function attachTechnicianNames<T extends { technicianId?: unknown }>(
  db: Db,
  issues: T[]
): Promise<(T & { technicianName?: string })[]> {
  const techIds = [...new Set(issues.map((i) => String(i.technicianId || '')).filter(Boolean))];
  if (techIds.length === 0) return issues;
  const users = await db
    .collection('users')
    .find({ id: { $in: techIds } }, { projection: { id: 1, name: 1 } })
    .toArray();
  const nameMap = new Map(users.map((u: { id: string; name?: string }) => [u.id, u.name]));
  return issues.map((i) => ({
    ...i,
    technicianName: nameMap.get(String(i.technicianId || '')) || undefined,
  }));
}

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

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
    const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);

    if (stationIdParam === 'all') {
      if (!ctx.canAccessAllStations) {
        return NextResponse.json({ error: 'All-stations view requires elevated access' }, { status: 403 });
      }
      const query: Record<string, unknown> = {};
      if (technicianId) query.technicianId = technicianId;
      if (status) query.status = status;
      if (date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        query.issueDate = { $gte: d, $lt: next };
      }
      const issues = await issuesCol.find(query).sort({ issueDate: -1, createdAt: -1 }).limit(200).toArray();
      const issuesWithItems = await Promise.all(
        issues.map(async (issue: { id: string; [key: string]: unknown }) => {
          const issueItems = await issueItemsCol.find({ technicianIssueId: issue.id }).toArray();
          const itemsWithDetails = await enrichIssueItems(db, issueItems as { itemId: string; routerUnitIds?: string[] }[], itemsCol);
          return { ...issue, items: itemsWithDetails };
        })
      );
      const enriched = await attachTechnicianNames(db, issuesWithItems);
      const withStations = await attachStationNames(db, enriched);
      return NextResponse.json({ issues: withStations }, { headers: NO_CACHE_HEADERS });
    }

    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

    const query: Record<string, unknown> = stationVisibilityFilter(stationId);
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
        const itemsWithDetails = await enrichIssueItems(db, items as { itemId: string; routerUnitIds?: string[] }[], itemsCol);
        return { ...issue, items: itemsWithDetails };
      })
    );

    const enrichedIssues = await attachTechnicianNames(db, issuesWithItems);
    const withStations = await attachStationNames(db, enrichedIssues);
    return NextResponse.json({ issues: withStations }, { headers: NO_CACHE_HEADERS });
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
    const uiStationId = body.stationId || body.sourceStationId;
    if (!uiStationId || !(await canAccessStation(uiStationId))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const parsed = issueItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const meta = normalizeIssuePayload({ ...body, stationId: uiStationId });
    if (!meta.sourceStationId || !(await canAccessStation(meta.sourceStationId))) {
      return NextResponse.json({ error: 'Access denied to source station' }, { status: 403 });
    }
    if (meta.issueType === 'SHARED_STATIONS' && meta.sharedStationIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one station to share with' }, { status: 400 });
    }
    for (const sid of meta.sharedStationIds) {
      if (!(await canAccessStation(sid))) {
        return NextResponse.json({ error: `Access denied to shared station ${sid}` }, { status: 403 });
      }
    }

    const expectedReturnDate = parsed.data.expectedReturnDate
      ? new Date(parsed.data.expectedReturnDate)
      : null;

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const issuesCol = db.collection(ISP_COLLECTIONS.technicianIssues);
    const issueItemsCol = db.collection(ISP_COLLECTIONS.technicianIssueItems);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);
    const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

    for (const it of parsed.data.items) {
      const item = await itemsCol.findOne({ id: it.itemId });
      if (!item) {
        return NextResponse.json({ error: `Item ${it.itemId} not found` }, { status: 404 });
      }
      if (it.routerUnitIds?.length) {
        if (it.routerUnitIds.length !== it.quantityTaken) {
          return NextResponse.json({
            error: `Quantity (${it.quantityTaken}) must match selected units (${it.routerUnitIds.length}) for ${item.itemName}`,
          }, { status: 400 });
        }
        const units = await routersCol.find({ id: { $in: it.routerUnitIds } }).toArray();
        if (units.length !== it.routerUnitIds.length) {
          return NextResponse.json({ error: 'One or more selected units not found' }, { status: 400 });
        }
        for (const u of units as { id: string; itemName: string; status: string; stationIds?: string[] }[]) {
          if (u.status !== 'available') {
            return NextResponse.json({ error: `Unit ${u.id} is not available` }, { status: 400 });
          }
          if (u.itemName !== item.itemName) {
            return NextResponse.json({ error: `Unit does not match item ${item.itemName}` }, { status: 400 });
          }
        }
      } else if (item.quantityAvailable < it.quantityTaken) {
        return NextResponse.json({
          error: `Insufficient stock for ${item.itemName}. Available: ${item.quantityAvailable}`,
        }, { status: 400 });
      }
    }

    const issueDate = new Date();
    const jobRef = parsed.data.projectCustomer || parsed.data.jobReference || null;
    const issue = {
      id: generateUUID(),
      stationId: meta.sourceStationId,
      sourceStationId: meta.sourceStationId,
      primaryStationId: meta.primaryStationId,
      issueType: meta.issueType,
      sharedStationIds: meta.sharedStationIds,
      projectCustomer: meta.projectCustomer,
      expectedReturnDate,
      technicianId: parsed.data.technicianId,
      issueDate,
      jobReference: jobRef,
      status: 'OPEN' as const,
      approvedBy: ctx.userId,
      notes: parsed.data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await issuesCol.insertOne(issue);

    const deductStationId = meta.sourceStationId;

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
        routerUnitIds: it.routerUnitIds || [],
        timeOut: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await issueItemsCol.insertOne(issueItem);

      if (it.routerUnitIds?.length) {
        await routersCol.updateMany(
          { id: { $in: it.routerUnitIds } },
          {
            $set: {
              status: 'issued',
              technicianId: parsed.data.technicianId,
              jobReference: jobRef,
              issueItemId: issueItem.id,
              updatedAt: new Date(),
            },
          }
        );
      }

      await txCol.insertOne({
        id: generateUUID(),
        stationId: deductStationId,
        itemId: it.itemId,
        transactionType: 'ISSUE',
        quantity: -it.quantityTaken,
        balanceBefore,
        balanceAfter,
        technicianId: parsed.data.technicianId,
        jobReference: jobRef,
        approvedBy: ctx.userId,
        notes: parsed.data.notes || null,
        createdBy: ctx.userId,
        createdAt: new Date(),
      });

      checkItemLowStockAfterUpdate(it.itemId, balanceBefore, balanceAfter, deductStationId).catch(
        (err) => console.error('[ISP Issue Low Stock SMS]', err)
      );
    }

    const auditAction =
      meta.issueType === 'SHARED_STATIONS' ? 'SHARED_ISSUE' : meta.issueType === 'PROJECT' ? 'PROJECT_ISSUE' : 'ISSUE';

    await createAuditLog({
      userId: ctx.userId,
      stationId: deductStationId,
      action: auditAction,
      entityType: 'technicianIssue',
      entityId: issue.id,
      afterData: issue,
    });

    const fullIssue = await issuesCol.findOne({ id: issue.id });
    const items = await issueItemsCol.find({ technicianIssueId: issue.id }).toArray();
    const itemsWithDetails = await enrichIssueItems(db, items as { itemId: string; routerUnitIds?: string[] }[], itemsCol);

    const itemsSummary = itemsWithDetails
      .map((i: { quantityTaken?: number; unitType?: string; itemName?: string; itemId?: string; serializedUnits?: { label?: string }[] }) => {
        const qty = i.quantityTaken ?? 0;
        const unit = i.unitType || 'pcs';
        const name = i.itemName || i.itemId || 'Item';
        const unitLabels =
          i.serializedUnits?.length
            ? ` [${i.serializedUnits.map((u) => u.label).filter(Boolean).join(', ')}]`
            : '';
        return `${qty} ${unit} ${name}${unitLabels}`;
      })
      .join('; ');

    try {
      await notifyEquipmentIssue({
        technicianId: parsed.data.technicianId,
        stationId: deductStationId,
        itemsSummary,
        issuedByUserId: ctx.userId,
        jobReference: jobRef,
        notes: parsed.data.notes || null,
      });
    } catch (err) {
      console.error('[ISP Issue SMS]', err);
    }

    return NextResponse.json({ issue: { ...fullIssue, items: itemsWithDetails } }, { status: 201 });
  } catch (error) {
    console.error('[ISP Technician Issues POST]', error);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}
