import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const stationsCollection = db.collection('stations');
    const ticketsCollection = db.collection('tickets');

    // Get all stations
    const stations = await stationsCollection.find({}).toArray();

    // Calculate activity score (using performanceScore from stations)
    const activityScore = stations.map((station) => ({
      station: station.name,
      score: station.performanceScore || 0,
    }));

    // Calculate tickets handled from actual tickets in database
    const ticketsHandled = await Promise.all(
      stations.map(async (station) => {
        const ticketCount = await ticketsCollection.countDocuments({
          station: station.name
        });
        return {
          station: station.name,
          tickets: ticketCount
        };
      })
    );

    // Calculate monthly success rate (mock data for now, can be calculated from tickets later)
    const currentMonth = new Date().getMonth();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const successRate = months.slice(0, 6).map((month, index) => ({
      month,
      rate: 85 + Math.floor(Math.random() * 10), // Placeholder - can be calculated from actual ticket data
    }));

    return NextResponse.json({
      activityScore,
      ticketsHandled,
      successRate,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching station stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station statistics' },
      { status: 500 }
    );
  }
}

