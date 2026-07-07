import { NextRequest, NextResponse } from 'next/server';
import { verifyExpenseApproveOtpByUserId } from '@/lib/expenses/expense-submit-auth';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { userId, otp } = body;

    if (!userId?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Identity and OTP are required' }, { status: 400 });
    }

    const session = await verifyExpenseApproveOtpByUserId(userId.trim(), otp.trim(), token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      approveSessionToken: session.approveSessionToken,
      name: session.name,
      expense: session.expense,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
