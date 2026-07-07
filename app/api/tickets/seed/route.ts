import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const sampleTickets = [
  {
    ticketId: 'TKT-001',
    clientName: 'Acme Corp',
    clientNumber: 'CL-001',
    station: 'Station A',
    houseNumber: 'Building 12, Room 304',
    category: 'Installation',
    dateTimeReported: new Date('2024-01-15T10:30:00'),
    problemDescription: 'Need to install new network equipment in the server room. Multiple devices need to be configured.',
    status: 'open',
    technician: 'John Smith',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    ticketId: 'TKT-002',
    clientName: 'TechStart Inc',
    clientNumber: 'CL-002',
    station: 'Station B',
    houseNumber: 'Barrack 5, Unit 12',
    category: 'Maintenance',
    dateTimeReported: new Date('2024-01-14T14:15:00'),
    problemDescription: 'Regular maintenance check required for all equipment. Some devices showing warning signs.',
    status: 'in-progress',
    technician: 'Sarah Jones',
    createdAt: new Date('2024-01-14T14:15:00'),
    updatedAt: new Date('2024-01-14T14:15:00'),
  },
];

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    // Check if tickets already exist
    const existingCount = await ticketsCollection.countDocuments();
    
    // Only insert if collection is empty
    if (existingCount > 0) {
      return NextResponse.json(
        { message: `Database already has ${existingCount} tickets. Skipping seed.` },
        { status: 200 }
      );
    }

    // Insert sample tickets
    const result = await ticketsCollection.insertMany(sampleTickets);
    
    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully seeded ${result.insertedCount} tickets`,
        tickets: sampleTickets.map(t => t.ticketId)
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding tickets:', error);
    return NextResponse.json(
      { error: 'Failed to seed tickets' },
      { status: 500 }
    );
  }
}

