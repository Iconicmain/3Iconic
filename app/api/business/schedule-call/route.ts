import { NextRequest, NextResponse } from 'next/server'
import { sendScheduleCallEmail } from '@/lib/email'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { fullName, companyName, email, phone, preferredDate, preferredTime, message } = body

    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json({ error: 'Full name, email, and phone are required' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Store call request in database
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const callRequestsCollection = db.collection('call_requests')

    const callRequest = {
      fullName,
      companyName: companyName || null,
      email: email.toLowerCase(),
      phone,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      message: message || null,
      type: 'business_call',
      emailSent: false,
      emailError: null,
      status: 'pending', // pending, scheduled, completed, cancelled
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await callRequestsCollection.insertOne(callRequest)
    const requestId = result.insertedId

    console.log(`[Schedule Call] Stored in database with ID: ${requestId}`)

    // Try to send email (but don't fail if it doesn't work)
    let emailResult = { success: false, error: 'Email not attempted' }

    try {
      emailResult = await sendScheduleCallEmail({
        fullName,
        companyName: companyName || null,
        email,
        phone,
        preferredDate: preferredDate || null,
        preferredTime: preferredTime || null,
        message: message || null,
      })

      // Update request with email status
      await callRequestsCollection.updateOne(
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
        console.log(`[Schedule Call] Email sent successfully for request ${requestId}`)
      } else {
        console.warn(`[Schedule Call] Email failed for request ${requestId}:`, emailResult.error)
      }
    } catch (emailError) {
      console.error(`[Schedule Call] Email error for request ${requestId}:`, emailError)
      // Update request with email error
      await callRequestsCollection.updateOne(
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
      message: 'Call request submitted successfully',
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
    console.error('Error processing call request:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}

