import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Validate message length (SMS typically limited to 160 characters, but can be longer with concatenation)
    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Format phone number - ensure it has +254 prefix
    let formattedPhone = phoneNumber.trim();
    
    // Remove any existing + or spaces
    formattedPhone = formattedPhone.replace(/\+/g, '').replace(/\s/g, '');
    
    // Format phone number based on what it starts with
    if (formattedPhone.startsWith('254')) {
      // Already has country code, just add +
      formattedPhone = '+' + formattedPhone;
    } else if (formattedPhone.startsWith('0')) {
      // Kenyan local format, replace 0 with +254
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else {
      // Assume it's a local number without leading 0, add +254
      formattedPhone = '+254' + formattedPhone;
    }

    // Send SMS
    const result = await sendSMS({
      mobile: formattedPhone,
      msg: message,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'SMS sent successfully',
        result: result
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send SMS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

