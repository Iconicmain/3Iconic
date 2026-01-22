import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Helper to check if user is superadmin
async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.email) {
    return false
  }

  try {
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const usersCollection = db.collection('users')

    const user = await usersCollection.findOne({
      email: session.user.email.toLowerCase(),
    })

    return user?.role === 'superadmin'
  } catch (error) {
    return false
  }
}

// POST: Increment application count (public endpoint - anyone can apply)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }
    
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    // Check if job exists and is open
    const job = await jobsCollection.findOne({ _id: new ObjectId(id) })
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (job.status === 'closed') {
      return NextResponse.json({ error: 'This job is no longer accepting applications' }, { status: 400 })
    }
    
    // Increment application count
    const result = await jobsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $inc: { applications: 1 },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    )
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to update application count' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      applications: result.applications || 0 
    })
  } catch (error) {
    console.error('Error incrementing application count:', error)
    return NextResponse.json({ error: 'Failed to update application count' }, { status: 500 })
  }
}

// PUT: Manually set application count (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }
    
    const body = await request.json()
    const applications = parseInt(body.applications, 10)
    
    if (isNaN(applications) || applications < 0) {
      return NextResponse.json({ error: 'Invalid applications count' }, { status: 400 })
    }
    
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    const result = await jobsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          applications: applications,
          updatedAt: new Date() 
        }
      },
      { returnDocument: 'after' }
    )
    
    if (!result) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      applications: result.applications || 0 
    })
  } catch (error) {
    console.error('Error updating application count:', error)
    return NextResponse.json({ error: 'Failed to update application count' }, { status: 500 })
  }
}

