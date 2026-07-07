import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This endpoint should be called periodically (e.g., via cron) to delete scheduled connections
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here if needed
    // For now, this can be called by a cron job or scheduled task

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const connectionsCollection = db.collection('internetConnections');

    const now = new Date();

    // Find all connections scheduled for deletion where the time has passed
    const connectionsToDelete = await connectionsCollection.find({
      scheduledForDeletion: { $lte: now },
    }).toArray();

    if (connectionsToDelete.length === 0) {
      return NextResponse.json(
        { message: 'No connections scheduled for deletion', deletedCount: 0 },
        { status: 200 }
      );
    }

    // Delete all connections that are past their deletion time
    const result = await connectionsCollection.deleteMany({
      scheduledForDeletion: { $lte: now },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: `Deleted ${result.deletedCount} connection(s)`,
        deletedCount: result.deletedCount 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cleaning up scheduled deletions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup scheduled deletions' },
      { status: 500 }
    );
  }
}

