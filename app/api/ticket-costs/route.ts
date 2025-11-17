import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

// This endpoint is only accessible to super admin
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');
    const categoriesCollection = db.collection('categories');
    const costTrackingCollection = db.collection('ticketCostTracking');

    // Get all tickets that haven't been cleared
    const tracking = await costTrackingCollection.findOne({ type: 'current' });
    const lastClearedDate = tracking?.lastClearedDate || new Date(0);

    const tickets = await ticketsCollection
      .find({
        createdAt: { $gte: lastClearedDate }
      })
      .toArray();

    // Get all categories with prices
    const categories = await categoriesCollection.find({}).toArray();
    const categoryPrices: { [key: string]: number } = {};
    categories.forEach((cat: any) => {
      categoryPrices[cat.name] = cat.price || 0;
    });

    // Calculate costs
    let totalCost = 0;
    const ticketCosts = tickets.map((ticket: any) => {
      const categoryPrice = categoryPrices[ticket.category] || 0;
      totalCost += categoryPrice;
      return {
        ticketId: ticket.ticketId,
        category: ticket.category,
        price: categoryPrice,
        createdAt: ticket.createdAt,
        clientName: ticket.clientName,
      };
    });

    // Group by category
    const categoryBreakdown: { [key: string]: { count: number; total: number } } = {};
    ticketCosts.forEach((tc: any) => {
      if (!categoryBreakdown[tc.category]) {
        categoryBreakdown[tc.category] = { count: 0, total: 0 };
      }
      categoryBreakdown[tc.category].count += 1;
      categoryBreakdown[tc.category].total += tc.price;
    });

    return NextResponse.json({
      totalCost,
      ticketCount: tickets.length,
      ticketCosts,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        count: data.count,
        total: data.total,
      })),
      lastClearedDate: tracking?.lastClearedDate || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ticket costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket costs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only super admin can clear costs
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
    const costTrackingCollection = db.collection('ticketCostTracking');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can clear costs' },
        { status: 403 }
      );
    }

    // Update or create tracking document
    await costTrackingCollection.updateOne(
      { type: 'current' },
      {
        $set: {
          type: 'current',
          lastClearedDate: new Date(),
          clearedBy: user.email,
          clearedAt: new Date(),
        }
      },
      { upsert: true }
    );

    return NextResponse.json(
      { success: true, message: 'Ticket costs cleared successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing ticket costs:', error);
    return NextResponse.json(
      { error: 'Failed to clear ticket costs' },
      { status: 500 }
    );
  }
}

