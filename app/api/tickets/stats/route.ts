import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    // Get all tickets
    const tickets = await ticketsCollection.find({}).toArray();

    // Calculate monthly volume (group by week of month)
    const monthlyVolume = calculateMonthlyVolume(tickets);
    
    // Calculate category distribution
    const categoryDistribution = calculateCategoryDistribution(tickets);
    
    // Calculate average resolution time (group by week)
    const resolutionTime = calculateResolutionTime(tickets);

    return NextResponse.json({
      monthlyVolume,
      categoryDistribution,
      resolutionTime,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket statistics' },
      { status: 500 }
    );
  }
}

function calculateMonthlyVolume(tickets: any[]) {
  // Group all tickets by their week of the month (regardless of which month/year)
  // This ensures all tickets show up in the chart
  const weeks: { [key: string]: number } = {
    'Week 1': 0,
    'Week 2': 0,
    'Week 3': 0,
    'Week 4': 0,
  };

  tickets.forEach((ticket) => {
    const ticketDate = new Date(ticket.dateTimeReported || ticket.createdAt);
    
    // Check if date is valid
    if (isNaN(ticketDate.getTime())) {
      return; // Skip invalid dates
    }
    
    const dayOfMonth = ticketDate.getDate();
    
    // Group by week of month (1-7, 8-14, 15-21, 22+)
    if (dayOfMonth <= 7) {
      weeks['Week 1']++;
    } else if (dayOfMonth <= 14) {
      weeks['Week 2']++;
    } else if (dayOfMonth <= 21) {
      weeks['Week 3']++;
    } else {
      weeks['Week 4']++;
    }
  });

  return [
    { month: 'Week 1', tickets: weeks['Week 1'] },
    { month: 'Week 2', tickets: weeks['Week 2'] },
    { month: 'Week 3', tickets: weeks['Week 3'] },
    { month: 'Week 4', tickets: weeks['Week 4'] },
  ];
}

function calculateCategoryDistribution(tickets: any[]) {
  const categoryCounts: { [key: string]: number } = {};
  
  tickets.forEach((ticket) => {
    const category = ticket.category || 'Other';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));
}

function calculateResolutionTime(tickets: any[]) {
  // For now, we'll simulate resolution time based on ticket age
  // In a real app, you'd have a resolvedAt field
  const now = new Date();
  const weeks: { [key: string]: number[] } = {
    'Week 1': [],
    'Week 2': [],
    'Week 3': [],
    'Week 4': [],
  };

  tickets.forEach((ticket) => {
    const ticketDate = new Date(ticket.dateTimeReported || ticket.createdAt);
    const dayOfMonth = ticketDate.getDate();
    
    let weekKey = '';
    if (dayOfMonth <= 7) {
      weekKey = 'Week 1';
    } else if (dayOfMonth <= 14) {
      weekKey = 'Week 2';
    } else if (dayOfMonth <= 21) {
      weekKey = 'Week 3';
    } else {
      weekKey = 'Week 4';
    }

    // Calculate hours since ticket was created (simulating resolution time)
    const hoursSinceCreation = (now.getTime() - ticketDate.getTime()) / (1000 * 60 * 60);
    // Cap at reasonable values (0-28 hours)
    const resolutionHours = Math.min(Math.max(hoursSinceCreation, 0), 28);
    
    if (weeks[weekKey]) {
      weeks[weekKey].push(resolutionHours);
    }
  });

  // Calculate average for each week
  return [
    { 
      week: 'Week 1', 
      hours: weeks['Week 1'].length > 0 
        ? Math.round(weeks['Week 1'].reduce((a, b) => a + b, 0) / weeks['Week 1'].length)
        : 0
    },
    { 
      week: 'Week 2', 
      hours: weeks['Week 2'].length > 0 
        ? Math.round(weeks['Week 2'].reduce((a, b) => a + b, 0) / weeks['Week 2'].length)
        : 0
    },
    { 
      week: 'Week 3', 
      hours: weeks['Week 3'].length > 0 
        ? Math.round(weeks['Week 3'].reduce((a, b) => a + b, 0) / weeks['Week 3'].length)
        : 0
    },
    { 
      week: 'Week 4', 
      hours: weeks['Week 4'].length > 0 
        ? Math.round(weeks['Week 4'].reduce((a, b) => a + b, 0) / weeks['Week 4'].length)
        : 0
    },
  ];
}

