import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

