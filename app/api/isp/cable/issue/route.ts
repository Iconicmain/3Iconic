import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { cableIssueSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';
import { syncInventoryItemMeters } from '@/lib/isp/inventory-roll-stats';
import { normalizeIssuePayload } from '@/lib/isp/issue-types';
import { notifyCableIssue } from '@/lib/isp/equipment-sms';

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

    const meta = normalizeIssuePayload({
      ...body,
      stationId: body.sourceStationId || body.stationId,
    });
    if (meta.issueType === 'SHARED_STATIONS' && meta.sharedStationIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one station to share with' }, { status: 400 });
    }

    const expectedReturnDate = parsed.data.expectedReturnDate
      ? new Date(parsed.data.expectedReturnDate)
      : null;
    const jobRef = parsed.data.projectCustomer || parsed.data.jobReference || null;

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

    if (roll.status === 'FINISHED' || roll.status === 'CLOSED' || roll.status === 'DAMAGED') {
      return NextResponse.json({ error: 'This roll is not available for issuing' }, { status: 400 });
    }

    if (roll.currentRemainingMeters <= 0) {
      return NextResponse.json({ error: 'This roll has no remaining cable' }, { status: 400 });
    }

    if (roll.currentRemainingMeters < parsed.data.metersIssued) {
      return NextResponse.json({
        error: `Insufficient cable. Available: ${roll.currentRemainingMeters}m`,
      }, { status: 400 });
    }

    const openingMeters = roll.currentRemainingMeters;
    const closingMeters = openingMeters - parsed.data.metersIssued;
    const newStatus = closingMeters <= 0 ? 'FINISHED' : roll.status;

    await rollsCol.updateOne(
      { id: parsed.data.rollId },
      { $set: { currentRemainingMeters: closingMeters, status: newStatus, updatedAt: new Date() } }
    );

    await syncInventoryItemMeters(
      db,
      roll,
      -parsed.data.metersIssued,
      ctx.userId,
      `Issued ${parsed.data.metersIssued}m from roll ${roll.rollCode}`
    );

    const log = {
      id: generateUUID(),
      stationId: roll.stationId,
      sourceStationId: meta.sourceStationId || roll.stationId,
      primaryStationId: meta.primaryStationId || roll.stationId,
      issueType: meta.issueType,
      sharedStationIds: meta.sharedStationIds,
      expectedReturnDate,
      rollId: roll.id,
      rollCode: roll.rollCode,
      cableType: roll.cableType,
      technicianId: parsed.data.technicianId,
      jobReference: jobRef,
      openingMeters,
      metersIssued: parsed.data.metersIssued,
      metersReturned: 0,
      metersUsed: 0,
      closingMeters,
      approvedBy: ctx.userId,
      notes: parsed.data.notes || null,
      createdAt: new Date(),
    };
    await logsCol.insertOne(log);

    const auditAction = meta.issueType === 'SHARED_STATIONS' ? 'SHARED_CABLE_ISSUE' : 'CABLE_ISSUE';

    await createAuditLog({
      userId: ctx.userId,
      stationId: roll.stationId,
      action: auditAction,
      entityType: 'cableUsageLog',
      entityId: log.id,
      afterData: log,
    });

    notifyCableIssue({
      technicianId: parsed.data.technicianId,
      stationId: roll.stationId,
      rollCode: roll.rollCode,
      cableType: roll.cableType,
      metersIssued: parsed.data.metersIssued,
      issuedByUserId: ctx.userId,
      jobReference: jobRef,
    }).catch((err) => console.error('[ISP Cable Issue SMS]', err));

    return NextResponse.json({ success: true, log, closingMeters });
  } catch (error) {
    console.error('[ISP Cable Issue]', error);
    return NextResponse.json({ error: 'Failed to issue cable' }, { status: 500 });
  }
}
