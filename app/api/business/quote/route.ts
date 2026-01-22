import { NextRequest, NextResponse } from 'next/server'
import { sendBusinessQuoteEmail } from '@/lib/email'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { companyName, email, phone, requirements } = body

    // Validate required fields
    if (!companyName || !email || !phone || !requirements) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Store quote request in database
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const quoteRequestsCollection = db.collection('quote_requests')

    const quoteRequest = {
      companyName,
      email: email.toLowerCase(),
      phone,
      requirements,
      type: 'dedicated_link', // dedicated_link, business_plan, enterprise
      emailSent: false,
      emailError: null,
      status: 'pending', // pending, contacted, quoted, closed
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await quoteRequestsCollection.insertOne(quoteRequest)
    const requestId = result.insertedId

    console.log(`[Business Quote] Stored in database with ID: ${requestId}`)

    // Try to send email (but don't fail if it doesn't work)
    let emailResult = { success: false, error: 'Email not attempted' }

    try {
      emailResult = await sendBusinessQuoteEmail({
        companyName,
        email,
        phone,
        requirements,
      })

      // Update request with email status
      await quoteRequestsCollection.updateOne(
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
        console.log(`[Business Quote] Email sent successfully for request ${requestId}`)
      } else {
        console.warn(`[Business Quote] Email failed for request ${requestId}:`, emailResult.error)
      }
    } catch (emailError) {
      console.error(`[Business Quote] Email error for request ${requestId}:`, emailError)
      // Update request with email error
      await quoteRequestsCollection.updateOne(
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
      message: 'Quote request submitted successfully',
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
    console.error('Error processing quote request:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}

