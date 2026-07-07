import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';
import { sendSMS } from '@/lib/sms';
import { accountTypeFromUser } from '@/lib/user-account-types';

const OTP_COLLECTION = 'expense_otp_codes';
const OTP_PURPOSE_SUBMIT = 'expense_submit';
const OTP_PURPOSE_APPROVE = 'expense_approve';
const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 500;

function secret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'expense-auth';
}

function hashOtp(code: string, userId: string): string {
  return crypto.createHash('sha256').update(`${userId}:${code}:${secret()}`).digest('hex');
}

function hashApproveOtp(code: string, userId: string, approvalToken: string): string {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${approvalToken}:${code}:${secret()}`)
    .digest('hex');
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isSuperAdminUser(user: {
  role?: string;
  accountType?: string;
  ispRole?: string;
}): boolean {
  return accountTypeFromUser(user) === 'superadmin';
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `***${digits.slice(-4)}`;
}

export async function getPendingExpenseByApprovalToken(approvalToken: string) {
  if (!approvalToken?.trim()) return null;

  const client = await clientPromise;
  const expense = await client.db('tixmgmt').collection('expenses').findOne({
    approvalToken: approvalToken.trim(),
  });

  if (!expense) return null;
  if (expense.approvalStatus === 'approved' || expense.status === 'fully-paid') return null;

  return expense;
}

function serializeExpenseSummary(expense: {
  id?: string;
  description?: string;
  category?: string;
  date?: Date | string;
  submittedByName?: string;
  approvalStatus?: string;
  status?: string;
}) {
  return {
    id: expense.id,
    description: expense.description || '',
    category: expense.category || '',
    date:
      expense.date instanceof Date
        ? expense.date.toISOString().split('T')[0]
        : String(expense.date || ''),
    submittedByName: expense.submittedByName || 'Unknown',
    approvalStatus: expense.approvalStatus || 'pending',
    status: expense.status || 'pending',
  };
}

/** Super admins only — names returned to client; identity resolved server-side by id. */
export async function listSubmitEligibleSuperAdmins(): Promise<{ id: string; name: string }[]> {
  const client = await clientPromise;
  const users = await client
    .db('tixmgmt')
    .collection('users')
    .find({
      approved: true,
      phone: { $exists: true, $nin: [null, ''] },
    })
    .project({ id: 1, name: 1, role: 1, accountType: 1, ispRole: 1 })
    .sort({ name: 1 })
    .toArray();

  return users
    .filter((u) => isSuperAdminUser(u))
    .map((u) => ({
      id: u.id || String(u._id),
      name: u.name || 'Super Admin',
    }));
}

/** Read-only DB lookup — never trusts client-supplied phone, email, or role. */
export async function getSubmitEligibleSuperAdminById(userId: string) {
  if (!userId?.trim()) return null;

  const client = await clientPromise;
  const user = await client.db('tixmgmt').collection('users').findOne({
    id: userId.trim(),
    approved: true,
    phone: { $exists: true, $nin: [null, ''] },
  });

  if (!user?.phone || !isSuperAdminUser(user)) return null;

  return user;
}

export async function sendExpenseSubmitOtpByUserId(userId: string): Promise<{ maskedPhone: string }> {
  const user = await getSubmitEligibleSuperAdminById(userId);
  if (!user?.phone) {
    throw new Error('Invalid selection.');
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const resolvedUserId = user.id || String(user._id);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.collection(OTP_COLLECTION).deleteMany({ userId: resolvedUserId, purpose: OTP_PURPOSE_SUBMIT });
  await db.collection(OTP_COLLECTION).insertOne({
    userId: resolvedUserId,
    purpose: OTP_PURPOSE_SUBMIT,
    codeHash: hashOtp(code, resolvedUserId),
    expiresAt,
    used: false,
    createdAt: new Date(),
  });

  await sendSMS({
    mobile: user.phone.trim(),
    msg: `Your 3ICONIC expense submission OTP is ${code}. Valid for 10 minutes. Do not share.`,
  });

  return { maskedPhone: maskPhone(user.phone) };
}

export async function verifyExpenseSubmitOtpByUserId(
  userId: string,
  code: string
): Promise<{ submitToken: string; name: string } | null> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;

  const user = await getSubmitEligibleSuperAdminById(userId);
  if (!user) return null;

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const resolvedUserId = user.id || String(user._id);
  const record = await db.collection(OTP_COLLECTION).findOne({
    userId: resolvedUserId,
    purpose: OTP_PURPOSE_SUBMIT,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record || record.codeHash !== hashOtp(trimmed, resolvedUserId)) return null;

  await db.collection(OTP_COLLECTION).updateOne(
    { _id: record._id },
    { $set: { used: true, usedAt: new Date() } }
  );

  const submitToken = createSubmitSessionToken(resolvedUserId, user.email);
  return {
    submitToken,
    name: user.name || 'Super Admin',
  };
}

export async function sendExpenseApproveOtpByUserId(
  userId: string,
  approvalToken: string
): Promise<{ maskedPhone: string }> {
  const expense = await getPendingExpenseByApprovalToken(approvalToken);
  if (!expense) {
    throw new Error('Invalid or expired approval link.');
  }

  const user = await getSubmitEligibleSuperAdminById(userId);
  if (!user?.phone) {
    throw new Error('Invalid selection.');
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const resolvedUserId = user.id || String(user._id);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const scopedToken = approvalToken.trim();

  await db.collection(OTP_COLLECTION).deleteMany({
    userId: resolvedUserId,
    purpose: OTP_PURPOSE_APPROVE,
    approvalToken: scopedToken,
  });
  await db.collection(OTP_COLLECTION).insertOne({
    userId: resolvedUserId,
    purpose: OTP_PURPOSE_APPROVE,
    approvalToken: scopedToken,
    codeHash: hashApproveOtp(code, resolvedUserId, scopedToken),
    expiresAt,
    used: false,
    createdAt: new Date(),
  });

  await sendSMS({
    mobile: user.phone.trim(),
    msg: `Your 3ICONIC expense approval OTP is ${code}. Valid for 10 minutes. Do not share.`,
  });

  return { maskedPhone: maskPhone(user.phone) };
}

export async function verifyExpenseApproveOtpByUserId(
  userId: string,
  code: string,
  approvalToken: string
): Promise<{ approveSessionToken: string; name: string; expense: ReturnType<typeof serializeExpenseSummary> } | null> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;

  const expense = await getPendingExpenseByApprovalToken(approvalToken);
  if (!expense) return null;

  const user = await getSubmitEligibleSuperAdminById(userId);
  if (!user) return null;

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const resolvedUserId = user.id || String(user._id);
  const scopedToken = approvalToken.trim();
  const record = await db.collection(OTP_COLLECTION).findOne({
    userId: resolvedUserId,
    purpose: OTP_PURPOSE_APPROVE,
    approvalToken: scopedToken,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record || record.codeHash !== hashApproveOtp(trimmed, resolvedUserId, scopedToken)) return null;

  await db.collection(OTP_COLLECTION).updateOne(
    { _id: record._id },
    { $set: { used: true, usedAt: new Date() } }
  );

  const approveSessionToken = createApproveSessionToken(resolvedUserId, user.email, scopedToken);
  return {
    approveSessionToken,
    name: user.name || 'Super Admin',
    expense: serializeExpenseSummary(expense),
  };
}

function createSubmitSessionToken(userId: string, email: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}|${email.toLowerCase()}|${exp}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function createApproveSessionToken(userId: string, email: string, approvalToken: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}|${email.toLowerCase()}|${approvalToken}|${exp}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

export function verifySubmitSessionToken(
  token: string
): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 4) return null;
    const [userId, email, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!userId || !email || !exp || Date.now() > exp) return null;
    const payload = `${userId}|${email}|${exp}`;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function verifyApproveSessionToken(
  token: string
): { userId: string; email: string; approvalToken: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 5) return null;
    const [userId, email, approvalToken, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!userId || !email || !approvalToken || !exp || Date.now() > exp) return null;
    const payload = `${userId}|${email}|${approvalToken}|${exp}`;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return { userId, email, approvalToken };
  } catch {
    return null;
  }
}

/** Re-read submitter from DB after token check — never trust token payload alone for writes. */
export async function resolveVerifiedSuperAdminSubmitter(submitToken: string) {
  const session = verifySubmitSessionToken(submitToken);
  if (!session) return null;

  const user = await getSubmitEligibleSuperAdminById(session.userId);
  if (!user) return null;

  const email = typeof user.email === 'string' ? user.email.toLowerCase() : session.email.toLowerCase();
  if (email !== session.email.toLowerCase()) return null;

  return {
    userId: user.id || String(user._id),
    email,
    name: user.name || 'Super Admin',
  };
}

/** Re-read approver from DB; session must match the expense approval token in the URL. */
export async function resolveVerifiedSuperAdminApprover(
  approveSessionToken: string,
  expectedApprovalToken: string
) {
  const session = verifyApproveSessionToken(approveSessionToken);
  if (!session) return null;
  if (session.approvalToken !== expectedApprovalToken.trim()) return null;

  const user = await getSubmitEligibleSuperAdminById(session.userId);
  if (!user) return null;

  const email = typeof user.email === 'string' ? user.email.toLowerCase() : session.email.toLowerCase();
  if (email !== session.email.toLowerCase()) return null;

  const expense = await getPendingExpenseByApprovalToken(expectedApprovalToken);
  if (!expense) return null;

  return {
    userId: user.id || String(user._id),
    email,
    name: user.name || 'Super Admin',
    expense,
  };
}

export async function validateExpenseCategoryFromDb(category: string): Promise<boolean> {
  const trimmed = category?.trim();
  if (!trimmed) return false;

  const client = await clientPromise;
  const doc = await client.db('tixmgmt').collection('expenseCategories').findOne({ name: trimmed });
  return Boolean(doc);
}

export function parseExpenseSubmitDate(date: string): Date | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function sanitizeExpenseDescription(description: string): string | null {
  const trimmed = description?.trim();
  if (!trimmed || trimmed.length > MAX_DESCRIPTION_LENGTH) return null;
  return trimmed;
}

export function createApprovalToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export const listSubmitEligibleAdmins = listSubmitEligibleSuperAdmins;
