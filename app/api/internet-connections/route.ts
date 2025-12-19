import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Check if user is superadmin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection('users');
    const connectionsCollection = db.collection('internetConnections');
    const stationsCollection = db.collection('stations');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can view internet connections' },
        { status: 403 }
      );
    }

    // Fetch all internet connections
    const connections = await connectionsCollection
      .find({})
      .sort({ station: 1 })
      .toArray();

    // Handle backward compatibility - convert old format to new format
    const normalizedConnections = connections.map((conn: any) => {
      // If old format exists (single string), convert to new format (array of objects)
      if (conn.starlinkEmail && !conn.starlinkEmails) {
        conn.starlinkEmails = [{ email: conn.starlinkEmail, password: '' }];
      } else if (Array.isArray(conn.starlinkEmails)) {
        // Convert string array to object array if needed
        conn.starlinkEmails = conn.starlinkEmails.map((item: any) => {
          if (typeof item === 'string') {
            return { email: item, password: '' };
          }
          return item;
        });
      }
      
      if (conn.vpnIp && !conn.vpnIps) {
        conn.vpnIps = [{ ip: conn.vpnIp, password: '' }];
      } else if (Array.isArray(conn.vpnIps)) {
        // Convert string array to object array if needed
        conn.vpnIps = conn.vpnIps.map((item: any) => {
          if (typeof item === 'string') {
            return { ip: item, password: '' };
          }
          return item;
        });
      }
      return conn;
    });

    // Get all stations to verify station names
    const stations = await stationsCollection.find({}).toArray();
    const stationNames = stations.map((s: any) => s.name);

    return NextResponse.json({ 
      connections: normalizedConnections,
      stations: stationNames,
      count: normalizedConnections.length 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching internet connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch internet connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is superadmin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admin can create internet connections' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { station, starlinkEmails, vpnIps } = body;

    if (!station) {
      return NextResponse.json(
        { error: 'Station is required' },
        { status: 400 }
      );
    }

    // Handle both array of objects and array of strings for backward compatibility
    let emailEntries: Array<{ email: string; password: string }> = [];
    if (Array.isArray(starlinkEmails)) {
      emailEntries = starlinkEmails
        .map((item: any) => {
          if (typeof item === 'string') {
            // Old format: just email string
            return { email: item.trim(), password: '' };
          } else if (item && item.email) {
            // New format: { email, password }
            return { email: item.email.trim(), password: item.password || '' };
          }
          return null;
        })
        .filter((item: any) => item && item.email);
    } else if (starlinkEmails) {
      // Single string for backward compatibility
      emailEntries = [{ email: starlinkEmails.trim(), password: '' }];
    }

    let ipEntries: Array<{ ip: string; password: string }> = [];
    if (Array.isArray(vpnIps)) {
      ipEntries = vpnIps
        .map((item: any) => {
          if (typeof item === 'string') {
            // Old format: just IP string
            return { ip: item.trim(), password: '' };
          } else if (item && item.ip) {
            // New format: { ip, password }
            return { ip: item.ip.trim(), password: item.password || '' };
          }
          return null;
        })
        .filter((item: any) => item && item.ip);
    } else if (vpnIps) {
      // Single string for backward compatibility
      ipEntries = [{ ip: vpnIps.trim(), password: '' }];
    }

    if (emailEntries.length === 0 && ipEntries.length === 0) {
      return NextResponse.json(
        { error: 'At least one Starlink email or VPN IP is required' },
        { status: 400 }
      );
    }

    // Validate all email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const entry of emailEntries) {
      if (!emailRegex.test(entry.email)) {
        return NextResponse.json(
          { error: `Invalid email format: ${entry.email}` },
          { status: 400 }
        );
      }
    }

    // Validate all IP formats
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    for (const entry of ipEntries) {
      if (!ipRegex.test(entry.ip)) {
        return NextResponse.json(
          { error: `Invalid IP address format: ${entry.ip}` },
          { status: 400 }
        );
      }
    }

    const connectionsCollection = db.collection('internetConnections');

    // Check if connection already exists for this station
    const existing = await connectionsCollection.findOne({ station: station.trim() });
    if (existing) {
      return NextResponse.json(
        { error: 'Internet connection already exists for this station. Please update the existing one.' },
        { status: 400 }
      );
    }

    const connection = {
      station: station.trim(),
      starlinkEmails: emailEntries,
      vpnIps: ipEntries,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await connectionsCollection.insertOne(connection);

    return NextResponse.json(
      { success: true, connection: { ...connection, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating internet connection:', error);
    return NextResponse.json(
      { error: 'Failed to create internet connection' },
      { status: 500 }
    );
  }
}

