import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';

export const dynamic = 'force-dynamic';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext, canAccessStation } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { cableRollSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('stationId');

    if (!stationIdParam) {
      return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
    }

    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    if (!(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);

    const rolls = await rollsCol.find({ stationId }).sort({ rollCode: 1 }).toArray();
    return NextResponse.json({ rolls }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Cable GET]', error);
    return NextResponse.json({ error: 'Failed to fetch cable rolls' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const stationIdParam = body.stationId;
    if (!stationIdParam || !(await canAccessStation(stationIdParam))) {
      return NextResponse.json({ error: 'Access denied to this station' }, { status: 403 });
    }
    const stationId = await (await import('@/lib/isp/station-resolve')).resolveStationId(stationIdParam);

    const parsed = cableRollSchema.safeParse({
      rollCode: body.rollCode,
      cableType: body.cableType,
      originalMeters: body.originalMeters,
      currentRemainingMeters: body.currentRemainingMeters ?? body.originalMeters,
      notes: body.notes,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const rollsCol = db.collection(ISP_COLLECTIONS.cableRolls);

    const roll = {
      id: generateUUID(),
      stationId,
      rollCode: parsed.data.rollCode.trim().toUpperCase(),
      cableType: parsed.data.cableType.trim(),
      originalMeters: parsed.data.originalMeters,
      currentRemainingMeters: parsed.data.currentRemainingMeters ?? parsed.data.originalMeters,
      status: 'ACTIVE',
      notes: parsed.data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await rollsCol.insertOne(roll);
    await createAuditLog({
      userId: ctx.userId,
      stationId,
      action: 'CREATE',
      entityType: 'cableRoll',
      entityId: roll.id,
      afterData: roll,
    });

    return NextResponse.json({ roll }, { status: 201 });
  } catch (error) {
    console.error('[ISP Cable POST]', error);
    return NextResponse.json({ error: 'Failed to create cable roll' }, { status: 500 });
  }
}
