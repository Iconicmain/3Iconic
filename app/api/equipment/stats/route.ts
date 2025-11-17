import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const equipmentCollection = db.collection('equipment');

    const equipment = await equipmentCollection.find({}).toArray();

    // Calculate utilization distribution
    const utilizationData = [
      {
        name: 'Installed',
        value: equipment.filter((eq) => eq.status === 'installed').length,
      },
      {
        name: 'Available',
        value: equipment.filter((eq) => eq.status === 'available').length,
      },
      {
        name: 'In Repair',
        value: equipment.filter((eq) => eq.status === 'in-repair').length,
      },
      {
        name: 'Bought',
        value: equipment.filter((eq) => eq.status === 'bought').length,
      },
    ];

    // Calculate new equipment added per month (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentDate = new Date();
    const newEquipmentAdded = months.map((month, index) => {
      const monthIndex = currentDate.getMonth() - (5 - index);
      const year = monthIndex < 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      const actualMonth = monthIndex < 0 ? 12 + monthIndex : monthIndex;
      
      const count = equipment.filter((eq) => {
        if (!eq.createdAt) return false;
        const eqDate = new Date(eq.createdAt);
        return eqDate.getMonth() === actualMonth && eqDate.getFullYear() === year;
      }).length;

      return { month, added: count };
    });

    // Calculate equipment installed per station
    const installedEquipment = equipment.filter((eq) => eq.status === 'installed');
    const stationMap = new Map<string, number>();
    
    installedEquipment.forEach((eq) => {
      const station = eq.station && eq.station.trim() ? eq.station.trim() : 'Unassigned';
      stationMap.set(station, (stationMap.get(station) || 0) + 1);
    });

    // Convert to array and sort by count (descending)
    const equipmentPerStation = Array.from(stationMap.entries())
      .map(([station, installed]) => ({ station, installed }))
      .sort((a, b) => b.installed - a.installed);
    
    // Ensure we always return an array, even if empty
    console.log('Equipment per station:', equipmentPerStation);

    return NextResponse.json(
      {
        utilizationData,
        newEquipmentAdded,
        equipmentPerStation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching equipment stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment stats' },
      { status: 500 }
    );
  }
}

