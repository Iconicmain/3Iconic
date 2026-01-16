import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { sendSMS } from '@/lib/sms';

const EQUIPMENT_REQUEST_NUMBERS = process.env.EQUIPMENT_REQUEST_NUMBERS || process.env.TICKET_NUMBERS || '+254796030992,+254746089137';

// POST - Create a new equipment request
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      itemName,
      itemType,
      station,
      quantity,
      priority,
      reason,
      additionalNotes,
    } = body;

    // Validate required fields
    if (!itemName || !itemType || !station || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Item name, type, station, quantity, and reason are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const requestsCollection = db.collection('equipmentRequests');

    // Get user info from database
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    // Generate request ID
    const count = await requestsCollection.countDocuments();
    const requestId = `REQ-${String(count + 1).padStart(4, '0')}`;

    const equipmentRequest = {
      requestId,
      itemName,
      itemType,
      station,
      quantity: Number(quantity),
      priority: priority || 'medium',
      reason,
      additionalNotes: additionalNotes || '',
      status: 'pending',
      requestedBy: {
        email: session.user.email,
        name: user?.name || session.user.name || 'Unknown User',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await requestsCollection.insertOne(equipmentRequest);

    console.log(`[Equipment Request Created] Request ${requestId} created successfully. Triggering SMS...`);

    // Send SMS notification to admin numbers
    const requesterName = user?.name || session.user.name || 'Unknown User';
    const message = `New Equipment Request\n\nRequest ID: ${requestId}\nRequester: ${requesterName}\nStation: ${station}\nItem: ${itemName}\nType: ${itemType}\nQuantity: ${quantity}\nPriority: ${priority || 'medium'}\nReason: ${reason}${additionalNotes ? `\nNotes: ${additionalNotes}` : ''}\n\nStatus: Pending Approval`;
    
    const numbers = EQUIPMENT_REQUEST_NUMBERS.split(',').map(num => num.trim());
    
    sendSMS({
      mobile: numbers,
      msg: message,
    }).catch((error) => {
      console.error(`[Equipment Request API] Failed to send SMS to admins:`, error);
      // Don't throw - SMS failure shouldn't prevent request creation
    });

    return NextResponse.json(
      { success: true, request: { ...equipmentRequest, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating equipment request:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment request' },
      { status: 500 }
    );
  }
}

// GET - Fetch all equipment requests (only super admin or authorized users)
export async function GET(request: NextRequest) {
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
      email: session.user.email.toLowerCase() 
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admins can view all requests' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const requestsCollection = db.collection('equipmentRequests');

    // Build query filter
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Execute queries in parallel
    const [requests, totalCount] = await Promise.all([
      requestsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      requestsCollection.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        requests,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching equipment requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment requests' },
      { status: 500 }
    );
  }
}

