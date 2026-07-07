import { NextRequest, NextResponse } from 'next/server';
import { validateSubmitToken } from '@/lib/expenses/mobile-submit-token';
import { sendExpenseSubmitOtpByUserId } from '@/lib/expenses/expense-submit-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token || !(await validateSubmitToken(token))) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 403 });
    }
    if (!userId?.trim()) {
      return NextResponse.json({ error: 'Select who you are' }, { status: 400 });
    }

    const { maskedPhone } = await sendExpenseSubmitOtpByUserId(userId.trim());
    return NextResponse.json({ success: true, maskedPhone });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 400 }
    );
  }
}
