import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DEFAULT_STATIONS = [
  { name: 'Station A', location: 'Downtown Center', region: 'North', status: 'active', technicians: 4, equipment: 28, ticketsThisMonth: 45, performanceScore: 92 },
  { name: 'Station B', location: 'Business Park', region: 'Central', status: 'active', technicians: 3, equipment: 22, ticketsThisMonth: 38, performanceScore: 88 },
  { name: 'Station C', location: 'Harbor District', region: 'East', status: 'active', technicians: 5, equipment: 35, ticketsThisMonth: 52, performanceScore: 95 },
  { name: 'Station D', location: 'Industrial Zone', region: 'West', status: 'maintenance', technicians: 2, equipment: 18, ticketsThisMonth: 28, performanceScore: 75 },
  { name: 'Station E', location: 'Tech Campus', region: 'South', status: 'active', technicians: 4, equipment: 31, ticketsThisMonth: 48, performanceScore: 90 },
];

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const stationsCollection = db.collection('stations');

    // Check if stations already exist
    const existingCount = await stationsCollection.countDocuments();
    
    if (existingCount > 0) {
      return NextResponse.json(
        { message: 'Stations already exist in database', count: existingCount },
        { status: 200 }
      );
    }

    // Insert default stations with IDs
    const stationsToInsert = DEFAULT_STATIONS.map((station, index) => ({
      stationId: `ST-${String(index + 1).padStart(3, '0')}`,
      ...station,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await stationsCollection.insertMany(stationsToInsert);

    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully seeded ${result.insertedCount} stations`,
        stations: stationsToInsert
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding stations:', error);
    return NextResponse.json(
      { error: 'Failed to seed stations' },
      { status: 500 }
    );
  }
}

