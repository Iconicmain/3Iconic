import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/email'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { firstName, lastName, email, phone, subject, message } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Store contact form submission in database (optional but good for tracking)
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const contactSubmissionsCollection = db.collection('contact_submissions')

    const submission = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      subject,
      message,
      emailSent: false,
      emailError: null,
      status: 'new', // new, read, replied, archived
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await contactSubmissionsCollection.insertOne(submission)
    const submissionId = result.insertedId

    console.log(`[Contact Form] Stored in database with ID: ${submissionId}`)

    // Try to send email (but don't fail if it doesn't work)
    let emailResult = { success: false, error: 'Email not attempted' }

    try {
      emailResult = await sendContactFormEmail({
        firstName,
        lastName,
        email,
        phone,
        subject,
        message,
      })

      // Update submission with email status
      await contactSubmissionsCollection.updateOne(
        { _id: submissionId },
        {
          $set: {
            emailSent: emailResult.success,
            emailError: emailResult.success ? null : emailResult.error,
            updatedAt: new Date(),
          },
        }
      )

      if (emailResult.success) {
        console.log(`[Contact Form] Email sent successfully for submission ${submissionId}`)
      } else {
        console.warn(`[Contact Form] Email failed for submission ${submissionId}:`, emailResult.error)
      }
    } catch (emailError) {
      console.error(`[Contact Form] Email error for submission ${submissionId}:`, emailError)
      // Update submission with email error
      await contactSubmissionsCollection.updateOne(
        { _id: submissionId },
        {
          $set: {
            emailSent: false,
            emailError: emailError instanceof Error ? emailError.message : 'Unknown error',
            updatedAt: new Date(),
          },
        }
      )
    }

    // Always return success - submission is saved in database
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      submissionId: submissionId.toString(),
      emailSent: emailResult.success,
      ...(process.env.NODE_ENV === 'development' && !emailResult.success
        ? {
            emailWarning:
              'Message saved, but email notification failed. Check server logs for details.',
          }
        : {}),
    })
  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your message' },
      { status: 500 }
    )
  }
}

