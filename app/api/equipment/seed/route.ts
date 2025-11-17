import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    // Delete existing equipment to allow re-seeding
    await equipmentCollection.deleteMany({});

    const sampleEquipment = [
      {
        equipmentId: 'EQ-001',
        name: 'Router Pro',
        model: 'RP-2024',
        serialNumber: 'SN-88441',
        status: 'bought',
        cost: 250000,
        warranty: '2025-12-15',
        station: null,
        client: null,
        installDate: null,
        lastService: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        equipmentId: 'EQ-002',
        name: 'Switch 48-Port',
        model: 'SW-48',
        serialNumber: 'SN-88442',
        status: 'available',
        cost: 420000,
        warranty: '2026-01-20',
        station: null,
        client: null,
        installDate: null,
        lastService: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        equipmentId: 'EQ-003',
        name: 'Router Pro',
        model: 'RP-2024',
        serialNumber: 'SN-88447',
        status: 'installed',
        cost: 250000,
        warranty: null,
        station: 'Station A',
        client: 'Acme Corp',
        installDate: '2024-01-10',
        lastService: '2024-06-15',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        equipmentId: 'EQ-004',
        name: 'Fiber Optic Cable',
        model: 'FOC-100m',
        serialNumber: 'SN-88444',
        status: 'available',
        cost: 85000,
        warranty: '2025-06-10',
        station: null,
        client: null,
        installDate: null,
        lastService: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        equipmentId: 'EQ-005',
        name: 'Ethernet Cable Kit',
        model: 'ECK-500',
        serialNumber: 'SN-88445',
        status: 'bought',
        cost: 45000,
        warranty: '2025-08-15',
        station: null,
        client: null,
        installDate: null,
        lastService: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        equipmentId: 'EQ-006',
        name: 'Firewall',
        model: 'FW-Pro',
        serialNumber: 'SN-88449',
        status: 'installed',
        cost: 380000,
        warranty: null,
        station: 'Station B',
        client: 'TechStart Inc',
        installDate: '2023-08-15',
        lastService: '2024-07-10',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = await equipmentCollection.insertMany(sampleEquipment);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully seeded ${result.insertedCount} equipment items`,
        equipment: sampleEquipment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding equipment:', error);
    return NextResponse.json(
      { error: 'Failed to seed equipment' },
      { status: 500 }
    );
  }
}

