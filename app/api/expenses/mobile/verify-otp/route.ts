import { NextRequest, NextResponse } from 'next/server';
import { validateSubmitToken } from '@/lib/expenses/mobile-submit-token';
import { verifyExpenseSubmitOtpByUserId } from '@/lib/expenses/expense-submit-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, otp } = body;

    if (!token || !(await validateSubmitToken(token))) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 403 });
    }
    if (!userId?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Identity and OTP are required' }, { status: 400 });
    }

    const session = await verifyExpenseSubmitOtpByUserId(userId.trim(), otp.trim());
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      submitToken: session.submitToken,
      name: session.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
