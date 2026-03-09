import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';
import { createAuditLog } from '@/lib/isp/audit';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { inventoryItemSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB, CABLE_CATEGORY } from '@/lib/isp/models';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const cableOnly = searchParams.get('cableOnly') === 'true';

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);

    // Support both single stationId and multi-station stationIds
    const query: Record<string, unknown> = {
      $or: [
        { stationId },
        { stationIds: stationId },
      ],
    };
    if (category) query.category = category;
    if (cableOnly) query.isCable = true;
    if (lowStockOnly) {
      const items = await itemsCol.find({ $or: [{ stationId }, { stationIds: stationId }], ...(category ? { category } : {}), ...(cableOnly ? { isCable: true } : {}) }).toArray();
      const filtered = items.filter((i: { quantityAvailable: number; minimumLevel: number }) => i.quantityAvailable <= i.minimumLevel);
      return NextResponse.json({ items: filtered }, { headers: NO_CACHE_HEADERS });
    }

    const items = await itemsCol.find({ $or: [{ stationId }, { stationIds: stationId }], ...(category ? { category } : {}), ...(cableOnly ? { isCable: true } : {}) }).sort({ category: 1, itemName: 1 }).toArray();
    return NextResponse.json({ items }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Inventory GET]', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const stationIds = Array.isArray(body.stationIds) ? body.stationIds : (body.stationId ? [body.stationId] : []);
    if (stationIds.length === 0) {
      return NextResponse.json({ error: 'stationId or stationIds required' }, { status: 400 });
    }
    for (const sid of stationIds) {
      if (!(await canAccessStation(sid))) {
        return NextResponse.json({ error: `Access denied to station ${sid}` }, { status: 403 });
      }
    }

    const { stationId: _, stationIds: __, ...rest } = body;
    const parsed = inventoryItemSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);

    const isCable = parsed.data.category?.toLowerCase().includes('cable') ?? false;
    const item = {
      id: generateUUID(),
      stationIds,
      itemName: parsed.data.itemName.trim(),
      itemCode: parsed.data.itemCode.trim().toUpperCase(),
      category: parsed.data.category.trim(),
      unitType: parsed.data.unitType,
      quantityAvailable: parsed.data.quantityAvailable,
      minimumLevel: parsed.data.minimumLevel,
      reorderLevel: parsed.data.reorderLevel ?? parsed.data.minimumLevel,
      isCable,
      notes: parsed.data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await itemsCol.insertOne(item);
    await createAuditLog({
      userId: ctx.userId,
      stationId: stationIds[0],
      action: 'CREATE',
      entityType: 'inventoryItem',
      entityId: item.id,
      afterData: item,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[ISP Inventory POST]', error);
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}
