import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { sendTicketResolvedSMS } from '@/lib/sms';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { status, resolutionNotes } = body;

    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to mark tickets as resolved' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    // Find ticket by ticketId
    const ticket = await ticketsCollection.findOne({ ticketId });
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }
    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes;
    }

    // If status is being set to 'resolved', automatically set resolvedAt if not already set
    if (status === 'resolved' && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const result = await ticketsCollection.updateOne(
      { ticketId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const updatedTicket = await ticketsCollection.findOne({ ticketId });

    console.log(`[Ticket Resolution] Status: ${status}, Ticket ID: ${ticketId}`);
    console.log(`[Ticket Resolution] Updated ticket:`, {
      ticketId: updatedTicket?.ticketId,
      status: updatedTicket?.status,
      clientName: updatedTicket?.clientName,
      clientNumber: updatedTicket?.clientNumber,
    });

    // Send SMS to client if ticket was resolved or closed
    if ((status === 'resolved' || status === 'closed') && updatedTicket) {
      if (!updatedTicket.clientNumber) {
        console.error(`[Ticket Resolution] ❌ Cannot send SMS: Client number missing for ticket ${ticketId}`);
      } else {
        console.log(`[Ticket Resolution] ✅ Triggering SMS to client ${updatedTicket.clientNumber} for ticket ${ticketId}`);
        sendTicketResolvedSMS(
          ticketId,
          updatedTicket.clientName,
          updatedTicket.clientNumber
        ).catch((error) => {
          console.error('[Ticket API] Failed to send resolution SMS to client:', error);
          // Don't throw - SMS failure shouldn't prevent ticket resolution
        });
      }
    } else {
      console.log(`[Ticket Resolution] ⚠️ SMS not sent. Status: ${status}, Has ticket: ${!!updatedTicket}`);
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

