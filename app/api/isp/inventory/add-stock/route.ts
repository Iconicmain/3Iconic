import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { addStockSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

    const item = await itemsCol.findOne({ id: parsed.data.itemId }) as { stationId?: string; stationIds?: string[] } | null;
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const itemStations = item.stationIds || (item.stationId ? [item.stationId] : []);
    const hasAccess = itemStations.length > 0 && (await Promise.all(itemStations.map(canAccessStation))).some(Boolean);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this item' }, { status: 403 });
    }

    const qty = parsed.data.quantity;
    const balanceBefore = item.quantityAvailable;
    const balanceAfter = balanceBefore + qty;

    await itemsCol.updateOne(
      { id: parsed.data.itemId },
      { $set: { quantityAvailable: balanceAfter, updatedAt: new Date() } }
    );

    const tx = {
      id: generateUUID(),
      stationId: itemStations[0],
      itemId: item.id,
      transactionType: 'ADD',
      quantity: qty,
      balanceBefore,
      balanceAfter,
      notes: parsed.data.notes || null,
      createdBy: ctx.userId,
      createdAt: new Date(),
    };
    await txCol.insertOne(tx);

    await createAuditLog({
      userId: ctx.userId,
      stationId: itemStations[0],
      action: 'ADD_STOCK',
      entityType: 'inventoryTransaction',
      entityId: tx.id,
      beforeData: { quantityAvailable: balanceBefore },
      afterData: { quantityAvailable: balanceAfter },
    });

    return NextResponse.json({ success: true, balanceAfter, transaction: tx });
  } catch (error) {
    console.error('[ISP Add Stock]', error);
    return NextResponse.json({ error: 'Failed to add stock' }, { status: 500 });
  }
}
