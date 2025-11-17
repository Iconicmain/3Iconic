import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';

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
    // Check if user has edit permission for tickets page
    const hasEditPermission = await hasPagePermission('/admin/tickets', 'edit');
    if (!hasEditPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to edit tickets' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      technician,
      resolvedAt,
      resolutionNotes,
    } = body;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

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

    // If status is being set to 'closed', automatically set resolvedAt if not provided
    if (status === 'closed' && !resolvedAt) {
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
