import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ equipment }, { status: 200 });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has edit permission for equipment page
    const hasEditPermission = await hasPagePermission('/admin/equipment', 'edit');
    if (!hasEditPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to edit equipment' },
        { status: 403 }
      );
    }

    const { id } = await params;
    console.log('PATCH equipment request:', { id, params });
    
    // Validate ObjectId format
    if (!id) {
      console.error('Missing equipment ID');
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      );
    }

    // Try to create ObjectId - if it fails, the ID is invalid
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      console.error('Invalid equipment ID format:', id, error);
      return NextResponse.json(
        { error: 'Invalid equipment ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('PATCH body:', body);
    const {
      name,
      model,
      serialNumber,
      status,
      cost,
      warranty,
      station,
      client: clientName,
      clientName: clientNameField,
      clientNumber,
      installDate,
      lastService,
      installationType,
      replacedEquipmentId,
      boughtDate,
      batchId,
    } = body;

    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    // Check if serial number already exists (excluding current equipment)
    if (serialNumber) {
      const existing = await equipmentCollection.findOne({
        serialNumber: serialNumber.trim(),
        _id: { $ne: new ObjectId(id) },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Equipment with this serial number already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name.trim();
    if (model) updateData.model = model.trim();
    if (serialNumber) updateData.serialNumber = serialNumber.trim();
    if (status) updateData.status = status;
    if (cost !== undefined) updateData.cost = cost;
    if (warranty !== undefined) updateData.warranty = warranty || null;
    if (station !== undefined) updateData.station = station || null;
    if (clientNameField !== undefined || clientName !== undefined) {
      const finalClientName = clientNameField || clientName;
      updateData.client = finalClientName || null;
      updateData.clientName = finalClientName || null;
    }
    if (clientNumber !== undefined) updateData.clientNumber = clientNumber || null;
    if (installDate !== undefined) updateData.installDate = installDate || null;
    if (lastService !== undefined) updateData.lastService = lastService || null;
    if (installationType !== undefined) updateData.installationType = installationType || 'new-installation';
    if (replacedEquipmentId !== undefined) updateData.replacedEquipmentId = replacedEquipmentId || null;
    if (boughtDate !== undefined) updateData.boughtDate = boughtDate || null;
    if (batchId !== undefined) updateData.batchId = batchId || null;

    console.log('Updating equipment with ObjectId:', objectId.toString());
    
    // Check if equipment exists first
    const existingEquipment = await equipmentCollection.findOne({ _id: objectId });
    if (!existingEquipment) {
      console.error('Equipment not found with ID:', id, 'ObjectId:', objectId.toString());
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const result = await equipmentCollection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );

    console.log('Update result:', { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const updatedEquipment = await equipmentCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json(
      { success: true, equipment: updatedEquipment },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating equipment:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has delete permission for equipment page
    const hasDeletePermission = await hasPagePermission('/admin/equipment', 'delete');
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete equipment' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    // Check if equipment exists first
    const existingEquipment = await equipmentCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingEquipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // If equipment has a batchId, return it to batch (soft delete/return to stock)
    // Otherwise, permanently delete it
    if (existingEquipment.batchId) {
      // Return equipment to batch: Set status to 'available', clear client info, but keep batchId
      const updateData = {
        status: 'available',
        client: null,
        clientName: null,
        clientNumber: null,
        station: null,
        installDate: null,
        installationType: 'new-installation',
        replacedEquipmentId: null,
        updatedAt: new Date(),
      };

      const result = await equipmentCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Equipment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Equipment returned to batch successfully' },
        { status: 200 }
      );
    } else {
      // Equipment has no batchId, permanently delete it
      const result = await equipmentCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Equipment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Equipment deleted successfully' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json(
      { error: 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}

