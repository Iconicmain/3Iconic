import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Technician name is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const techniciansCollection = db.collection('technicians');

    // Check if technician exists
    const existing = await techniciansCollection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    // Check if another technician with the same name exists
    const duplicate = await techniciansCollection.findOne({
      name: name.trim(),
      _id: { $ne: new ObjectId(id) }
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'A technician with this name already exists' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: name.trim(),
      updatedAt: new Date(),
    };

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    const result = await techniciansCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    const updated = await techniciansCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { success: true, technician: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating technician:', error);
    return NextResponse.json(
      { error: 'Failed to update technician' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const techniciansCollection = db.collection('technicians');

    const result = await techniciansCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Technician deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting technician:', error);
    return NextResponse.json(
      { error: 'Failed to delete technician' },
      { status: 500 }
    );
  }
}

