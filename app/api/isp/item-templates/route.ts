import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { NO_CACHE_HEADERS } from '@/lib/isp/no-cache';
import { generateUUID } from '@/lib/uuid';
import { getIspUserContext } from '@/lib/isp/permissions';
import { createAuditLog } from '@/lib/isp/audit';
import { itemTemplateSchema } from '@/lib/isp/validation';
import { ISP_COLLECTIONS, ISP_DB } from '@/lib/isp/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await getIspUserContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const templates = await db
      .collection(ISP_COLLECTIONS.itemTemplates)
      .find({})
      .sort({ itemTypeId: 1, itemName: 1 })
      .toArray();

    return NextResponse.json({ templates }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[ISP Item Templates GET]', error);
    return NextResponse.json({ error: 'Failed to fetch item templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = itemTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Validation failed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const col = db.collection(ISP_COLLECTIONS.itemTemplates);

    const existing = await col.findOne({
      itemName: parsed.data.itemName.trim(),
      itemTypeId: parsed.data.itemTypeId,
    });
    if (existing) {
      return NextResponse.json({ error: 'This item name is already in your catalog' }, { status: 409 });
    }

    const template = {
      id: generateUUID(),
      itemName: parsed.data.itemName.trim(),
      itemCode: parsed.data.itemCode?.trim().toUpperCase() || null,
      itemTypeId: parsed.data.itemTypeId,
      category: parsed.data.category || null,
      splitterPreset: parsed.data.splitterPreset || null,
      defaultMinimumLevel: parsed.data.defaultMinimumLevel ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await col.insertOne(template);
    await createAuditLog({
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'itemTemplate',
      entityId: template.id,
      afterData: template,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('[ISP Item Templates POST]', error);
    return NextResponse.json({ error: 'Failed to save item template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getIspUserContext();
    if (!ctx || ['TECHNICIAN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(ISP_DB);
    const result = await db.collection(ISP_COLLECTIONS.itemTemplates).deleteOne({ id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ISP Item Templates DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
