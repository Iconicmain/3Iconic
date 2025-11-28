import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sendTicketReminderSMS } from '@/lib/sms';

/**
 * API endpoint to send reminders for tickets open > 24 hours
 * This should be called by a cron job or scheduled task
 *
 * Note:
 * - We intentionally do NOT require a secret header here so that:
 *   - Vercel Cron Jobs can call this endpoint without extra header config
 *   - You can manually trigger reminders from the browser for debugging
 * - If you need to protect this in the future, you can re‑enable a CRON_SECRET check.
 */
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find tickets that are:
    // 1. Still open (status is 'open' or 'in-progress' or 'pending')
    // 2. Created more than 24 hours ago
    // 3. Haven't been reminded in the last 24 hours (to send reminder every 24 hours)
    const openTickets = await ticketsCollection.find({
      status: { $in: ['open', 'in-progress', 'pending'] },
      createdAt: { $lte: twentyFourHoursAgo },
      $or: [
        { lastReminderSent: { $exists: false } },
        { lastReminderSent: { $lt: twentyFourHoursAgo } }
      ]
    }).toArray();

    const results = {
      checked: openTickets.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send reminders for each ticket
    for (const ticket of openTickets) {
      try {
        const hoursOpen = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        
        await sendTicketReminderSMS(
          ticket.ticketId,
          ticket.clientName,
          ticket.station,
          ticket.category,
          hoursOpen
        );

        // Update ticket with reminder timestamp
        await ticketsCollection.updateOne(
          { _id: ticket._id },
          { 
            $set: { 
              lastReminderSent: new Date(),
              updatedAt: new Date(),
            } 
          }
        );

        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Ticket ${ticket.ticketId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Failed to send reminder for ticket ${ticket.ticketId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.checked} tickets. Sent ${results.sent} reminders, ${results.failed} failed.`,
      results,
    }, { status: 200 });
  } catch (error) {
    console.error('Error sending ticket reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send ticket reminders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to manually trigger reminders (for testing)
 */
export async function GET(request: NextRequest) {
  // You might want to add authentication here for manual triggers
  const response = await POST(request);
  return response;
}

