import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';
import { auth } from '@/auth';
import { sendStationTaskAssignmentSMS } from '@/lib/sms';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const tasksCollection = db.collection('stationTasks');

    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    const query: any = {};
    if (stationId) {
      query.stationId = stationId;
    }

    const tasks = await tasksCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching station tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user has add permission
    const hasAddPermission = await hasPagePermission('/admin/station-tasks', 'add');
    if (!hasAddPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create station tasks' },
        { status: 403 }
      );
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, stationId, stationName, description, technicianIds } = body;

    if (!title || !stationId || !stationName) {
      return NextResponse.json(
        { error: 'Title, station ID, and station name are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const tasksCollection = db.collection('stationTasks');
    const techniciansCollection = db.collection('technicians');

    // Fetch technician details if technicianIds are provided
    let technicians: Array<{ _id: string; name: string; phone: string }> = [];
    if (technicianIds && Array.isArray(technicianIds) && technicianIds.length > 0) {
      const { ObjectId } = await import('mongodb');
      const technicianObjects = technicianIds
        .filter((id: string) => ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));
      
      if (technicianObjects.length > 0) {
        const fetchedTechnicians = await techniciansCollection
          .find({ _id: { $in: technicianObjects } })
          .toArray();
        technicians = fetchedTechnicians.map((tech: any) => ({
          _id: tech._id.toString(),
          name: tech.name,
          phone: tech.phone || '',
        }));
      }
    }

    const task = {
      title: title.trim(),
      stationId,
      stationName: stationName.trim(),
      description: description?.trim() || '',
      status: 'pending' as const,
      technicians: technicians.map(tech => ({
        technicianId: tech._id,
        name: tech.name,
        phone: tech.phone,
      })),
      createdBy: session.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null as Date | null,
    };

    const result = await tasksCollection.insertOne(task);

    // Send SMS to assigned technicians
    if (technicians.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      technicians.forEach((tech) => {
        if (tech.phone) {
          sendStationTaskAssignmentSMS(
            tech.phone,
            title.trim(),
            stationName.trim(),
            stationId,
            description?.trim() || '',
            baseUrl
          ).catch((error) => {
            console.error(`Failed to send SMS to technician ${tech.name}:`, error);
            // Don't fail the request if SMS fails
          });
        }
      });
    }

    return NextResponse.json(
      { success: true, task: { ...task, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating station task:', error);
    return NextResponse.json(
      { error: 'Failed to create station task' },
      { status: 500 }
    );
  }
}

