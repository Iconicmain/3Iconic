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

    // Calculate costs by technicians
    let totalCost = 0;
    const ticketCosts = tickets.map((ticket: any) => {
      const categoryPrice = categoryPrices[ticket.category] || 0;
      
      // Get technicians (handle both array and single string for backward compatibility)
      const technicians = ticket.technicians && Array.isArray(ticket.technicians) && ticket.technicians.length > 0
        ? ticket.technicians
        : (ticket.technician ? [ticket.technician] : []);
      
      // Calculate price per technician (split equally if multiple)
      const technicianCount = technicians.length;
      const pricePerTechnician = technicianCount > 0 ? categoryPrice / technicianCount : categoryPrice;
      
      totalCost += categoryPrice;
      
      return {
        _id: ticket._id?.toString() || ticket._id,
        ticketId: ticket.ticketId,
        category: ticket.category,
        price: categoryPrice,
        technicians: technicians,
        technicianCount: technicianCount,
        pricePerTechnician: pricePerTechnician,
        createdAt: ticket.createdAt,
        clientName: ticket.clientName,
        paid: ticket.paid || false,
        paidAt: ticket.paidAt || null,
      };
    });

    // Group by technician (calculate total earnings per technician)
    const technicianBreakdown: { [key: string]: { count: number; total: number } } = {};
    let bothCount = 0;
    let bothTotal = 0;
    
    ticketCosts.forEach((tc: any) => {
      if (tc.technicians && tc.technicians.length > 0) {
        // Track individual technicians
        tc.technicians.forEach((tech: string) => {
          if (!technicianBreakdown[tech]) {
            technicianBreakdown[tech] = { count: 0, total: 0 };
          }
          technicianBreakdown[tech].count += 1;
          technicianBreakdown[tech].total += tc.pricePerTechnician;
        });
        
        // Track "Both" for tickets with multiple technicians
        if (tc.technicians.length > 1) {
          bothCount += 1;
          bothTotal += tc.price; // Full ticket price for combined work
        }
      } else {
        // If no technicians assigned, track as "Unassigned"
        const unassignedKey = 'Unassigned';
        if (!technicianBreakdown[unassignedKey]) {
          technicianBreakdown[unassignedKey] = { count: 0, total: 0 };
        }
        technicianBreakdown[unassignedKey].count += 1;
        technicianBreakdown[unassignedKey].total += tc.price;
      }
    });
    
    // Add "Both" entry if there are tickets with multiple technicians
    if (bothCount > 0) {
      technicianBreakdown['Both'] = { count: bothCount, total: bothTotal };
    }

    return NextResponse.json({
      totalCost,
      ticketCount: tickets.length,
      ticketCosts,
      technicianBreakdown: Object.entries(technicianBreakdown).map(([technician, data]) => ({
        technician,
        count: data.count,
        total: Math.round(data.total * 100) / 100, // Round to 2 decimal places
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

    // Calculate payment details by technicians
    let totalAmount = 0;
    const ticketDetails = ticketsToPay.map((ticket: any) => {
      const price = categoryPrices[ticket.category] || 0;
      
      // Get technicians (handle both array and single string for backward compatibility)
      const technicians = ticket.technicians && Array.isArray(ticket.technicians) && ticket.technicians.length > 0
        ? ticket.technicians
        : (ticket.technician ? [ticket.technician] : []);
      
      // Calculate price per technician (split equally if multiple)
      const technicianCount = technicians.length;
      const pricePerTechnician = technicianCount > 0 ? price / technicianCount : price;
      
      totalAmount += price;
      return {
        ticketId: ticket.ticketId,
        _id: ticket._id?.toString(),
        category: ticket.category,
        price: price,
        technicians: technicians,
        technicianCount: technicianCount,
        pricePerTechnician: pricePerTechnician,
        clientName: ticket.clientName,
        station: ticket.station,
      };
    });

    // Group by technician for breakdown (calculate total earnings per technician)
    const technicianBreakdown: { [key: string]: { count: number; total: number } } = {};
    let bothCount = 0;
    let bothTotal = 0;
    
    ticketDetails.forEach((td: any) => {
      if (td.technicians && td.technicians.length > 0) {
        // Track individual technicians
        td.technicians.forEach((tech: string) => {
          if (!technicianBreakdown[tech]) {
            technicianBreakdown[tech] = { count: 0, total: 0 };
          }
          technicianBreakdown[tech].count += 1;
          technicianBreakdown[tech].total += td.pricePerTechnician;
        });
        
        // Track "Both" for tickets with multiple technicians
        if (td.technicians.length > 1) {
          bothCount += 1;
          bothTotal += td.price; // Full ticket price for combined work
        }
      } else {
        // If no technicians assigned, track as "Unassigned"
        const unassignedKey = 'Unassigned';
        if (!technicianBreakdown[unassignedKey]) {
          technicianBreakdown[unassignedKey] = { count: 0, total: 0 };
        }
        technicianBreakdown[unassignedKey].count += 1;
        technicianBreakdown[unassignedKey].total += td.price;
      }
    });
    
    // Add "Both" entry if there are tickets with multiple technicians
    if (bothCount > 0) {
      technicianBreakdown['Both'] = { count: bothCount, total: bothTotal };
    }

    const paymentDate = new Date();

    // Save payment history record
    const paymentRecord = {
      paymentDate: paymentDate,
      totalAmount: totalAmount,
      ticketCount: ticketsToPay.length,
      tickets: ticketDetails,
      technicianBreakdown: Object.entries(technicianBreakdown).map(([technician, data]) => ({
        technician,
        count: data.count,
        total: Math.round(data.total * 100) / 100, // Round to 2 decimal places
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

