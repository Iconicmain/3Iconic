import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { canAccessSuperAdmin, getIspUserContext } from '@/lib/isp/permissions';
import { verifyStockDeleteOtp } from '@/lib/isp/stock-delete-otp';
import { createAuditLog } from '@/lib/isp/audit';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!(await canAccessSuperAdmin())) {
      return NextResponse.json({ error: 'Only super admins can delete stock' }, { status: 403 });
    }

    const ctx = await getIspUserContext();
    const session = await auth();
    if (!ctx || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((id: unknown) => typeof id === 'string' && id.trim())
      : [];
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds is required' }, { status: 400 });
    }
    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const user = await db.collection('users').findOne(
      { email: session.user.email.toLowerCase() },
      { projection: { id: 1 } }
    );
    const userId = user?.id || ctx.userId;

    const otpValid = await verifyStockDeleteOtp(userId, otp);
    if (!otpValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 403 });
    }

    const itemsCol = db.collection(ISP_COLLECTIONS.inventoryItems);
    const routersCol = db.collection(ISP_COLLECTIONS.routerUnits);
    const cableCol = db.collection(ISP_COLLECTIONS.cableRolls);

    const items = await itemsCol.find({ id: { $in: itemIds } }).toArray();
    if (items.length === 0) {
      return NextResponse.json({ error: 'Stock item(s) not found' }, { status: 404 });
    }

    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more stock items were not found' }, { status: 404 });
    }

    for (const item of items) {
      const stationIds = item.stationIds?.length
        ? item.stationIds
        : item.stationId
          ? [item.stationId]
          : [];

      const issuedUnits = await routersCol.countDocuments({
        itemName: item.itemName,
        ...(stationIds.length > 0 ? { stationIds: { $in: stationIds } } : {}),
        status: { $in: ['issued', 'installed'] },
      });

      if (issuedUnits > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete "${item.itemName}" — ${issuedUnits} unit(s) are currently issued or installed.`,
          },
          { status: 409 }
        );
      }
    }

    const deletedItems = [];

    for (const item of items) {
      const stationIds = item.stationIds?.length
        ? item.stationIds
        : item.stationId
          ? [item.stationId]
          : [];

      await routersCol.deleteMany({
        itemName: item.itemName,
        ...(stationIds.length > 0 ? { stationIds: { $in: stationIds } } : {}),
        status: { $in: ['available', 'returned', 'damaged'] },
      });

      if (item.isCable) {
        await cableCol.deleteMany({ inventoryItemId: item.id });
      }

      await itemsCol.deleteOne({ id: item.id });

      deletedItems.push({
        id: item.id,
        itemName: item.itemName,
        stationIds,
      });

      await createAuditLog({
        userId: ctx.userId,
        stationId: stationIds[0] || null,
        action: 'DELETE_STOCK',
        entityType: 'inventoryItem',
        entityId: item.id,
        beforeData: item,
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedItems.length,
      deleted: deletedItems,
    });
  } catch (error) {
    console.error('[ISP Delete Stock]', error);
    return NextResponse.json({ error: 'Failed to delete stock' }, { status: 500 });
  }
}
