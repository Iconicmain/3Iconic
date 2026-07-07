import clientPromise from '@/lib/mongodb';
import { listSubmitEligibleSuperAdmins } from '@/lib/expenses/expense-submit-auth';

export async function getExpenseMobileCategories(): Promise<string[]> {
  const client = await clientPromise;
  const categories = await client
    .db('tixmgmt')
    .collection('expenseCategories')
    .find({})
    .project({ name: 1 })
    .sort({ name: 1 })
    .toArray();

  return categories.map((c) => c.name).filter(Boolean);
}

export async function getExpenseMobileSubmitBootstrap(token: string) {
  const admins = await listSubmitEligibleSuperAdmins();
  return { token, admins };
}

export async function getExpenseMobileApproveBootstrap(approvalToken: string) {
  const client = await clientPromise;
  const expense = await client.db('tixmgmt').collection('expenses').findOne({
    approvalToken: approvalToken.trim(),
  });

  if (!expense) {
    return { status: 'not_found' as const };
  }

  if (expense.approvalStatus === 'approved' || expense.status === 'fully-paid') {
    return {
      status: 'already_approved' as const,
      expenseId: expense.id as string,
    };
  }

  const admins = await listSubmitEligibleSuperAdmins();
  return {
    status: 'ready' as const,
    expenseId: expense.id as string,
    admins,
  };
}
