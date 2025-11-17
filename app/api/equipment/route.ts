import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    const equipment = await equipmentCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Ensure _id is converted to string for JSON serialization
    const equipmentWithStringIds = equipment.map((eq) => ({
      ...eq,
      _id: eq._id.toString(),
    }));

    return NextResponse.json({ equipment: equipmentWithStringIds }, { status: 200 });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user has add permission for equipment page
    const hasAddPermission = await hasPagePermission('/admin/equipment', 'add');
    if (!hasAddPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create equipment' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      model, 
      serialNumber, 
      status, 
      cost, 
      warranty, 
      station, 
      client: clientName, 
      installDate, 
      lastService,
      installationType,
      replacedEquipmentId,
      boughtDate
    } = body;

    if (!name || !model || !serialNumber) {
      return NextResponse.json(
        { error: 'Name, model, and serial number are required' },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    // Check if serial number already exists
    const existing = await equipmentCollection.findOne({ 
      serialNumber: serialNumber.trim() 
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Equipment with this serial number already exists' },
        { status: 400 }
      );
    }

    // Generate equipment ID
    const count = await equipmentCollection.countDocuments();
    const equipmentId = `EQ-${String(count + 1).padStart(3, '0')}`;

    // Set bought date to current date if not provided or if status is 'bought'
    const finalBoughtDate = boughtDate || (status === 'bought' ? new Date().toISOString().split('T')[0] : null);
    const finalStatus = status || 'bought'; // Default to 'bought' if not specified

    const equipment = {
      equipmentId,
      name: name.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      status: finalStatus,
      cost: cost || 0,
      warranty: warranty || null,
      station: station || null,
      client: clientName || null,
      installDate: installDate || null,
      lastService: lastService || null,
      installationType: installationType || 'new-installation',
      replacedEquipmentId: replacedEquipmentId || null,
      boughtDate: finalBoughtDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await equipmentCollection.insertOne(equipment);

    return NextResponse.json(
      { success: true, equipment: { ...equipment, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating equipment:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}
