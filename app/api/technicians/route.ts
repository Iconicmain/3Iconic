import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const techniciansCollection = db.collection('technicians');

    const technicians = await techniciansCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ technicians }, { status: 200 });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technicians' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check if technician already exists
    const existing = await techniciansCollection.findOne({ 
      name: name.trim() 
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Technician already exists' },
        { status: 400 }
      );
    }

    const technician = {
      name: name.trim(),
      phone: phone?.trim() || null,
      createdAt: new Date(),
    };

    const result = await techniciansCollection.insertOne(technician);

    return NextResponse.json(
      { success: true, technician: { ...technician, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating technician:', error);
    return NextResponse.json(
      { error: 'Failed to create technician' },
      { status: 500 }
    );
  }
}

