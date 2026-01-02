import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const stationsCollection = db.collection('stations');
    const ticketsCollection = db.collection('tickets');

    // Fetch ALL stations from database - no limit
    const stations = await stationsCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Calculate ticketsThisMonth for each station from actual tickets
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const stationsWithTicketCounts = await Promise.all(
      stations.map(async (station) => {
        // Count tickets for this station in the current month
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        
        const ticketCount = await ticketsCollection.countDocuments({
          station: station.name,
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        });

        return {
          ...station,
          ticketsThisMonth: ticketCount
        };
      })
    );

    console.log(`Fetched ${stationsWithTicketCounts.length} stations from database with real ticket counts`);

    return NextResponse.json({ 
      stations: stationsWithTicketCounts,
      count: stationsWithTicketCounts.length 
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5min, serve stale for 10min
      }
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user has add permission for stations page
    const hasAddPermission = await hasPagePermission('/admin/stations', 'add');
    if (!hasAddPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create stations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, location, region, status, technicians, equipment, ticketsThisMonth, performanceScore } = body;

    if (!name || !location || !region) {
      return NextResponse.json(
        { error: 'Name, location, and region are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const stationsCollection = db.collection('stations');

    // Generate station ID
    const count = await stationsCollection.countDocuments();
    const stationId = `ST-${String(count + 1).padStart(3, '0')}`;

    const station = {
      stationId,
      name: name.trim(),
      location: location.trim(),
      region: region.trim(),
      status: status || 'active',
      technicians: technicians || 0,
      equipment: equipment || 0,
      ticketsThisMonth: ticketsThisMonth || 0,
      performanceScore: performanceScore || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await stationsCollection.insertOne(station);

    return NextResponse.json(
      { success: true, station: { ...station, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating station:', error);
    return NextResponse.json(
      { error: 'Failed to create station' },
      { status: 500 }
    );
  }
}

