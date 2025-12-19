import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
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
    const connectionsCollection = db.collection('internetConnections');

    const connection = await connectionsCollection.findOne({ _id: new ObjectId(id) });

    if (!connection) {
      return NextResponse.json(
        { error: 'Internet connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ connection }, { status: 200 });
  } catch (error) {
    console.error('Error fetching internet connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch internet connection' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is superadmin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can modify internet connections' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { station, starlinkEmails, vpnIps, scheduledForDeletion } = body;

    const connectionsCollection = db.collection('internetConnections');

    // Get current connection
    const currentConnection = await connectionsCollection.findOne({ _id: new ObjectId(id) });
    if (!currentConnection) {
      return NextResponse.json(
        { error: 'Internet connection not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (scheduledForDeletion !== undefined) {
      if (scheduledForDeletion === null) {
        // Cancel deletion
        updateData.scheduledForDeletion = null;
      } else {
        // Schedule deletion
        updateData.scheduledForDeletion = new Date(scheduledForDeletion);
      }
    }

    if (starlinkEmails !== undefined) {
      // Handle both array of objects and array of strings for backward compatibility
      let emailEntries: Array<{ email: string; password: string }> = [];
      if (Array.isArray(starlinkEmails)) {
        emailEntries = starlinkEmails
          .map((item: any) => {
            if (typeof item === 'string') {
              return { email: item.trim(), password: '' };
            } else if (item && item.email) {
              return { email: item.email.trim(), password: item.password || '' };
            }
            return null;
          })
          .filter((item: any) => item && item.email);
      } else if (starlinkEmails) {
        emailEntries = [{ email: starlinkEmails.trim(), password: '' }];
      }
      
      // Validate all email formats
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const entry of emailEntries) {
        if (!emailRegex.test(entry.email)) {
          return NextResponse.json(
            { error: `Invalid email format: ${entry.email}` },
            { status: 400 }
          );
        }
      }
      updateData.starlinkEmails = emailEntries;
    }

    if (vpnIps !== undefined) {
      // Handle both array of objects and array of strings for backward compatibility
      let ipEntries: Array<{ ip: string; password: string }> = [];
      if (Array.isArray(vpnIps)) {
        ipEntries = vpnIps
          .map((item: any) => {
            if (typeof item === 'string') {
              return { ip: item.trim(), password: '' };
            } else if (item && item.ip) {
              return { ip: item.ip.trim(), password: item.password || '' };
            }
            return null;
          })
          .filter((item: any) => item && item.ip);
      } else if (vpnIps) {
        ipEntries = [{ ip: vpnIps.trim(), password: '' }];
      }
      
      // Validate all IP formats
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      for (const entry of ipEntries) {
        if (!ipRegex.test(entry.ip)) {
          return NextResponse.json(
            { error: `Invalid IP address format: ${entry.ip}` },
            { status: 400 }
          );
        }
      }
      updateData.vpnIps = ipEntries;
    }

    // Station cannot be changed after creation (not updating station in edit mode)

    const result = await connectionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Internet connection not found' },
        { status: 404 }
      );
    }

    const updatedConnection = await connectionsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { success: true, connection: updatedConnection },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating internet connection:', error);
    return NextResponse.json(
      { error: 'Failed to update internet connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is superadmin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection('users');
    const connectionsCollection = db.collection('internetConnections');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can delete internet connections' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get the connection to check if deletion time has passed
    const connection = await connectionsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Internet connection not found' },
        { status: 404 }
      );
    }

    // Only delete if scheduledForDeletion time has passed
    if (connection.scheduledForDeletion) {
      const deletionDate = new Date(connection.scheduledForDeletion);
      const now = new Date();
      
      if (now < deletionDate) {
        return NextResponse.json(
          { error: `Deletion is scheduled for ${deletionDate.toLocaleString()}. Cannot delete before scheduled time.` },
          { status: 400 }
        );
      }
    } else {
      // If not scheduled, don't allow immediate deletion
      return NextResponse.json(
        { error: 'Connection must be scheduled for deletion first. Deletion will occur 72 hours after scheduling.' },
        { status: 400 }
      );
    }

    const result = await connectionsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Internet connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Internet connection deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting internet connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete internet connection' },
      { status: 500 }
    );
  }
}

