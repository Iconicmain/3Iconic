import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';
import { sendTicketResolvedSMS, sendTechnicianAssignmentSMS, sendCategoryChangeSMS } from '@/lib/sms';

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
      category,
      technician, // For backward compatibility
      technicians, // New field for multiple technicians
      resolvedAt,
      resolutionNotes,
    } = body;

    // Check permissions based on what's being updated
    // If only resolving (status = 'resolved'), allow authenticated users without edit permission
    // If updating category only, require edit permission
    // Otherwise, require edit permission for other updates
    const isOnlyResolving = status === 'resolved' && Object.keys(body).filter(k => k !== 'status').length === 0;
    
    if (isOnlyResolving) {
      // For resolving only, just check if user is authenticated
      const { auth } = await import('@/auth');
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'You must be signed in to mark tickets as resolved' },
          { status: 401 }
        );
      }
    } else {
      // For any other updates (including category), require edit permission
      const hasEditPermission = await hasPagePermission('/admin/tickets', 'edit');
      if (!hasEditPermission) {
        return NextResponse.json(
          { error: 'You do not have permission to edit tickets' },
          { status: 403 }
        );
      }
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');
    const techniciansCollection = db.collection('technicians');

    // Get current ticket to check if technician is being assigned and category is being changed
    const currentTicket = await ticketsCollection.findOne({ _id: new ObjectId(id) });
    const previousTechnician = currentTicket?.technician;
    const previousTechnicians = currentTicket?.technicians || (currentTicket?.technician ? [currentTicket.technician] : []);
    const previousCategory = currentTicket?.category || '';
    let newCategory: string | undefined = undefined;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }
    if (category !== undefined) {
      // Only update if category is a valid non-empty string
      if (category !== null && category !== '' && typeof category === 'string') {
        newCategory = category.trim();
        updateData.category = newCategory;
      } else if (category === null || category === '') {
        // Don't update if category is empty/null - keep existing category
        console.log(`[Ticket Update] Category update skipped - empty or null value provided`);
      }
    }
    // Handle technicians array (preferred) or technician string (backward compatibility)
    if (technicians !== undefined) {
      // If technicians array is provided, use it
      if (Array.isArray(technicians)) {
        updateData.technicians = technicians.length > 0 ? technicians : [];
        // Also set technician to first one for backward compatibility (if array has items)
        if (technicians.length > 0) {
          updateData.technician = technicians[0];
        } else {
          updateData.technician = undefined;
        }
      } else {
        // If technicians is not an array, clear it
        updateData.technicians = [];
        updateData.technician = undefined;
      }
    } else if (technician !== undefined) {
      // Backward compatibility: if only technician (string) is provided
      updateData.technician = technician;
      updateData.technicians = technician ? [technician] : [];
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
      category: updatedTicket?.category,
      previousCategory,
      technician: updatedTicket?.technician,
      technicians: updatedTicket?.technicians,
      previousTechnician,
      previousTechnicians,
      clientName: updatedTicket?.clientName,
      clientNumber: updatedTicket?.clientNumber,
    });

    // Send SMS if category was changed
    // Compare trimmed values to ensure accurate detection
    const previousCategoryTrimmed = (previousCategory || '').trim();
    const newCategoryTrimmed = newCategory ? newCategory.trim() : '';
    
    if (newCategory !== undefined && newCategoryTrimmed !== previousCategoryTrimmed && updatedTicket) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (request.headers.get('origin') || 'http://localhost:3000');
      
      console.log(`[Category Change] ✅ Category changed from "${previousCategoryTrimmed}" to "${newCategoryTrimmed}" for ticket ${updatedTicket.ticketId}`);
      console.log(`[Category Change] CAT_NUMBERS value:`, process.env.CAT_NUMBERS);
      
      sendCategoryChangeSMS(
        updatedTicket.ticketId,
        updatedTicket.clientName,
        updatedTicket.station,
        previousCategoryTrimmed || 'Unknown',
        newCategoryTrimmed,
        baseUrl
      ).catch((error) => {
        console.error('[Ticket API] Failed to send category change SMS:', error);
        // Don't throw - SMS failure shouldn't prevent category update
      });
    } else {
      console.log(`[Category Change] No category change detected. Previous: "${previousCategoryTrimmed}", New: "${newCategoryTrimmed}", category defined: ${category !== undefined}`);
    }

    // Send SMS to technicians if ticket was assigned to new technicians
    const newTechnicians = updatedTicket?.technicians || (updatedTicket?.technician ? [updatedTicket.technician] : []);
    const addedTechnicians = newTechnicians.filter((tech: string) => !previousTechnicians.includes(tech));
    
    if (addedTechnicians.length > 0 && updatedTicket) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (request.headers.get('origin') || 'http://localhost:3000');

      // Send SMS to each newly assigned technician
      for (const technicianName of addedTechnicians) {
        const technicianDoc = await techniciansCollection.findOne({ name: technicianName });
        const technicianPhone = technicianDoc?.phone || technicianDoc?.phoneNumber;

        if (technicianPhone) {
          console.log(`[Technician Assignment] ✅ Sending SMS to technician ${technicianName} at ${technicianPhone}`);
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
            console.error(`[Ticket API] Failed to send assignment SMS to technician ${technicianName}:`, error);
          });
        } else {
          console.log(`[Technician Assignment] ⚠️ No phone number found for technician ${technicianName}, SMS not sent`);
        }
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
