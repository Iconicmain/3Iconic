import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function POST(
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
        { error: 'Only super admin can mark payments' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { email, month, year, paymentDate } = body;

    if (!email || month === undefined || year === undefined) {
      return NextResponse.json(
        { error: 'Email, month, and year are required' },
        { status: 400 }
      );
    }

    const connectionsCollection = db.collection('internetConnections');
    const connection = await connectionsCollection.findOne({ _id: new ObjectId(id) });

    if (!connection) {
      return NextResponse.json(
        { error: 'Internet connection not found' },
        { status: 404 }
      );
    }

    // Find the email entry and update its payment log
    const starlinkEmails = connection.starlinkEmails || [];
    const emailIndex = starlinkEmails.findIndex((entry: any) => {
      const entryEmail = typeof entry === 'string' ? entry : entry.email;
      return entryEmail === email;
    });

    if (emailIndex === -1) {
      return NextResponse.json(
        { error: 'Starlink email not found in this connection' },
        { status: 404 }
      );
    }

    // Get the email entry
    let emailEntry: any = starlinkEmails[emailIndex];
    if (typeof emailEntry === 'string') {
      emailEntry = { email: emailEntry, password: '' };
    }

    // Initialize paymentLog if it doesn't exist
    if (!emailEntry.paymentLog) {
      emailEntry.paymentLog = [];
    }

    // Add new payment entry with the provided date or current date
    const paymentDateTime = paymentDate ? new Date(paymentDate) : new Date();
    emailEntry.paymentLog.push({
      date: paymentDateTime.toISOString(),
      month: month,
      year: year,
    });

    // Update the email entry in the array
    starlinkEmails[emailIndex] = emailEntry;

    // Update the connection
    const result = await connectionsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          starlinkEmails: starlinkEmails,
          updatedAt: new Date(),
        },
      }
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
    console.error('Error marking payment:', error);
    return NextResponse.json(
      { error: 'Failed to mark payment' },
      { status: 500 }
    );
  }
}

