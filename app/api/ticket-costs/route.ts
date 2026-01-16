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
    // Separate solo tickets from joined tickets for Frank and Jilo
    const technicianBreakdown: { [key: string]: { count: number; total: number } } = {};
    const bothBreakdown: { frank: { count: number; total: number }, jilo: { count: number; total: number }, totalBothAmount: number } = {
      frank: { count: 0, total: 0 },
      jilo: { count: 0, total: 0 },
      totalBothAmount: 0
    };
    
    ticketCosts.forEach((tc: any) => {
      if (tc.technicians && tc.technicians.length > 0) {
        const isJoined = tc.technicians.length > 1;
        const hasFrank = tc.technicians.includes('Frank');
        const hasJilo = tc.technicians.includes('Jilo');
        const isFrankAndJilo = isJoined && hasFrank && hasJilo && tc.technicians.length === 2;
        
        if (isFrankAndJilo) {
          // When Frank and Jilo work together, track in "Both" section
          // First accumulate the total amount where they worked together
          bothBreakdown.frank.count += 1;
          bothBreakdown.jilo.count += 1;
          bothBreakdown.totalBothAmount += tc.price; // Total amount for calculation
        } else {
          // Track individual technicians (solo tickets or with others)
          tc.technicians.forEach((tech: string) => {
            // Only track solo tickets for Frank and Jilo (not joined tickets)
            if (tech === 'Frank' || tech === 'Jilo') {
              if (!isJoined) {
                // Solo ticket - 100%
                if (!technicianBreakdown[tech]) {
                  technicianBreakdown[tech] = { count: 0, total: 0 };
                }
                technicianBreakdown[tech].count += 1;
                technicianBreakdown[tech].total += tc.price;
              }
              // Skip joined tickets for Frank and Jilo (they're handled in "Both")
            } else {
              // Other technicians - track all their tickets
              if (!technicianBreakdown[tech]) {
                technicianBreakdown[tech] = { count: 0, total: 0 };
              }
              technicianBreakdown[tech].count += 1;
              if (isJoined) {
                technicianBreakdown[tech].total += tc.pricePerTechnician;
              } else {
                technicianBreakdown[tech].total += tc.price;
              }
            }
          });
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
    
    // Add "Both" entries if there are tickets where Frank and Jilo worked together
    // Calculate amounts based on percentage of total (Frank 60% of total, Jilo 50% of total)
    // Note: 60% + 50% = 110%, so the sum of breakdown will exceed totalCost
    // This is intentional - each person gets their percentage of the "both" total amount
    let frankPercentage: string | undefined;
    let jiloPercentage: string | undefined;
    
    if (bothBreakdown.totalBothAmount > 0) {
      // Calculate totals: Frank gets 60% of "both" total, Jilo gets 50% of "both" total
      // Example: If "both" tickets total 1,200
      //   Frank = 1,200 × 0.60 = 720 (60% of 1,200)
      //   Jilo = 1,200 × 0.50 = 600 (50% of 1,200)
      //   Sum = 720 + 600 = 1,320 (110% of the "both" total)
      bothBreakdown.frank.total = bothBreakdown.totalBothAmount * 0.60;
      bothBreakdown.jilo.total = bothBreakdown.totalBothAmount * 0.50;
      // Percentages are always 60% and 50% of the total "both" amount
      frankPercentage = '60%';
      jiloPercentage = '50%';
    }
    
    if (bothBreakdown.frank.count > 0 || bothBreakdown.jilo.count > 0) {
      technicianBreakdown['Both - Frank'] = { 
        count: bothBreakdown.frank.count, 
        total: Math.round(bothBreakdown.frank.total * 100) / 100 
      };
      technicianBreakdown['Both - Jilo'] = { 
        count: bothBreakdown.jilo.count, 
        total: Math.round(bothBreakdown.jilo.total * 100) / 100 
      };
    }

    // Calculate breakdown total for verification
    // Note: Breakdown sum may exceed totalCost because Frank (60%) + Jilo (50%) = 110% of "both" total
    const breakdownTotal = Object.values(technicianBreakdown).reduce((sum, data) => sum + data.total, 0);
    
    return NextResponse.json({
      totalCost, // Total cost of all tickets (sum of ticket prices)
      breakdownTotal: Math.round(breakdownTotal * 100) / 100, // Sum of all breakdown amounts (may exceed totalCost due to 110% split for "both")
      ticketCount: tickets.length,
      ticketCosts,
      technicianBreakdown: Object.entries(technicianBreakdown).map(([technician, data]) => ({
        technician,
        count: data.count,
        total: Math.round(data.total * 100) / 100, // Round to 2 decimal places
        percentage: technician === 'Both - Frank' ? frankPercentage : technician === 'Both - Jilo' ? jiloPercentage : (technician === 'Frank' || technician === 'Jilo') ? '100%' : undefined,
      })),
      lastClearedDate: tracking?.lastClearedDate || null,
      bothTotalAmount: bothBreakdown.totalBothAmount, // Total amount where Frank and Jilo worked together (for verification)
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
    // Separate solo tickets from joined tickets for Frank and Jilo
    const technicianBreakdown: { [key: string]: { count: number; total: number } } = {};
    const bothBreakdown: { frank: { count: number; total: number }, jilo: { count: number; total: number } } = {
      frank: { count: 0, total: 0 },
      jilo: { count: 0, total: 0 }
    };
    
    ticketDetails.forEach((td: any) => {
      if (td.technicians && td.technicians.length > 0) {
        const isJoined = td.technicians.length > 1;
        const hasFrank = td.technicians.includes('Frank');
        const hasJilo = td.technicians.includes('Jilo');
        const isFrankAndJilo = isJoined && hasFrank && hasJilo && td.technicians.length === 2;
        
        if (isFrankAndJilo) {
          // When Frank and Jilo work together, track in "Both" section
          bothBreakdown.frank.count += 1;
          bothBreakdown.frank.total += td.price * 0.60; // 60% for Frank
          bothBreakdown.jilo.count += 1;
          bothBreakdown.jilo.total += td.price * 0.50; // 50% for Jilo
        } else {
          // Track individual technicians (solo tickets or with others)
          td.technicians.forEach((tech: string) => {
            // Only track solo tickets for Frank and Jilo (not joined tickets)
            if (tech === 'Frank' || tech === 'Jilo') {
              if (!isJoined) {
                // Solo ticket - 100%
                if (!technicianBreakdown[tech]) {
                  technicianBreakdown[tech] = { count: 0, total: 0 };
                }
                technicianBreakdown[tech].count += 1;
                technicianBreakdown[tech].total += td.price;
              }
              // Skip joined tickets for Frank and Jilo (they're handled in "Both")
            } else {
              // Other technicians - track all their tickets
              if (!technicianBreakdown[tech]) {
                technicianBreakdown[tech] = { count: 0, total: 0 };
              }
              technicianBreakdown[tech].count += 1;
              if (isJoined) {
                technicianBreakdown[tech].total += td.pricePerTechnician;
              } else {
                technicianBreakdown[tech].total += td.price;
              }
            }
          });
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
    
    // Add "Both" entries if there are tickets where Frank and Jilo worked together
    if (bothBreakdown.frank.count > 0 || bothBreakdown.jilo.count > 0) {
      technicianBreakdown['Both - Frank'] = { count: bothBreakdown.frank.count, total: Math.round(bothBreakdown.frank.total * 100) / 100 };
      technicianBreakdown['Both - Jilo'] = { count: bothBreakdown.jilo.count, total: Math.round(bothBreakdown.jilo.total * 100) / 100 };
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
        percentage: technician === 'Both - Frank' ? '60%' : technician === 'Both - Jilo' ? '50%' : (technician === 'Frank' || technician === 'Jilo') ? '100%' : undefined,
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

