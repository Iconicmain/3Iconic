import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const stationsCollection = db.collection('stations');

    const station = await stationsCollection.findOne({ _id: new ObjectId(id) });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ station }, { status: 200 });
  } catch (error) {
    console.error('Error fetching station:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, region, status, technicians, equipment, ticketsThisMonth, performanceScore } = body;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const stationsCollection = db.collection('stations');

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name.trim();
    if (location) updateData.location = location.trim();
    if (region) updateData.region = region.trim();
    if (status) updateData.status = status;
    if (technicians !== undefined) updateData.technicians = technicians;
    if (equipment !== undefined) updateData.equipment = equipment;
    if (ticketsThisMonth !== undefined) updateData.ticketsThisMonth = ticketsThisMonth;
    if (performanceScore !== undefined) updateData.performanceScore = performanceScore;

    const result = await stationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    const updatedStation = await stationsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { success: true, station: updatedStation },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating station:', error);
    return NextResponse.json(
      { error: 'Failed to update station' },
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
    const stationsCollection = db.collection('stations');

    const result = await stationsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Station deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting station:', error);
    return NextResponse.json(
      { error: 'Failed to delete station' },
      { status: 500 }
    );
  }
}

