import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { transferStockSchema } from '@/lib/isp/validation';
import { resolveStationId } from '@/lib/isp/station-resolve';
import { itemBelongsToStation } from '@/lib/isp/station-query';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { checkItemLowStockAfterUpdate } from '@/lib/isp/low-stock-alert';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = transferStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { fromStationId: fromParam, toStationId: toParam, itemId, quantity, reason, notes } =
      parsed.data;

    if (fromParam === toParam) {
      return NextResponse.json({ error: 'Source and destination must differ' }, { status: 400 });
    }

    const fromStationId = await resolveStationId(fromParam);
    const toStationId = await resolveStationId(toParam);

    if (!(await canAccessStation(fromParam)) || !(await canAccessStation(toParam))) {
      return NextResponse.json({ error: 'Access denied to one or both stations' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

    const sourceItem = (await itemsCol.findOne({ id: itemId })) as {
      id: string;
      stationId?: string;
      stationIds?: string[];
      itemName: string;
      itemCode: string;
      category: string;
      unitType: string;
      quantityAvailable: number;
      minimumLevel: number;
      reorderLevel?: number;
      isCable?: boolean;
      notes?: string;
    } | null;

    if (!sourceItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!itemBelongsToStation(sourceItem, fromStationId)) {
      return NextResponse.json({ error: 'Item is not available at the source station' }, { status: 400 });
    }

    if (sourceItem.stationIds && sourceItem.stationIds.length > 1 && !sourceItem.stationId) {
      return NextResponse.json(
        {
          error:
            'Shared multi-station items cannot be transferred. Create station-specific items or adjust stock manually.',
        },
        { status: 400 }
      );
    }

    if (sourceItem.quantityAvailable < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${sourceItem.quantityAvailable}` },
        { status: 400 }
      );
    }

    const sourceBefore = sourceItem.quantityAvailable;
    const sourceAfter = sourceBefore - quantity;

    await itemsCol.updateOne(
      { id: sourceItem.id },
      { $set: { quantityAvailable: sourceAfter, updatedAt: new Date() } }
    );

    const transferOutTx = {
      id: generateUUID(),
      stationId: fromStationId,
      itemId: sourceItem.id,
      transactionType: 'TRANSFER_OUT' as const,
      quantity: -quantity,
      balanceBefore: sourceBefore,
      balanceAfter: sourceAfter,
      notes: `${reason}${notes ? ` — ${notes}` : ''} → ${toStationId}`,
      createdBy: ctx.userId,
      createdAt: new Date(),
    };
    await txCol.insertOne(transferOutTx);

    checkItemLowStockAfterUpdate(sourceItem.id, sourceBefore, sourceAfter, fromStationId).catch(
      (err) => console.error('[ISP Transfer Low Stock SMS]', err)
    );

    let destItem = (await itemsCol.findOne({
      itemCode: sourceItem.itemCode,
      $or: [{ stationId: toStationId }, { stationIds: toStationId }],
    })) as { id: string; quantityAvailable: number } | null;

    let destBefore = 0;
    let destAfter = quantity;

    if (destItem) {
      destBefore = destItem.quantityAvailable;
      destAfter = destBefore + quantity;
      await itemsCol.updateOne(
        { id: destItem.id },
        { $set: { quantityAvailable: destAfter, updatedAt: new Date() } }
      );
    } else {
      const newItem = {
        id: generateUUID(),
        stationId: toStationId,
        itemName: sourceItem.itemName,
        itemCode: sourceItem.itemCode,
        category: sourceItem.category,
        unitType: sourceItem.unitType,
        quantityAvailable: quantity,
        minimumLevel: sourceItem.minimumLevel,
        reorderLevel: sourceItem.reorderLevel,
        isCable: sourceItem.isCable ?? false,
        notes: sourceItem.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await itemsCol.insertOne(newItem);
      destItem = { id: newItem.id, quantityAvailable: quantity };
    }

    const transferInTx = {
      id: generateUUID(),
      stationId: toStationId,
      itemId: destItem.id,
      transactionType: 'TRANSFER_IN' as const,
      quantity,
      balanceBefore: destBefore,
      balanceAfter: destAfter,
      notes: `${reason}${notes ? ` — ${notes}` : ''} ← ${fromStationId}`,
      createdBy: ctx.userId,
      createdAt: new Date(),
    };
    await txCol.insertOne(transferInTx);

    await createAuditLog({
      userId: ctx.userId,
      stationId: fromStationId,
      action: 'TRANSFER_STOCK',
      entityType: 'inventoryTransaction',
      entityId: transferOutTx.id,
      beforeData: { quantityAvailable: sourceBefore, toStationId },
      afterData: { quantityAvailable: sourceAfter, destQuantity: destAfter },
    });

    return NextResponse.json({
      success: true,
      sourceBalance: sourceAfter,
      destinationBalance: destAfter,
      transferOut: transferOutTx,
      transferIn: transferInTx,
    });
  } catch (error) {
    console.error('[ISP Transfer Stock]', error);
    return NextResponse.json({ error: 'Failed to transfer stock' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const usersCol = db.collection('users');

    const query: Record<string, unknown> = {
      transactionType: { $in: ['TRANSFER_IN', 'TRANSFER_OUT'] },
    };

    if (stationIdParam && stationIdParam !== 'all') {
      const stationId = await resolveStationId(stationIdParam);
      if (!(await canAccessStation(stationIdParam))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      query.stationId = stationId;
    }

    const transfers = await txCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const itemIds = [...new Set(transfers.map((t: { itemId: string }) => t.itemId))];
    const items = await itemsCol.find({ id: { $in: itemIds } }).toArray();
    const itemMap = new Map(
      items.map((i: { id: string; itemName: string }) => [i.id, i.itemName])
    );

    const userIds = [...new Set(transfers.map((t: { createdBy: string }) => t.createdBy))];
    const users = await usersCol.find({ id: { $in: userIds } }).toArray();
    const userMap = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));

    const history = transfers.map(
      (t: {
        id: string;
        stationId: string;
        itemId: string;
        transactionType: string;
        quantity: number;
        notes?: string;
        createdBy: string;
        createdAt: Date;
      }) => ({
        id: t.id,
        date: t.createdAt,
        stationId: t.stationId,
        itemId: t.itemId,
        itemName: itemMap.get(t.itemId) || t.itemId,
        quantity: Math.abs(t.quantity),
        type: t.transactionType,
        userName: userMap.get(t.createdBy) || t.createdBy,
        notes: t.notes,
      })
    );

    return NextResponse.json({ transfers: history });
  } catch (error) {
    console.error('[ISP Transfer History]', error);
    return NextResponse.json({ error: 'Failed to fetch transfer history' }, { status: 500 });
  }
}
