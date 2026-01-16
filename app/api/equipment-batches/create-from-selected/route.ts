import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    // Check if user has add permission for equipment page
    const hasAddPermission = await hasPagePermission('/admin/equipment', 'add');
    if (!hasAddPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create batches' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      purchaseDate,
      purchaseCost,
      supplier,
      equipmentIds, // Array of equipment IDs to add to batch
    } = body;

    if (!name || !purchaseDate) {
      return NextResponse.json(
        { error: 'Name and purchase date are required' },
        { status: 400 }
      );
    }

    if (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one equipment item must be selected' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const batchesCollection = db.collection('equipmentBatches');
    const equipmentCollection = db.collection('equipment');

    // Get selected equipment items
    const equipmentItems = await equipmentCollection
      .find({
        _id: { $in: equipmentIds.map((id: string) => new ObjectId(id)) }
      })
      .toArray();

    if (equipmentItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid equipment items found' },
        { status: 400 }
      );
    }

    // Check if any equipment already belongs to a batch
    const itemsWithBatch = equipmentItems.filter((item: any) => item.batchId);
    if (itemsWithBatch.length > 0) {
      return NextResponse.json(
        { error: 'Some selected equipment items already belong to a batch' },
        { status: 400 }
      );
    }

    // Determine equipment type from items
    const uniqueNames = [...new Set(equipmentItems.map((item: any) => item.name))];
    const equipmentType = uniqueNames.length === 1 
      ? uniqueNames[0] 
      : `${uniqueNames.length} Different Products`;

    // Calculate total cost
    const totalCost = equipmentItems.reduce((sum: number, item: any) => {
      return sum + (Number(item.cost) || 0);
    }, 0);

    // Generate batch number
    const batchCount = await batchesCollection.countDocuments();
    const batchNumber = `BATCH-${String(batchCount + 1).padStart(3, '0')}`;

    // Create batch
    const batch = {
      batchNumber,
      name: name.trim(),
      description: description?.trim() || '',
      equipmentType,
      quantity: equipmentItems.length,
      purchaseDate: new Date(purchaseDate),
      purchaseCost: purchaseCost ? Number(purchaseCost) : totalCost,
      supplier: supplier?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const batchResult = await batchesCollection.insertOne(batch);
    const batchId = batchResult.insertedId.toString();

    // Update equipment items with batchId
    await equipmentCollection.updateMany(
      { _id: { $in: equipmentIds.map((id: string) => new ObjectId(id)) } },
      {
        $set: {
          batchId: batchId,
          updatedAt: new Date(),
        }
      }
    );

    // Get updated batch with equipment count
    const updatedBatch = await batchesCollection.findOne({ _id: batchResult.insertedId });

    return NextResponse.json(
      { success: true, batch: updatedBatch },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating batch from selected equipment:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}

