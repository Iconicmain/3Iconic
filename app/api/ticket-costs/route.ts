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

    // Get all tickets that haven't been cleared and are not paid
    const tracking = await costTrackingCollection.findOne({ type: 'current' });
    const lastClearedDate = tracking?.lastClearedDate || new Date(0);

    // Only fetch tickets that are resolved or closed, not paid, and created after last cleared date
    const tickets = await ticketsCollection
      .find({
        createdAt: { $gte: lastClearedDate },
        status: { $in: ['resolved', 'closed'] },
        paid: { $ne: true } // Exclude tickets that are already marked as paid
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
        _id: ticket._id?.toString() || ticket._id,
        ticketId: ticket.ticketId,
        category: ticket.category,
        price: categoryPrice,
        createdAt: ticket.createdAt,
        clientName: ticket.clientName,
        paid: ticket.paid || false,
        paidAt: ticket.paidAt || null,
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
    const ticketsCollection = db.collection('tickets');
    const categoriesCollection = db.collection('categories');
    const costTrackingCollection = db.collection('ticketCostTracking');
    const paymentHistoryCollection = db.collection('paymentHistory');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can clear costs' },
        { status: 403 }
      );
    }

    // Get current tracking to find tickets to mark as paid
    const tracking = await costTrackingCollection.findOne({ type: 'current' });
    const lastClearedDate = tracking?.lastClearedDate || new Date(0);

    // Get all tickets that need to be marked as paid
    const ticketsToPay = await ticketsCollection
      .find({
        createdAt: { $gte: lastClearedDate },
        status: { $in: ['resolved', 'closed'] },
        paid: { $ne: true }
      })
      .toArray();

    // Get category prices
    const categories = await categoriesCollection.find({}).toArray();
    const categoryPrices: { [key: string]: number } = {};
    categories.forEach((cat: any) => {
      categoryPrices[cat.name] = cat.price || 0;
    });

    // Calculate payment details
    let totalAmount = 0;
    const ticketDetails = ticketsToPay.map((ticket: any) => {
      const price = categoryPrices[ticket.category] || 0;
      totalAmount += price;
      return {
        ticketId: ticket.ticketId,
        _id: ticket._id?.toString(),
        category: ticket.category,
        price: price,
        clientName: ticket.clientName,
        station: ticket.station,
      };
    });

    // Group by category for breakdown
    const categoryBreakdown: { [key: string]: { count: number; total: number } } = {};
    ticketDetails.forEach((td: any) => {
      if (!categoryBreakdown[td.category]) {
        categoryBreakdown[td.category] = { count: 0, total: 0 };
      }
      categoryBreakdown[td.category].count += 1;
      categoryBreakdown[td.category].total += td.price;
    });

    const paymentDate = new Date();

    // Save payment history record
    const paymentRecord = {
      paymentDate: paymentDate,
      totalAmount: totalAmount,
      ticketCount: ticketsToPay.length,
      tickets: ticketDetails,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        count: data.count,
        total: data.total,
      })),
      clearedBy: user.email,
      clearedByName: user.name || user.email,
      createdAt: paymentDate,
    };

    await paymentHistoryCollection.insertOne(paymentRecord);

    // Mark all tickets as paid
    if (ticketsToPay.length > 0) {
      const ticketIds = ticketsToPay.map((t: any) => t._id);
      await ticketsCollection.updateMany(
        { _id: { $in: ticketIds } },
        { 
          $set: { 
            paid: true,
            paidAt: paymentDate,
            paidBy: user.email
          } 
        }
      );
    }

    // Update or create tracking document
    await costTrackingCollection.updateOne(
      { type: 'current' },
      {
        $set: {
          type: 'current',
          lastClearedDate: paymentDate,
          clearedBy: user.email,
          clearedAt: paymentDate,
        }
      },
      { upsert: true }
    );

    return NextResponse.json(
      { 
        success: true, 
        message: 'Ticket costs cleared successfully',
        paymentRecord: {
          paymentDate: paymentRecord.paymentDate,
          totalAmount: paymentRecord.totalAmount,
          ticketCount: paymentRecord.ticketCount,
        }
      },
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

