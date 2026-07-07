import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

// Bulk add routers by serial number or MAC address
export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { stationIds, itemName, units } = body;

    const stationIdList = Array.isArray(stationIds) ? stationIds : (stationIds ? [stationIds] : []);
    if (stationIdList.length === 0) {
      return NextResponse.json({ error: 'stationIds required' }, { status: 400 });
    }
    for (const sid of stationIdList) {
      if (!(await canAccessStation(sid))) {
        return NextResponse.json({ error: `Access denied to station ${sid}` }, { status: 403 });
      }
    }

    if (!itemName || typeof itemName !== 'string' || itemName.trim().length === 0) {
      return NextResponse.json({ error: 'itemName (router model name) is required' }, { status: 400 });
    }

    const unitsList = Array.isArray(units) ? units : [];
    if (unitsList.length === 0) {
      return NextResponse.json({ error: 'At least one unit (serialNumber or macAddress) required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);

    const toInsert: {
      id: string;
      stationIds: string[];
      itemName: string;
      serialNumber?: string | null;
      macAddress?: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }[] = [];

    for (const u of unitsList) {
      const serial = typeof u.serialNumber === 'string' ? u.serialNumber.trim() : null;
      const mac = typeof u.macAddress === 'string' ? u.macAddress.trim() : null;
      if (!serial && !mac) continue;
      toInsert.push({
        id: generateUUID(),
        stationIds: stationIdList,
        itemName: itemName.trim(),
        serialNumber: serial || null,
        macAddress: mac || null,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ error: 'No valid units (each needs serialNumber or macAddress)' }, { status: 400 });
    }

    await routersCol.insertMany(toInsert);
    await createAuditLog({
      userId: ctx.userId,
      stationId: stationIdList[0],
      action: 'BULK_ADD_ROUTERS',
      entityType: 'routerUnits',
      afterData: { count: toInsert.length, itemName: itemName.trim(), stationIds: stationIdList },
    });

    return NextResponse.json({ success: true, added: toInsert.length, routers: toInsert }, { status: 201 });
  } catch (error) {
    console.error('[ISP Routers Bulk]', error);
    return NextResponse.json({ error: 'Failed to add routers' }, { status: 500 });
  }
}
