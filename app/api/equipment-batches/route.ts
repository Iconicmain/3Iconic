import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';

// Get all batches
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const batchesCollection = db.collection('equipmentBatches');
    const equipmentCollection = db.collection('equipment');

    // Get all batches
    const batches = await batchesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // For each batch, calculate statistics
    const batchesWithStats = await Promise.all(
      batches.map(async (batch: any) => {
        const batchId = batch._id.toString();
        
        // Count equipment in this batch
        const totalEquipment = await equipmentCollection.countDocuments({
          batchId: batchId,
        });

        // Count available equipment
        const availableEquipment = await equipmentCollection.countDocuments({
          batchId: batchId,
          status: { $in: ['bought', 'available'] },
        });

        // Count installed equipment
        const installedEquipment = await equipmentCollection.countDocuments({
          batchId: batchId,
          status: 'installed',
        });

        // Get clients who received equipment from this batch
        const installedItems = await equipmentCollection
          .find({
            batchId: batchId,
            status: 'installed',
            client: { $exists: true, $ne: null },
          })
          .project({ client: 1, clientName: 1, clientNumber: 1, equipmentId: 1, installDate: 1 })
          .toArray();

        return {
          _id: batch._id.toString(),
          batchNumber: batch.batchNumber,
          name: batch.name,
          description: batch.description,
          equipmentType: batch.equipmentType,
          quantity: batch.quantity,
          purchaseDate: batch.purchaseDate,
          purchaseCost: batch.purchaseCost,
          supplier: batch.supplier,
          createdAt: batch.createdAt,
          updatedAt: batch.updatedAt,
          stats: {
            total: totalEquipment,
            available: availableEquipment,
            installed: installedEquipment,
            remaining: availableEquipment,
            finished: totalEquipment > 0 && availableEquipment === 0,
          },
          clients: installedItems.map((item: any) => ({
            equipmentId: item.equipmentId,
            client: item.client || item.clientName,
            clientNumber: item.clientNumber,
            installDate: item.installDate,
          })),
        };
      })
    );

    return NextResponse.json({ batches: batchesWithStats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

// Create a new batch
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
      equipmentType,
      quantity,
      purchaseDate,
      purchaseCost,
      supplier,
      serialNumbers, // Array of serial numbers (old format)
      equipmentItems, // New format: array of {name, model, serialNumber, cost}
    } = body;

    if (!name || !purchaseDate) {
      return NextResponse.json(
        { error: 'Name and purchase date are required' },
        { status: 400 }
      );
    }

    // Determine equipment type from items or use provided
    let finalEquipmentType = equipmentType;
    if (equipmentItems && equipmentItems.length > 0) {
      const uniqueNames = [...new Set(equipmentItems.map((item: any) => item.name))];
      finalEquipmentType = uniqueNames.length === 1 
        ? uniqueNames[0] 
        : `${uniqueNames.length} Different Products`;
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const batchesCollection = db.collection('equipmentBatches');
    const equipmentCollection = db.collection('equipment');

    // Generate batch number
    const batchCount = await batchesCollection.countDocuments();
    const batchNumber = `BATCH-${String(batchCount + 1).padStart(3, '0')}`;

    // Calculate total quantity
    let totalQuantity = Number(quantity) || 0;
    if (equipmentItems && equipmentItems.length > 0) {
      totalQuantity = equipmentItems.length;
    } else if (serialNumbers && Array.isArray(serialNumbers)) {
      totalQuantity = serialNumbers.filter((sn: string) => sn && sn.trim().length > 0).length;
    }

    // Create batch
    const batch = {
      batchNumber,
      name: name.trim(),
      description: description?.trim() || '',
      equipmentType: finalEquipmentType || 'Mixed Equipment',
      quantity: totalQuantity,
      purchaseDate: new Date(purchaseDate),
      purchaseCost: purchaseCost ? Number(purchaseCost) : 0,
      supplier: supplier?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const batchResult = await batchesCollection.insertOne(batch);
    const batchId = batchResult.insertedId.toString();

    // If equipmentItems are provided, use them; otherwise use serialNumbers (backward compatibility)
    if (body.equipmentItems && Array.isArray(body.equipmentItems) && body.equipmentItems.length > 0) {
      // New format: equipmentItems with name, model, serialNumber, cost
      const currentCount = await equipmentCollection.countDocuments();
      const equipmentToCreate = body.equipmentItems.map((item: any, index: number) => ({
        equipmentId: `EQ-${String(currentCount + index + 1).padStart(3, '0')}`,
        name: item.name.trim(),
        model: item.model.trim(),
        serialNumber: item.serialNumber.trim(),
        status: 'bought' as const,
        batchId: batchId,
        cost: item.cost || 0,
        boughtDate: new Date(purchaseDate).toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Insert all equipment
      await equipmentCollection.insertMany(equipmentToCreate);
    } else if (serialNumbers && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
      // Old format: just serial numbers (backward compatibility)
      const validSerialNumbers = serialNumbers
        .map((sn: string) => sn.trim())
        .filter((sn: string) => sn.length > 0);

      if (validSerialNumbers.length > 0) {
        const currentCount = await equipmentCollection.countDocuments();
        const equipmentToCreate = validSerialNumbers.map((serialNumber: string, index: number) => ({
          equipmentId: `EQ-${String(currentCount + index + 1).padStart(3, '0')}`,
          name: equipmentType,
          model: equipmentType,
          serialNumber: serialNumber,
          status: 'bought' as const,
          batchId: batchId,
          cost: purchaseCost ? Number(purchaseCost) / validSerialNumbers.length : 0,
          boughtDate: new Date(purchaseDate).toISOString().split('T')[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        // Insert all equipment
        await equipmentCollection.insertMany(equipmentToCreate);
      }
    }

    return NextResponse.json(
      { success: true, batch: { ...batch, _id: batchResult.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}

