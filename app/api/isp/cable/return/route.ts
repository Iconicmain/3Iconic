import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { cableReturnSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = cableReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const logsCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);
    const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);

    const log = await logsCol.findOne({ id: parsed.data.usageLogId });
    if (!log) {
      return NextResponse.json({ error: 'Usage log not found' }, { status: 404 });
    }

    if (!(await canAccessStation(log.stationId))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const metersReturned = parsed.data.metersReturned;
    const wasteMeters = parsed.data.wasteMeters ?? 0;

    if (metersReturned > log.metersIssued) {
      return NextResponse.json({ error: 'Cannot return more than was issued' }, { status: 400 });
    }

    const newMetersReturned = log.metersReturned + metersReturned;
    const newMetersUsed = log.metersIssued - newMetersReturned - wasteMeters;

    await logsCol.updateOne(
      { id: parsed.data.usageLogId },
      {
        $set: {
          metersReturned: newMetersReturned,
          metersUsed: Math.max(0, newMetersUsed),
          wasteMeters: wasteMeters || 0,
          closingMeters: log.closingMeters + metersReturned,
          updatedAt: new Date(),
        },
      }
    );

    const roll = await rollsCol.findOne({ id: log.rollId });
    if (roll) {
      await rollsCol.updateOne(
        { id: log.rollId },
        {
          $set: {
            currentRemainingMeters: roll.currentRemainingMeters + metersReturned,
            updatedAt: new Date(),
          },
        }
      );
    }

    await createAuditLog({
      userId: ctx.userId,
      stationId: log.stationId,
      action: 'CABLE_RETURN',
      entityType: 'cableUsageLog',
      entityId: parsed.data.usageLogId,
      afterData: { metersReturned: newMetersReturned, metersUsed: newMetersUsed },
    });

    const updated = await logsCol.findOne({ id: parsed.data.usageLogId });
    return NextResponse.json({ success: true, log: updated });
  } catch (error) {
    console.error('[ISP Cable Return]', error);
    return NextResponse.json({ error: 'Failed to process cable return' }, { status: 500 });
  }
}
