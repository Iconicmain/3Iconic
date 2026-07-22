import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { routerReplacementReturnSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { processRouterReplacementReturn } from '@/lib/isp/router-replacement-service';
import { notifyEquipmentReturn } from '@/lib/isp/equipment-sms';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = routerReplacementReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const replacementsCol = db.collection(ISP_COLLECTIONS.routerReplacementReturns);

    const existing = await replacementsCol.findOne({ id: parsed.data.replacementId });
    if (!existing) {
      return NextResponse.json({ error: 'Replacement record not found' }, { status: 404 });
    }

    const defaultStation = (existing as { stationId: string }).stationId;
    const returnStationId = parsed.data.returnStationId || defaultStation;

    if (!(await canAccessStation(returnStationId))) {
      return NextResponse.json({ error: 'Access denied to return station' }, { status: 403 });
    }

    const result = await processRouterReplacementReturn(db, {
      replacementId: parsed.data.replacementId,
      returnCondition: parsed.data.returnCondition,
      returnStationId,
      oldRouterSerial: parsed.data.oldRouterSerial,
      oldRouterMac: parsed.data.oldRouterMac,
      notes: parsed.data.notes,
      markLost: parsed.data.markLost,
      userId: ctx.userId,
    });

    const oldLabel =
      result.replacement.oldRouterSerial ||
      result.replacement.oldRouterMac ||
      'old router';

    try {
      await notifyEquipmentReturn({
        technicianId: result.replacement.technicianId,
        technicianName: result.replacement.technicianName || undefined,
        stationId: returnStationId,
        itemsSummary: `Replacement return: ${oldLabel} (new: ${result.replacement.newRouterSerial || result.replacement.newRouterMac || 'installed unit'})`,
        quantityReturned: parsed.data.markLost || parsed.data.returnCondition === 'Lost' ? 0 : 1,
        unitType: 'pcs',
        returnCondition: parsed.data.returnCondition,
        processedByUserId: ctx.userId,
        notes: parsed.data.notes || null,
      });
    } catch (err) {
      console.error('[ISP Replacement Return SMS]', err);
    }

    return NextResponse.json({
      success: true,
      replacement: result.replacement,
      stockRestored: result.stockRestored,
    });
  } catch (error) {
    console.error('[ISP Replacement Return]', error);
    const message = error instanceof Error ? error.message : 'Failed to process replacement return';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
