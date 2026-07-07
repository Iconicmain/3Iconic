import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';
import { sendSMS } from '@/lib/sms';
import { ISP_DB } from './models';

const OTP_COLLECTION = 'isp_otp_codes';
const OTP_PURPOSE = 'delete_stock';
const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(code: string, userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'otp-fallback';
  return crypto.createHash('sha256').update(`${userId}:${code}:${secret}`).digest('hex');
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `***${digits.slice(-4)}`;
}

export async function sendStockDeleteOtp(params: {
  userId: string;
  email: string;
  phone: string;
}): Promise<{ maskedPhone: string }> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const col = db.collection(OTP_COLLECTION);

  await col.deleteMany({ userId: params.userId, purpose: OTP_PURPOSE });

  await col.insertOne({
    userId: params.userId,
    email: params.email.toLowerCase(),
    purpose: OTP_PURPOSE,
    codeHash: hashOtp(code, params.userId),
    expiresAt,
    used: false,
    createdAt: new Date(),
  });

  await sendSMS({
    mobile: params.phone,
    msg: `Your 3ICONIC stock deletion OTP is ${code}. Valid for 10 minutes. Do not share this code.`,
  });

  return { maskedPhone: maskPhone(params.phone) };
}

export async function verifyStockDeleteOtp(userId: string, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;

  const client = await clientPromise;
  const db = client.db(ISP_DB);
  const col = db.collection(OTP_COLLECTION);

  const record = await col.findOne({
    userId,
    purpose: OTP_PURPOSE,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) return false;

  const expected = hashOtp(trimmed, userId);
  if (record.codeHash !== expected) return false;

  await col.updateOne({ _id: record._id }, { $set: { used: true, usedAt: new Date() } });
  return true;
}
