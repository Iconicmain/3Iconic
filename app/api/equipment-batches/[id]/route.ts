import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';

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

// Helper function to check if current user is superadmin
async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) {
    return false;
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const usersCollection = db.collection('users');

  const user = await usersCollection.findOne({
    email: session.user.email.toLowerCase(),
  });

  return user?.role === 'superadmin';
}

// Delete a batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only superadmins can delete batches
    const userIsSuperAdmin = await isSuperAdmin();
    if (!userIsSuperAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can delete batches' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const batchesCollection = db.collection('equipmentBatches');
    const equipmentCollection = db.collection('equipment');

    // Check if batch exists
    const batch = await batchesCollection.findOne({ _id: new ObjectId(id) });
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    const batchId = batch._id.toString();

    // Delete all equipment in this batch first
    const deleteEquipmentResult = await equipmentCollection.deleteMany({ batchId: batchId });
    const deletedEquipmentCount = deleteEquipmentResult.deletedCount || 0;
    
    console.log(`Deleted ${deletedEquipmentCount} equipment items from batch ${batchId}`);

    // Delete the batch
    const result = await batchesCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Batch deleted successfully. ${deletedEquipmentCount} equipment item(s) were also deleted.`,
        deletedEquipmentCount: deletedEquipmentCount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}

