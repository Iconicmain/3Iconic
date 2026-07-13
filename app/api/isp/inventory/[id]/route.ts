import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { canAccessStation, getIspUserContext } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { updateInventoryItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

async function getItemWithAccess(id: string) {
  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const item = await db.collection(ISP_COLLECTIONS.inventoryItems).findOne({ id });

  if (!item) return { error: 'Item not found', status: 404 as const };

  const itemStations =
    (item as { stationIds?: string[]; stationId?: string }).stationIds ||
    ((item as { stationId?: string }).stationId
      ? [(item as { stationId: string }).stationId]
      : []);

  if (itemStations.length === 0) {
    return { error: 'Item has no station assignment', status: 400 as const };
  }

  const hasAccess = (
    await Promise.all(itemStations.map((stationId) => canAccessStation(stationId)))
  ).some(Boolean);

  if (!hasAccess) {
    return { error: 'Access denied', status: 403 as const };
  }

  return { item, itemStations, db };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getItemWithAccess(id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { item, db } = result;
    const transactions = await db
      .collection(ISP_COLLECTIONS.inventoryTransactions)
      .find({ itemId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ item, transactions }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Inventory History]', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateInventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const result = await getItemWithAccess(id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { item, itemStations, db } = result;
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const beforeData = { ...item };
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.itemName !== undefined) {
      updates.itemName = parsed.data.itemName.trim();
    }
    if (parsed.data.itemCode !== undefined) {
      updates.itemCode = parsed.data.itemCode.trim().toUpperCase();
    }
    if (parsed.data.category !== undefined) {
      const category = parsed.data.category.trim();
      updates.category = category;
      updates.isCable = category.toLowerCase().includes('cable');
    }
    if (parsed.data.minimumLevel !== undefined) {
      updates.minimumLevel = parsed.data.minimumLevel;
    }
    if (parsed.data.reorderLevel !== undefined) {
      updates.reorderLevel = parsed.data.reorderLevel;
    }
    if (parsed.data.notes !== undefined) {
      updates.notes = parsed.data.notes?.trim() || null;
    }

    await itemsCol.updateOne({ id }, { $set: updates });
    const updatedItem = await itemsCol.findOne({ id });

    await createAuditLog({
      userId: ctx.userId,
      stationId: itemStations[0],
      action: 'UPDATE',
      entityType: 'inventoryItem',
      entityId: id,
      beforeData,
      afterData: updatedItem,
    });

    return NextResponse.json({ success: true, item: updatedItem }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Inventory PATCH]', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}
