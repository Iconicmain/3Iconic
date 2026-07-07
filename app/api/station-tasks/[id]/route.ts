import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { hasPagePermission } from '@/lib/permissions';
import { auth } from '@/auth';
import { sendStationTaskAssignmentSMS } from '@/lib/sms';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if user has edit permission
    const hasEditPermission = await hasPagePermission('/admin/station-tasks', 'edit');
    if (!hasEditPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to update station tasks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, technicianIds } = body;

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const tasksCollection = db.collection('stationTasks');
    const techniciansCollection = db.collection('technicians');

    // Get existing task to check for new technician assignments
    const existingTask = await tasksCollection.findOne({ _id: new ObjectId(id) });
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Station task not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || '';
    }
    if (status !== undefined) {
      updateData.status = status;
      // Set completedAt when marking as done
      if (status === 'done') {
        updateData.completedAt = new Date();
      } else if (status === 'pending') {
        updateData.completedAt = null;
      }
    }

    // Handle technician assignment
    if (technicianIds !== undefined) {
      let technicians: Array<{ technicianId: string; name: string; phone: string }> = [];
      if (Array.isArray(technicianIds) && technicianIds.length > 0) {
        const technicianObjects = technicianIds
          .filter((techId: string) => ObjectId.isValid(techId))
          .map((techId: string) => new ObjectId(techId));
        
        if (technicianObjects.length > 0) {
          const fetchedTechnicians = await techniciansCollection
            .find({ _id: { $in: technicianObjects } })
            .toArray();
          technicians = fetchedTechnicians.map((tech: any) => ({
            technicianId: tech._id.toString(),
            name: tech.name,
            phone: tech.phone || '',
          }));
        }
      }
      updateData.technicians = technicians;

      // Send SMS to newly assigned technicians (only if technicians were added)
      const existingTechnicianIds = (existingTask.technicians || []).map((t: any) => t.technicianId);
      const newTechnicians = technicians.filter(
        (tech) => !existingTechnicianIds.includes(tech.technicianId)
      );

      if (newTechnicians.length > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const taskTitle = title !== undefined ? title.trim() : existingTask.title;
        const stationName = existingTask.stationName;
        const stationId = existingTask.stationId;
        const taskDescription = description !== undefined ? description?.trim() : (existingTask.description || '');

        newTechnicians.forEach((tech) => {
          if (tech.phone) {
            sendStationTaskAssignmentSMS(
              tech.phone,
              taskTitle,
              stationName,
              stationId,
              taskDescription,
              baseUrl
            ).catch((error) => {
              console.error(`Failed to send SMS to technician ${tech.name}:`, error);
            });
          }
        });
      }
    }

    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Station task not found' },
        { status: 404 }
      );
    }

    const updatedTask = await tasksCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { success: true, task: updatedTask },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating station task:', error);
    return NextResponse.json(
      { error: 'Failed to update station task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if user has delete permission
    const hasDeletePermission = await hasPagePermission('/admin/station-tasks', 'delete');
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete station tasks' },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const tasksCollection = db.collection('stationTasks');

    const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Station task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting station task:', error);
    return NextResponse.json(
      { error: 'Failed to delete station task' },
      { status: 500 }
    );
  }
}

