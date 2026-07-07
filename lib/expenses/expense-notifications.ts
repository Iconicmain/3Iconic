import clientPromise from '@/lib/mongodb';
import { sendSMS } from '@/lib/sms';
import { accountTypeFromUser } from '@/lib/user-account-types';

async function getSuperAdminPhones(): Promise<string[]> {
  const client = await clientPromise;
  const users = await client
    .db('tixmgmt')
    .collection('users')
    .find({
      approved: true,
      phone: { $exists: true, $nin: [null, ''] },
    })
    .project({ phone: 1, role: 1, accountType: 1, ispRole: 1 })
    .toArray();

  const phones = new Set<string>();
  for (const user of users) {
    if (accountTypeFromUser(user) !== 'superadmin') continue;
    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (phone) phones.add(phone);
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
}): Promise<void> {
  const phones = await getSuperAdminPhones();
  if (phones.length === 0) {
    console.warn('[Expense SMS] No super admin phones for pending expense', params.expenseId);
    return;
  }

  const message = `Expense Approval Required\n\nID: ${params.expenseId}\nFrom: ${params.submittedByName}\nCategory: ${params.category}\nDate: ${params.date}\nDescription: ${params.description}\n\nApprove Expense: ${params.approvalUrl}\n\nIconic Fibre`;

  try {
    await sendSMS({ mobile: phones, msg: message });
    console.log(`[Expense SMS] Pending approval sent for ${params.expenseId}`);
  } catch (error) {
    console.error('[Expense SMS] Failed to notify super admins:', error);
  }
}

export async function notifyExpenseApproved(params: {
  expenseId: string;
  expenseType: string;
  approvedByName: string;
  submittedByName: string;
  submitterPhone?: string | null;
}): Promise<void> {
  const superAdminPhones = await getSuperAdminPhones();
  const message = `Expense ${params.expenseId} has been approved.\nType: ${params.expenseType}\nSubmitted by: ${params.submittedByName}\nApproved by: ${params.approvedByName}\n\nIconic Fibre`;

  const phones = new Set(superAdminPhones);
  const submitterPhone = params.submitterPhone?.trim();
  if (submitterPhone) phones.add(submitterPhone);

  if (phones.size === 0) {
    console.warn('[Expense SMS] No phones for approved expense notification', params.expenseId);
    return;
  }

  try {
    await sendSMS({ mobile: [...phones], msg: message });
    console.log(`[Expense SMS] Approval confirmation sent for ${params.expenseId}`);
  } catch (error) {
    console.error('[Expense SMS] Failed to send approval confirmation:', error);
  }
}
