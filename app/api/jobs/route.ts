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

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const isAdmin = await isSuperAdmin()
    
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    // Return all jobs (including closed) - let frontend decide what to show
    const query = {}
    
    const jobs = await jobsCollection.find(query).toArray()
    
    // Convert MongoDB _id to id and format dates - use custom id if it exists, otherwise use _id
    const formattedJobs = jobs.map((job) => {
      // Helper to safely convert dates
      const formatDate = (date: any): string => {
        if (!date) return new Date().toISOString()
        if (date instanceof Date) return date.toISOString()
        if (typeof date === 'string') return date
        return new Date().toISOString()
      }
      
      return {
        id: job.id || job._id?.toString() || '',
        title: job.title || '',
        department: job.department || '',
        location: job.location || '',
        type: job.type || '',
        description: job.description || '',
        requirements: job.requirements || [],
        benefits: job.benefits || [],
        salary: job.salary || '',
        experience: job.experience || '',
        applicationDeadline: job.applicationDeadline || '',
        responsibilities: job.responsibilities || [],
        skills: job.skills || [],
        applicationEmail: job.applicationEmail || '',
        status: job.status || 'open',
        applications: job.applications || 0,
        postedDate: formatDate(job.postedDate || job.createdAt),
        createdAt: formatDate(job.createdAt),
        updatedAt: formatDate(job.updatedAt),
      }
    })
    
    return NextResponse.json(formattedJobs)
  } catch (error: any) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch jobs',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const jobsCollection = db.collection('jobs')
    
    const newJob = {
      title: body.title,
      department: body.department,
      location: body.location,
      type: body.type,
      description: body.description,
      requirements: body.requirements || [],
      benefits: body.benefits || [],
      salary: body.salary || '',
      experience: body.experience || '',
      applicationDeadline: body.applicationDeadline || '',
      responsibilities: body.responsibilities || [],
      skills: body.skills || [],
      applicationEmail: body.applicationEmail || '',
      status: body.status || 'open',
      applications: 0,
      postedDate: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await jobsCollection.insertOne(newJob)
    
    return NextResponse.json({
      id: result.insertedId.toString(),
      ...newJob,
      postedDate: newJob.postedDate,
      createdAt: newJob.createdAt.toISOString(),
      updatedAt: newJob.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

