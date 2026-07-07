import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { linkTechnicianByEmail } from '@/lib/tickets/sync-technician-user';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const technicians = await db.collection('technicians').find({}).sort({ name: 1 }).toArray();
    return NextResponse.json({ technicians }, { status: 200 });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, linkedEmail } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Technician name is required' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const techniciansCollection = db.collection('technicians');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    const existing = await techniciansCollection.findOne({ name: trimmedName });
    if (existing) {
      return NextResponse.json({ error: 'Technician already exists' }, { status: 400 });
    }

    let ispUserId: string | null = null;
    let linkedUserEmail: string | null = null;

    if (linkedEmail?.trim()) {
      const link = await linkTechnicianByEmail(linkedEmail.trim());
      if (!link) {
        return NextResponse.json(
          { error: 'No user found with that Gmail / login email. User must sign in once first.' },
          { status: 400 }
        );
      }
      ispUserId = link.ispUserId;
      linkedUserEmail = link.email;
    }

    const technician = {
      name: trimmedName,
      phone: trimmedPhone,
      ispUserId,
      linkedEmail: linkedUserEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await techniciansCollection.insertOne(technician);

    return NextResponse.json(
      { success: true, technician: { ...technician, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating technician:', error);
    return NextResponse.json({ error: 'Failed to create technician' }, { status: 500 });
  }
}
