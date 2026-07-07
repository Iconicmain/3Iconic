import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';

const SETTINGS_KEY = 'expense_mobile_submit_token';

export async function getOrCreateSubmitToken(): Promise<string> {
  const envToken = process.env.EXPENSE_MOBILE_SUBMIT_TOKEN?.trim();
  if (envToken) return envToken;

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const col = db.collection('system_settings');

  const existing = await col.findOne({ key: SETTINGS_KEY });
  if (existing?.value) return existing.value as string;

  const token = crypto.randomBytes(32).toString('hex');
  await col.updateOne(
    { key: SETTINGS_KEY },
    { $set: { key: SETTINGS_KEY, value: token, updatedAt: new Date() } },
    { upsert: true }
  );
  return token;
}

export async function rotateSubmitToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const client = await clientPromise;
  await client.db('tixmgmt').collection('system_settings').updateOne(
    { key: SETTINGS_KEY },
    { $set: { key: SETTINGS_KEY, value: token, updatedAt: new Date() } },
    { upsert: true }
  );
  return token;
}

export async function validateSubmitToken(token: string): Promise<boolean> {
  if (!token?.trim()) return false;
  const expected = await getOrCreateSubmitToken();
  const a = Buffer.from(token.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
