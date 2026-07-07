import clientPromise from '@/lib/mongodb';
import { sendSMS } from '@/lib/sms';
import { isSuperAdminAccount } from '@/lib/user-account-types';

export async function getSuperAdminPhoneNumbers(): Promise<string[]> {
  const client = await clientPromise;
  const users = await client
    .db('tixmgmt')
    .collection('users')
    .find({
      approved: true,
      phone: { $exists: true, $nin: [null, ''] },
    })
    .project({ phone: 1, role: 1, accountType: 1, ispRole: 1, name: 1, email: 1 })
    .toArray();

  const phones = new Set<string>();
  for (const user of users) {
    if (!isSuperAdminAccount(user)) continue;
    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (phone) phones.add(phone);
  }

  if (phones.size === 0) {
    console.warn(
      '[Expense SMS] No super admin phone numbers found. Ensure super admins are approved and have phone numbers in the users collection.'
    );
  } else {
    console.log(`[Expense SMS] Found ${phones.size} super admin phone number(s)`);
  }

  return [...phones];
}

export async function notifySuperAdminsExpensePending(params: {
  expenseId: string;
  description: string;
  category: string;
  date: string;
  submittedByName: string;
  approvalUrl: string;
  submitUrl: string;
}): Promise<void> {
  const phones = await getSuperAdminPhoneNumbers();
  if (phones.length === 0) {
    console.warn('[Expense SMS] Skipping pending notification — no super admin phones', params.expenseId);
    return;
  }

  const message = `Expense Approval Required\n\nID: ${params.expenseId}\nFrom: ${params.submittedByName}\nCategory: ${params.category}\nDate: ${params.date}\nDescription: ${params.description}\n\nApprove Expense: ${params.approvalUrl}\nSubmit Expense: ${params.submitUrl}\n\nIconic Fibre`;

  console.log(`[Expense SMS] Sending pending approval for ${params.expenseId} to ${phones.length} number(s)`);

  await sendSMS({ mobile: phones, msg: message });
  console.log(`[Expense SMS] Pending approval sent for ${params.expenseId}`);
}

export async function notifyExpenseApproved(params: {
  expenseId: string;
  expenseType: string;
  approvedByName: string;
  submittedByName: string;
  submitterPhone?: string | null;
  submitUrl?: string;
}): Promise<void> {
  const superAdminPhones = await getSuperAdminPhoneNumbers();
  const submitLine = params.submitUrl ? `\nSubmit Expense: ${params.submitUrl}` : '';
  const message = `Expense ${params.expenseId} has been approved.\nType: ${params.expenseType}\nSubmitted by: ${params.submittedByName}\nApproved by: ${params.approvedByName}${submitLine}\n\nIconic Fibre`;

  const phones = new Set(superAdminPhones);
  const submitterPhone = params.submitterPhone?.trim();
  if (submitterPhone) phones.add(submitterPhone);

  if (phones.size === 0) {
    console.warn('[Expense SMS] Skipping approval notification — no phones', params.expenseId);
    return;
  }

  console.log(`[Expense SMS] Sending approval confirmation for ${params.expenseId} to ${phones.size} number(s)`);

  await sendSMS({ mobile: [...phones], msg: message });
  console.log(`[Expense SMS] Approval confirmation sent for ${params.expenseId}`);
}
