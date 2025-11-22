import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';

// Get payment history - only accessible to super admin
export async function GET(request: NextRequest) {
  try {
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
    const paymentHistoryCollection = db.collection('paymentHistory');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can view payment history' },
        { status: 403 }
      );
    }

    // Get all payment history records, sorted by date (newest first)
    const paymentHistory = await paymentHistoryCollection
      .find({})
      .sort({ paymentDate: -1 })
      .toArray();

    return NextResponse.json(
      { paymentHistory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}

