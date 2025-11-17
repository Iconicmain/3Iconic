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
    const ticketsCollection = db.collection('tickets');

    const station = await stationsCollection.findOne({ _id: new ObjectId(id) });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Get tickets for this station
    const tickets = await ticketsCollection
      .find({ station: station.name })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error) {
    console.error('Error fetching station tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station tickets' },
      { status: 500 }
    );
  }
}

