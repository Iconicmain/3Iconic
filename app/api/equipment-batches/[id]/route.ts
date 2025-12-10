import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';

// Get a specific batch with detailed information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const batchesCollection = db.collection('equipmentBatches');
    const equipmentCollection = db.collection('equipment');

    const batch = await batchesCollection.findOne({ _id: new ObjectId(id) });

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    const batchId = batch._id.toString();

    // Get all equipment in this batch
    const equipment = await equipmentCollection
      .find({ batchId: batchId })
      .sort({ createdAt: 1 })
      .toArray();

    // Calculate statistics
    const stats = {
      total: equipment.length,
      available: equipment.filter((e: any) => ['bought', 'available'].includes(e.status)).length,
      installed: equipment.filter((e: any) => e.status === 'installed').length,
      inRepair: equipment.filter((e: any) => e.status === 'in-repair').length,
      finished: equipment.length > 0 && equipment.every((e: any) => e.status === 'installed'),
    };

    // Get clients who received equipment
    const clients = equipment
      .filter((e: any) => e.status === 'installed' && e.client)
      .map((e: any) => ({
        equipmentId: e.equipmentId,
        serialNumber: e.serialNumber,
        client: e.client || e.clientName,
        clientNumber: e.clientNumber,
        installDate: e.installDate,
        station: e.station,
      }));

    return NextResponse.json({
      batch: {
        ...batch,
        _id: batch._id.toString(),
      },
      equipment: equipment.map((e: any) => ({
        ...e,
        _id: e._id.toString(),
      })),
      stats,
      clients,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

