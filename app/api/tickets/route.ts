import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    // Check if user has add permission for tickets page
    const hasAddPermission = await hasPagePermission('/admin/tickets', 'add');
    if (!hasAddPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create tickets' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      clientName,
      clientNumber,
      station,
      houseNumber,
      category,
      dateTimeReported,
      problemDescription,
    } = body;

    // Validate required fields
    if (!clientName || !clientNumber || !station || !houseNumber || !category || !dateTimeReported || !problemDescription) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    // Generate ticket ID
    const count = await ticketsCollection.countDocuments();
    const ticketId = `TKT-${String(count + 1).padStart(3, '0')}`;

    const ticket = {
      ticketId,
      clientName,
      clientNumber,
      station,
      houseNumber,
      category,
      dateTimeReported: new Date(dateTimeReported),
      problemDescription,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await ticketsCollection.insertOne(ticket);

    return NextResponse.json(
      { success: true, ticket: { ...ticket, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    const tickets = await ticketsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

