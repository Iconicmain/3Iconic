import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { canAccessSuperAdmin, getIspUserContext } from '@/lib/isp/permissions';
import { sendStockDeleteOtp } from '@/lib/isp/stock-delete-otp';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    if (!(await canAccessSuperAdmin())) {
      return NextResponse.json({ error: 'Only super admins can delete stock' }, { status: 403 });
    }

    const ctx = await getIspUserContext();
    const session = await auth();
    if (!ctx || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const user = await db.collection('users').findOne(
      { email: session.user.email.toLowerCase() },
      { projection: { id: 1, phone: 1, role: 1 } }
    );

    if (!user?.phone?.trim()) {
      return NextResponse.json(
        { error: 'No phone number on your account. Add a phone number in User Management before deleting stock.' },
        { status: 400 }
      );
    }

    const userId = user.id || ctx.userId;
    const { maskedPhone } = await sendStockDeleteOtp({
      userId,
      email: session.user.email,
      phone: user.phone.trim(),
    });

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${maskedPhone}`,
      maskedPhone,
    });
  } catch (error) {
    console.error('[ISP Request Delete OTP]', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
