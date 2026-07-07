import { NextRequest, NextResponse } from 'next/server';
import { sendExpenseApproveOtpByUserId } from '@/lib/expenses/expense-submit-auth';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId?.trim()) {
      return NextResponse.json({ error: 'Select who you are' }, { status: 400 });
    }

    const { maskedPhone } = await sendExpenseApproveOtpByUserId(userId.trim(), token);
    return NextResponse.json({ success: true, maskedPhone });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 400 }
    );
  }
}
