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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    // Try to find by _id (ObjectId) first, then by custom id field
    let job = null
    if (ObjectId.isValid(id)) {
      job = await jobsCollection.findOne({ _id: new ObjectId(id) })
    }
    
    // If not found by _id, try custom id field
    if (!job) {
      job = await jobsCollection.findOne({ id: id })
    }
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    // Check if user is admin - if not, don't return closed jobs
    const isAdmin = await isSuperAdmin()
    const session = await auth()
    
    if (!isAdmin && !session?.user?.email) {
      // Public access - don't return closed jobs
      if (job.status === 'closed') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
    }
    
    // Format job response - use custom id if it exists, otherwise use _id
    const formattedJob = {
      id: job.id || job._id.toString(),
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description || '',
      roleOverview: job.roleOverview || '',
      requirements: job.requirements || [],
      minimumRequirements: job.minimumRequirements || [],
      niceToHave: job.niceToHave || [],
      benefits: job.benefits || [],
      salary: job.salary || '',
      experience: job.experience || '',
      applicationDeadline: job.applicationDeadline || '',
      responsibilities: job.responsibilities || [],
      skills: job.skills || [],
      applicationEmail: job.applicationEmail || '',
      safetyNote: job.safetyNote || '',
      status: job.status || 'open',
      applications: job.applications || 0,
      postedDate: job.postedDate || job.createdAt?.toISOString() || new Date().toISOString(),
      createdAt: job.createdAt?.toISOString(),
      updatedAt: job.updatedAt?.toISOString(),
    }
    
    return NextResponse.json(formattedJob)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    console.log('[PUT /api/jobs/[id]] Updating job:', id)
    
    const body = await request.json()
    console.log('[PUT /api/jobs/[id]] Update body:', body)
    
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    // Try to find job by _id (ObjectId) first, then by custom id field
    let existingJob = null
    let query: any = {}
    
    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) }
      existingJob = await jobsCollection.findOne(query)
      console.log('[PUT /api/jobs/[id]] Searched by _id:', id, 'Found:', !!existingJob)
    }
    
    // If not found by _id, try custom id field
    if (!existingJob) {
      query = { id: id }
      existingJob = await jobsCollection.findOne(query)
      console.log('[PUT /api/jobs/[id]] Searched by custom id:', id, 'Found:', !!existingJob)
    }
    
    // If still not found, list all job IDs for debugging
    if (!existingJob) {
      const allJobs = await jobsCollection.find({}).limit(10).toArray()
      const jobIds = allJobs.map(j => ({ 
        _id: j._id?.toString(), 
        customId: j.id,
        title: j.title 
      }))
      console.error('[PUT /api/jobs/[id]] Job not found. Looking for:', id)
      console.error('[PUT /api/jobs/[id]] Sample jobs in DB:', JSON.stringify(jobIds, null, 2))
      return NextResponse.json({ 
        error: `Job not found. The job with ID ${id} does not exist in the database.`,
        debug: process.env.NODE_ENV === 'development' ? { searchedId: id, sampleJobs: jobIds } : undefined
      }, { status: 404 })
    }
    
    console.log('[PUT /api/jobs/[id]] Existing job found:', existingJob.title, 'Current status:', existingJob.status, 'Query:', query, 'Has custom id:', !!existingJob.id)
    
    // Only allow updating specific fields - exclude id, createdAt, postedDate, applications
    const {
      id: _,
      createdAt: __,
      updatedAt: ___,
      postedDate: ____,
      applications: _____,
      ...rest
    } = body
    
    // Build update object with only allowed fields
    const updateFields: any = {
      updatedAt: new Date(),
    }
    
    // Only include fields that are actually provided and allowed
    const allowedFieldNames = [
      'title', 'department', 'location', 'type', 'description',
      'roleOverview', 'requirements', 'minimumRequirements', 'niceToHave',
      'benefits', 'salary', 'experience',
      'applicationDeadline', 'responsibilities', 'skills',
      'applicationEmail', 'safetyNote', 'status'
    ]
    
    allowedFieldNames.forEach(field => {
      if (field in rest) {
        updateFields[field] = rest[field]
      }
    })
    
    console.log('[PUT /api/jobs/[id]] Update fields:', updateFields)
    
    // Use updateOne with the same query we used to find the job
    const updateResult = await jobsCollection.updateOne(
      query,
      { 
        $set: updateFields
      }
    )
    
    console.log('[PUT /api/jobs/[id]] Update result:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    })
    
    if (updateResult.matchedCount === 0) {
      console.error('[PUT /api/jobs/[id]] Update failed - job not found')
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (updateResult.modifiedCount === 0) {
      console.warn('[PUT /api/jobs/[id]] Update succeeded but no changes were made (status might be the same)')
    }
    
    // Fetch the updated job using the same query
    const updatedJob = await jobsCollection.findOne(query)
    
    if (!updatedJob) {
      console.error('[PUT /api/jobs/[id]] Update succeeded but failed to fetch updated job')
      // Even if we can't fetch the updated job, the update succeeded
      // Return a success response with the status that was set
      return NextResponse.json({ 
        success: true,
        id: id,
        status: updateFields.status || existingJob.status,
        message: 'Job updated successfully'
      })
    }
    
    console.log('[PUT /api/jobs/[id]] Update successful, new status:', updatedJob.status)
    
    // Format response - use custom id if it exists, otherwise use _id
    // Safely handle all fields to prevent serialization errors
    const formattedJob = {
      id: updatedJob.id || updatedJob._id?.toString() || id,
      title: updatedJob.title || '',
      department: updatedJob.department || '',
      location: updatedJob.location || '',
      type: updatedJob.type || '',
      description: updatedJob.description || '',
      roleOverview: updatedJob.roleOverview || '',
      requirements: Array.isArray(updatedJob.requirements) ? updatedJob.requirements : [],
      minimumRequirements: Array.isArray(updatedJob.minimumRequirements) ? updatedJob.minimumRequirements : [],
      niceToHave: Array.isArray(updatedJob.niceToHave) ? updatedJob.niceToHave : [],
      benefits: Array.isArray(updatedJob.benefits) ? updatedJob.benefits : [],
      salary: updatedJob.salary || '',
      experience: updatedJob.experience || '',
      applicationDeadline: updatedJob.applicationDeadline || '',
      responsibilities: Array.isArray(updatedJob.responsibilities) ? updatedJob.responsibilities : [],
      skills: Array.isArray(updatedJob.skills) ? updatedJob.skills : [],
      applicationEmail: updatedJob.applicationEmail || '',
      safetyNote: updatedJob.safetyNote || '',
      status: updatedJob.status || 'open',
      applications: typeof updatedJob.applications === 'number' ? updatedJob.applications : 0,
      postedDate: updatedJob.postedDate 
        ? (updatedJob.postedDate instanceof Date ? updatedJob.postedDate.toISOString() : String(updatedJob.postedDate))
        : (updatedJob.createdAt instanceof Date ? updatedJob.createdAt.toISOString() : new Date().toISOString()),
      createdAt: updatedJob.createdAt instanceof Date ? updatedJob.createdAt.toISOString() : (updatedJob.createdAt ? String(updatedJob.createdAt) : undefined),
      updatedAt: updatedJob.updatedAt instanceof Date ? updatedJob.updatedAt.toISOString() : (updatedJob.updatedAt ? String(updatedJob.updatedAt) : new Date().toISOString()),
    }

    return NextResponse.json(formattedJob)
  } catch (error: any) {
    console.error('[PUT /api/jobs/[id]] Error updating job:', error)
    console.error('[PUT /api/jobs/[id]] Error stack:', error?.stack)
    console.error('[PUT /api/jobs/[id]] Error name:', error?.name)
    
    // Check if it's a MongoDB error
    if (error?.name === 'MongoServerError' || error?.code) {
      console.error('[PUT /api/jobs/[id]] MongoDB error code:', error?.code)
    }
    
    const errorMessage = error?.message || 'Failed to update job'
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        stack: error?.stack
      } : undefined
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    // Try to delete by _id (ObjectId) first, then by custom id field
    let result = null
    if (ObjectId.isValid(id)) {
      result = await jobsCollection.deleteOne({ _id: new ObjectId(id) })
    }
    
    // If not deleted by _id, try custom id field
    if (!result || result.deletedCount === 0) {
      result = await jobsCollection.deleteOne({ id: id })
    }
    
    if (!result || result.deletedCount === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
  }
}

