import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';
import { sendTicketCreationSMS, sendClientTicketSMS, sendTechnicianAssignmentSMS } from '@/lib/sms';

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
      technicians,
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
      technicians: Array.isArray(technicians) && technicians.length > 0 ? technicians : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await ticketsCollection.insertOne(ticket);

    console.log(`[Ticket Created] Ticket ${ticketId} created successfully. Triggering SMS...`);

    // Get base URL for ticket link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (request.headers.get('origin') || 'http://localhost:3000');

    // Send SMS notification to admin/technicians (don't wait for it to complete)
    sendTicketCreationSMS(
      ticketId,
      clientName,
      clientNumber,
      station,
      houseNumber,
      category,
      new Date(dateTimeReported),
      problemDescription,
      baseUrl
    ).catch((error) => {
      console.error('[Ticket API] Failed to send ticket creation SMS to admins:', error);
      // Don't throw - SMS failure shouldn't prevent ticket creation
    });

    // Send SMS notification to client (don't wait for it to complete)
    // First, fetch technician phone numbers if technicians are assigned
    let techniciansWithPhones: Array<{ name: string; phone: string }> = [];
    if (Array.isArray(technicians) && technicians.length > 0) {
      const techniciansCollection = db.collection('technicians');
      for (const technicianName of technicians) {
        const technicianDoc = await techniciansCollection.findOne({ name: technicianName });
        if (technicianDoc && technicianDoc.phone) {
          techniciansWithPhones.push({
            name: technicianName,
            phone: technicianDoc.phone
          });
        }
      }
    }
    
    sendClientTicketSMS(
      ticketId,
      clientName,
      clientNumber,
      station,
      category,
      techniciansWithPhones.length > 0 ? techniciansWithPhones : undefined
    ).catch((error) => {
      console.error('[Ticket API] Failed to send SMS to client:', error);
      // Don't throw - SMS failure shouldn't prevent ticket creation
    });

    // Send SMS to assigned technicians if any
    if (Array.isArray(technicians) && technicians.length > 0) {
      const techniciansCollection = db.collection('technicians');
      
      for (const technicianName of technicians) {
        const technicianDoc = await techniciansCollection.findOne({ name: technicianName });
        const technicianPhone = technicianDoc?.phone || technicianDoc?.phoneNumber;

        if (technicianPhone) {
          console.log(`[Ticket Creation] ✅ Sending SMS to technician ${technicianName} at ${technicianPhone}`);
          sendTechnicianAssignmentSMS(
            technicianPhone,
            ticketId,
            category,
            clientName,
            station,
            clientNumber,
            problemDescription,
            baseUrl
          ).catch((error) => {
            console.error(`[Ticket API] Failed to send assignment SMS to technician ${technicianName}:`, error);
          });
        } else {
          console.log(`[Ticket Creation] ⚠️ No phone number found for technician ${technicianName}, SMS not sent`);
        }
      }
    }

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

