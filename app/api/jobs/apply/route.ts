import { NextRequest, NextResponse } from 'next/server'
import { sendJobApplicationEmail } from '@/lib/email'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract form fields
    const jobId = formData.get('jobId') as string
    const jobTitle = formData.get('jobTitle') as string
    const fullName = formData.get('fullName') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const email = formData.get('email') as string
    const countyTown = formData.get('countyTown') as string
    const yearsExperience = formData.get('yearsExperience') as string

    // Validate required fields
    if (!jobId || !jobTitle || !fullName || !phoneNumber || !email || !countyTown || !yearsExperience) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Handle file uploads
    const cvFile = formData.get('cvFile') as File | null
    const certificatesFile = formData.get('certificatesFile') as File | null

    let cvFileData: { name: string; content: Buffer; contentType: string } | undefined
    let certificatesFileData: { name: string; content: Buffer; contentType: string } | undefined

    if (cvFile && cvFile.size > 0) {
      const arrayBuffer = await cvFile.arrayBuffer()
      cvFileData = {
        name: cvFile.name,
        content: Buffer.from(arrayBuffer),
        contentType: cvFile.type || 'application/pdf',
      }
    }

    if (certificatesFile && certificatesFile.size > 0) {
      const arrayBuffer = await certificatesFile.arrayBuffer()
      certificatesFileData = {
        name: certificatesFile.name,
        content: Buffer.from(arrayBuffer),
        contentType: certificatesFile.type || 'application/pdf',
      }
    }

    // Store application in database first (so it's saved even if email fails)
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const applicationsCollection = db.collection('job_applications')

    const application = {
      jobId: jobId, // Store job ID for tracking
      jobTitle,
      fullName,
      phoneNumber,
      email: email.toLowerCase(),
      countyTown,
      yearsExperience,
      cvFileName: cvFileData?.name || null,
      cvFileSize: cvFileData?.content.length || null,
      certificatesFileName: certificatesFileData?.name || null,
      certificatesFileSize: certificatesFileData?.content.length || null,
      emailSent: false, // Will be updated if email succeeds
      emailError: null,
      status: 'pending', // pending, reviewed, shortlisted, rejected
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await applicationsCollection.insertOne(application)
    const applicationId = result.insertedId

    console.log(`[Job Application] Stored in database with ID: ${applicationId}`)

    // Increment the job's application count
    try {
      const jobsCollection = db.collection('jobs')
      
      // Validate ObjectId format
      if (ObjectId.isValid(jobId)) {
        await jobsCollection.updateOne(
          { _id: new ObjectId(jobId) },
          { 
            $inc: { applications: 1 },
            $set: { updatedAt: new Date() }
          }
        )
        console.log(`[Job Application] Incremented application count for job ${jobId}`)
      } else {
        console.warn(`[Job Application] Invalid job ID format: ${jobId}`)
      }
    } catch (countError) {
      // Don't fail the application if count update fails
      console.error(`[Job Application] Failed to increment application count for job ${jobId}:`, countError)
    }

    // Try to send email (but don't fail if it doesn't work)
    let emailResult = { success: false, error: 'Email not attempted' }
    
    try {
      emailResult = await sendJobApplicationEmail({
        jobTitle,
        fullName,
        phoneNumber,
        email,
        countyTown,
        yearsExperience,
        cvFile: cvFileData,
        certificatesFile: certificatesFileData,
      })

      // Update application with email status
      await applicationsCollection.updateOne(
        { _id: applicationId },
        {
          $set: {
            emailSent: emailResult.success,
            emailError: emailResult.success ? null : emailResult.error,
            updatedAt: new Date(),
          },
        }
      )

      if (emailResult.success) {
        console.log(`[Job Application] Email sent successfully for application ${applicationId}`)
      } else {
        console.warn(`[Job Application] Email failed for application ${applicationId}:`, emailResult.error)
      }
    } catch (emailError) {
      console.error(`[Job Application] Email error for application ${applicationId}:`, emailError)
      // Update application with email error
      await applicationsCollection.updateOne(
        { _id: applicationId },
        {
          $set: {
            emailSent: false,
            emailError: emailError instanceof Error ? emailError.message : 'Unknown error',
            updatedAt: new Date(),
          },
        }
      )
    }

    // Always return success - application is saved in database
    // Email is a bonus, but not required
    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: applicationId.toString(),
      emailSent: emailResult.success,
      ...(process.env.NODE_ENV === 'development' && !emailResult.success ? {
        emailWarning: 'Application saved, but email notification failed. Check server logs for details.'
      } : {}),
    })
  } catch (error) {
    console.error('Error processing job application:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your application' },
      { status: 500 }
    )
  }
}

