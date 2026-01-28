import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const visitsCollection = db.collection('careersPageVisits');

    // Get client IP and user agent for basic tracking
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create visit record
    const visit = {
      timestamp: new Date(),
      ip: ip.split(',')[0].trim(), // Get first IP if multiple (from proxy)
      userAgent,
      createdAt: new Date(),
    };

    // Insert visit
    await visitsCollection.insertOne(visit);

    return NextResponse.json(
      { success: true, message: 'Visit tracked' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error tracking careers page visit:', error);
    // Don't fail the page load if tracking fails
    return NextResponse.json(
      { success: false, error: 'Failed to track visit' },
      { status: 500 }
    );
  }
}

