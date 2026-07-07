import { NextRequest, NextResponse } from 'next/server'
import { sendCoverageRequestEmail } from '@/lib/email'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { fullName, email, phone, location, message } = body

    // Validate required fields
    if (!fullName || !email || !phone || !location) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Store coverage request in database
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const coverageRequestsCollection = db.collection('coverage_requests')

    const coverageRequest = {
      fullName,
      email: email.toLowerCase(),
      phone,
      location,
      message: message || null,
      emailSent: false,
      emailError: null,
      status: 'pending', // pending, notified, contacted, archived
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await coverageRequestsCollection.insertOne(coverageRequest)
    const requestId = result.insertedId

    console.log(`[Coverage Request] Stored in database with ID: ${requestId}`)

    // Try to send email (but don't fail if it doesn't work)
    let emailResult = { success: false, error: 'Email not attempted' }

    try {
      emailResult = await sendCoverageRequestEmail({
        fullName,
        email,
        phone,
        location,
        message: message || null,
      })

      // Update request with email status
      await coverageRequestsCollection.updateOne(
        { _id: requestId },
        {
          $set: {
            emailSent: emailResult.success,
            emailError: emailResult.success ? null : emailResult.error,
            updatedAt: new Date(),
          },
        }
      )

      if (emailResult.success) {
        console.log(`[Coverage Request] Email sent successfully for request ${requestId}`)
      } else {
        console.warn(`[Coverage Request] Email failed for request ${requestId}:`, emailResult.error)
      }
    } catch (emailError) {
      console.error(`[Coverage Request] Email error for request ${requestId}:`, emailError)
      // Update request with email error
      await coverageRequestsCollection.updateOne(
        { _id: requestId },
        {
          $set: {
            emailSent: false,
            emailError: emailError instanceof Error ? emailError.message : 'Unknown error',
            updatedAt: new Date(),
          },
        }
      )
    }

    // Always return success - request is saved in database
    return NextResponse.json({
      success: true,
      message: 'Coverage request submitted successfully',
      requestId: requestId.toString(),
      emailSent: emailResult.success,
      ...(process.env.NODE_ENV === 'development' && !emailResult.success
        ? {
            emailWarning:
              'Request saved, but email notification failed. Check server logs for details.',
          }
        : {}),
    })
  } catch (error) {
    console.error('Error processing coverage request:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}

