import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { resolveStationId } from '@/lib/isp/station-resolve';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addCableRollsSchema = z.object({
  stationId: z.string().min(1),
  itemName: z.string().min(1),
  itemCode: z.string().optional(),
  category: z.string().default('Drop Cable'),
  rollCount: z.number().int().min(1).max(50),
  metersPerRoll: z.number().min(0.01),
  rollIdPrefix: z.string().min(1),
  minimumLevel: z.number().min(0).default(0),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  inventoryItemId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addCableRollsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const stationId = await resolveStationId(parsed.data.stationId);
    if (!(await canAccessStation(parsed.data.stationId))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);
    const txCol = db.collection(ISP_COLLECTIONS.inventoryTransactions);

    const totalMeters = parsed.data.rollCount * parsed.data.metersPerRoll;
    const itemCode = (parsed.data.itemCode || parsed.data.itemName).trim().toUpperCase().replace(/\s+/g, '-');
    let itemId = parsed.data.inventoryItemId;

    let item = itemId
      ? await itemsCol.findOne({ id: itemId })
      : await itemsCol.findOne({
          itemName: parsed.data.itemName.trim(),
          $or: [{ stationId }, { stationIds: stationId }],
          unitType: 'meters',
        });

    let finalQuantity = totalMeters;

    if (item) {
      itemId = item.id;
      const balanceBefore = item.quantityAvailable;
      finalQuantity = balanceBefore + totalMeters;
      await itemsCol.updateOne(
        { id: itemId },
        {
          $set: {
            quantityAvailable: finalQuantity,
            isCable: true,
            unitType: 'meters',
            updatedAt: new Date(),
          },
        }
      );
      await txCol.insertOne({
        id: generateUUID(),
        stationId,
        itemId,
        transactionType: 'ADD',
        quantity: totalMeters,
        balanceBefore,
        balanceAfter: finalQuantity,
        notes: `Added ${parsed.data.rollCount} roll(s) × ${parsed.data.metersPerRoll}m`,
        createdBy: ctx.userId,
        createdAt: new Date(),
      });
    } else {
      itemId = generateUUID();
      item = {
        id: itemId,
        stationId,
        itemName: parsed.data.itemName.trim(),
        itemCode,
        category: parsed.data.category,
        unitType: 'meters',
        quantityAvailable: totalMeters,
        minimumLevel: parsed.data.minimumLevel,
        reorderLevel: parsed.data.minimumLevel,
        isCable: true,
        notes: parsed.data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await itemsCol.insertOne(item);
      await txCol.insertOne({
        id: generateUUID(),
        stationId,
        itemId,
        transactionType: 'ADD',
        quantity: totalMeters,
        balanceBefore: 0,
        balanceAfter: totalMeters,
        notes: `Initial ${parsed.data.rollCount} roll(s)`,
        createdBy: ctx.userId,
        createdAt: new Date(),
      });
    }

    const prefix = parsed.data.rollIdPrefix.trim().toUpperCase();
    const existingRolls = await rollsCol
      .find({ stationId, rollCode: { $regex: `^${prefix}-` } })
      .sort({ rollCode: -1 })
      .limit(1)
      .toArray();
    let startNum = 1;
    if (existingRolls.length > 0) {
      const match = String(existingRolls[0].rollCode).match(/-(\d+)$/);
      if (match) startNum = parseInt(match[1], 10) + 1;
    }

    const rolls = [];
    for (let i = 0; i < parsed.data.rollCount; i++) {
      const rollCode = `${prefix}-${String(startNum + i).padStart(3, '0')}`;
      const roll = {
        id: generateUUID(),
        stationId,
        inventoryItemId: itemId,
        rollCode,
        cableType: parsed.data.itemName.trim(),
        originalMeters: parsed.data.metersPerRoll,
        currentRemainingMeters: parsed.data.metersPerRoll,
        status: 'ACTIVE',
        notes: parsed.data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rolls.push(roll);
    }
    if (rolls.length > 0) await rollsCol.insertMany(rolls);

    await createAuditLog({
      userId: ctx.userId,
      stationId,
      action: 'ADD_STOCK',
      entityType: 'inventoryItem',
      entityId: itemId,
      afterData: { rollsAdded: rolls.length, totalMeters, itemName: parsed.data.itemName },
    });

    const finalQty = finalQuantity;

    return NextResponse.json({
      success: true,
      item: { ...item, quantityAvailable: finalQty },
      rolls,
      totalMeters,
    }, { status: 201 });
  } catch (error) {
    console.error('[ISP Add Cable Rolls]', error);
    return NextResponse.json({ error: 'Failed to add cable rolls' }, { status: 500 });
  }
}
