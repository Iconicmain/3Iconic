import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

// PATCH - Update request status (accept/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admins can update request status' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminNotes } = body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    const requestsCollection = db.collection('equipmentRequests');

    // Find the request by ID (support both _id and requestId)
    let query: any;
    if (ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { requestId: id };
    }

    const existingRequest = await requestsCollection.findOne(query);

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Update the request
    const updateData: any = {
      status,
      updatedAt: new Date(),
      reviewedBy: {
        email: session.user.email,
        name: user?.name || session.user.name || 'Unknown Admin',
      },
      reviewedAt: new Date(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const result = await requestsCollection.updateOne(query, {
      $set: updateData,
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Request ${status} successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating equipment request:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment request' },
      { status: 500 }
    );
  }
}

