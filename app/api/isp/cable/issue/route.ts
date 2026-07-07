import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { cableIssueSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = cableIssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);
    const logsCol = db.collection(ISP_COLLECTIONS.cableUsageLogs);

    const roll = await rollsCol.findOne({ id: parsed.data.rollId });
    if (!roll) {
      return NextResponse.json({ error: 'Cable roll not found' }, { status: 404 });
    }

    if (!(await canAccessStation(roll.stationId))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    if (roll.currentRemainingMeters < parsed.data.metersIssued) {
      return NextResponse.json({
        error: `Insufficient cable. Available: ${roll.currentRemainingMeters}m`,
      }, { status: 400 });
    }

    const openingMeters = roll.currentRemainingMeters;
    const closingMeters = openingMeters - parsed.data.metersIssued;

    await rollsCol.updateOne(
      { id: parsed.data.rollId },
      { $set: { currentRemainingMeters: closingMeters, updatedAt: new Date() } }
    );

    const log = {
      id: generateUUID(),
      stationId: roll.stationId,
      rollId: roll.id,
      technicianId: parsed.data.technicianId,
      jobReference: parsed.data.jobReference || null,
      openingMeters,
      metersIssued: parsed.data.metersIssued,
      metersReturned: 0,
      metersUsed: parsed.data.metersIssued,
      closingMeters,
      approvedBy: ctx.userId,
      notes: parsed.data.notes || null,
      createdAt: new Date(),
    };
    await logsCol.insertOne(log);

    await createAuditLog({
      userId: ctx.userId,
      stationId: roll.stationId,
      action: 'CABLE_ISSUE',
      entityType: 'cableUsageLog',
      entityId: log.id,
      afterData: log,
    });

    return NextResponse.json({ success: true, log, closingMeters });
  } catch (error) {
    console.error('[ISP Cable Issue]', error);
    return NextResponse.json({ error: 'Failed to issue cable' }, { status: 500 });
  }
}
