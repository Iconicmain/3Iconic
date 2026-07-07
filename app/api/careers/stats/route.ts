import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Check if user has admin permissions
    const hasPermission = await hasPagePermission('/admin');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const visitsCollection = db.collection('careersPageVisits');

    // Get total visits
    const totalVisits = await visitsCollection.countDocuments();

    // Get visits in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const visitsLast30Days = await visitsCollection.countDocuments({
      timestamp: { $gte: thirtyDaysAgo }
    });

    // Get visits in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const visitsLast7Days = await visitsCollection.countDocuments({
      timestamp: { $gte: sevenDaysAgo }
    });

    // Get visits today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const visitsToday = await visitsCollection.countDocuments({
      timestamp: { $gte: todayStart }
    });

    // Get monthly visits for the last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyVisits = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      const nextMonth = new Date(year, monthIndex + 1, 1);

      const count = await visitsCollection.countDocuments({
        timestamp: {
          $gte: date,
          $lt: nextMonth
        }
      });

      monthlyVisits.push({
        month: months[monthIndex],
        visits: count
      });
    }

    return NextResponse.json({
      totalVisits,
      visitsLast30Days,
      visitsLast7Days,
      visitsToday,
      monthlyVisits,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching careers visit stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visit statistics' },
      { status: 500 }
    );
  }
}

