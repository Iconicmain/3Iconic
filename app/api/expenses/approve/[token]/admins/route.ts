import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  listSubmitEligibleSuperAdmins,
  getPendingExpenseByApprovalToken,
} from '@/lib/expenses/expense-submit-auth';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const client = await clientPromise;
  const expense = await client.db('tixmgmt').collection('expenses').findOne({
    approvalToken: token,
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  if (expense.approvalStatus === 'approved' || expense.status === 'fully-paid') {
    return NextResponse.json({
      alreadyApproved: true,
      expenseId: expense.id,
    });
  }

  const pending = await getPendingExpenseByApprovalToken(token);
  if (!pending) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const admins = await listSubmitEligibleSuperAdmins();
  return NextResponse.json({
    alreadyApproved: false,
    expenseId: expense.id,
    admins,
  });
}
