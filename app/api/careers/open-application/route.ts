import { NextRequest, NextResponse } from 'next/server'
import { sendOpenApplicationEmail } from '@/lib/email'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract form fields
    const fullName = formData.get('fullName') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const email = formData.get('email') as string
    const location = formData.get('location') as string
    const expertise = JSON.parse((formData.get('expertise') as string) || '[]') as string[]
    const otherExpertise = formData.get('otherExpertise') as string
    const yearsExperience = formData.get('yearsExperience') as string
    const briefDescription = formData.get('briefDescription') as string
    const portfolioLink = formData.get('portfolioLink') as string

    // Validate required fields
    if (
      !fullName ||
      !phoneNumber ||
      !email ||
      !location ||
      !expertise ||
      expertise.length === 0 ||
      !yearsExperience ||
      !briefDescription
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Store application in database
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const openApplicationsCollection = db.collection('open_applications')

    // Build expertise array (include "Other" with value if selected)
    const finalExpertise = expertise.includes('Other')
      ? [...expertise.filter((e) => e !== 'Other'), otherExpertise]
      : expertise

    const application = {
      fullName,
      phoneNumber,
      email: email.toLowerCase(),
      location,
      expertise: finalExpertise,
      yearsExperience,
      briefDescription,
      portfolioLink: portfolioLink || null,
      cvFileName: cvFileData?.name || null,
      cvFileSize: cvFileData?.content.length || null,
      certificatesFileName: certificatesFileData?.name || null,
      certificatesFileSize: certificatesFileData?.content.length || null,
      // Tags for filtering
      tags: {
        roleCategories: finalExpertise,
        location: location,
        experienceLevel: yearsExperience,
        source: 'Open Application',
      },
      emailSent: false,
      emailError: null,
      status: 'pending', // pending, reviewed, contacted, archived
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await openApplicationsCollection.insertOne(application)
    const applicationId = result.insertedId

    console.log(`[Open Application] Stored in database with ID: ${applicationId}`)

    // Try to send email (but don't fail if it doesn't work)
    let emailResult = { success: false, error: 'Email not attempted' }

    try {
      emailResult = await sendOpenApplicationEmail({
        fullName,
        phoneNumber,
        email,
        location,
        expertise: finalExpertise,
        yearsExperience,
        briefDescription,
        portfolioLink: portfolioLink || null,
        cvFile: cvFileData,
        certificatesFile: certificatesFileData,
      })

      // Update application with email status
      await openApplicationsCollection.updateOne(
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
        console.log(`[Open Application] Email sent successfully for application ${applicationId}`)
      } else {
        console.warn(`[Open Application] Email failed for application ${applicationId}:`, emailResult.error)
      }
    } catch (emailError) {
      console.error(`[Open Application] Email error for application ${applicationId}:`, emailError)
      // Update application with email error
      await openApplicationsCollection.updateOne(
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
    return NextResponse.json({
      success: true,
      message: 'Open application submitted successfully',
      applicationId: applicationId.toString(),
      emailSent: emailResult.success,
      ...(process.env.NODE_ENV === 'development' && !emailResult.success
        ? {
            emailWarning:
              'Application saved, but email notification failed. Check server logs for details.',
          }
        : {}),
    })
  } catch (error) {
    console.error('Error processing open application:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your application' },
      { status: 500 }
    )
  }
}

