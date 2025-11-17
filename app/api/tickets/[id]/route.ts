import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';
import { sendTicketResolvedSMS, sendTechnicianAssignmentSMS } from '@/lib/sms';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    const ticket = await ticketsCollection.findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
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
    const {
      status,
      technician,
      resolvedAt,
      resolutionNotes,
    } = body;

    // If only resolving (status = 'resolved'), allow authenticated users without edit permission
    // Otherwise, require edit permission
    if (status !== 'resolved') {
      const hasEditPermission = await hasPagePermission('/admin/tickets', 'edit');
      if (!hasEditPermission) {
        return NextResponse.json(
          { error: 'You do not have permission to edit tickets' },
          { status: 403 }
        );
      }
    } else {
      // For resolving, just check if user is authenticated
      const { auth } = await import('@/auth');
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'You must be signed in to mark tickets as resolved' },
          { status: 401 }
        );
      }
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');
    const techniciansCollection = db.collection('technicians');

    // Get current ticket to check if technician is being assigned
    const currentTicket = await ticketsCollection.findOne({ _id: new ObjectId(id) });
    const previousTechnician = currentTicket?.technician;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }
    if (technician !== undefined) {
      updateData.technician = technician;
    }
    if (resolvedAt !== undefined) {
      updateData.resolvedAt = resolvedAt ? new Date(resolvedAt) : null;
    }
    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes;
    }

    // If status is being set to 'closed' or 'resolved', automatically set resolvedAt if not provided
    if ((status === 'closed' || status === 'resolved') && !resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const result = await ticketsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const updatedTicket = await ticketsCollection.findOne({ _id: new ObjectId(id) });

    console.log(`[Ticket Update] Status: ${status}, Ticket ID: ${updatedTicket?.ticketId}`);
    console.log(`[Ticket Update] Updated ticket:`, {
      ticketId: updatedTicket?.ticketId,
      status: updatedTicket?.status,
      technician: updatedTicket?.technician,
      previousTechnician,
      clientName: updatedTicket?.clientName,
      clientNumber: updatedTicket?.clientNumber,
    });

    // Send SMS to technician if ticket was assigned to a new technician
    if (technician && technician !== previousTechnician && updatedTicket) {
      // Try to get technician phone number from technicians collection
      const technicianDoc = await techniciansCollection.findOne({ name: technician });
      const technicianPhone = technicianDoc?.phone || technicianDoc?.phoneNumber;
      
      // Get base URL for ticket link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (request.headers.get('origin') || 'http://localhost:3000');

      if (technicianPhone) {
        console.log(`[Technician Assignment] ✅ Sending SMS to technician ${technician} at ${technicianPhone}`);
        sendTechnicianAssignmentSMS(
          technicianPhone,
          updatedTicket.ticketId,
          updatedTicket.category,
          updatedTicket.clientName,
          updatedTicket.station,
          updatedTicket.clientNumber,
          updatedTicket.problemDescription || '',
          baseUrl
        ).catch((error) => {
          console.error('[Ticket API] Failed to send assignment SMS to technician:', error);
        });
      } else {
        console.log(`[Technician Assignment] ⚠️ No phone number found for technician ${technician}, SMS not sent`);
      }
    }

    // Send SMS to client if ticket was resolved or closed
    if ((status === 'resolved' || status === 'closed') && updatedTicket) {
      if (!updatedTicket.clientNumber) {
        console.error(`[Ticket Resolution] ❌ Cannot send SMS: Client number missing for ticket ${updatedTicket.ticketId}`);
      } else {
        console.log(`[Ticket Resolution] ✅ Triggering SMS to client ${updatedTicket.clientNumber} for ticket ${updatedTicket.ticketId}`);
        sendTicketResolvedSMS(
          updatedTicket.ticketId,
          updatedTicket.clientName,
          updatedTicket.clientNumber
        ).catch((error) => {
          console.error('[Ticket API] Failed to send resolution SMS to client:', error);
          // Don't throw - SMS failure shouldn't prevent ticket resolution
        });
      }
    }

    return NextResponse.json(
      { success: true, ticket: updatedTicket },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has delete permission for tickets page
    const hasDeletePermission = await hasPagePermission('/admin/tickets', 'delete');
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete tickets' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    const result = await ticketsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Ticket deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}
