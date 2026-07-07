import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { resolveVerifiedSuperAdminApprover } from '@/lib/expenses/expense-submit-auth';
import { notifyExpenseApproved } from '@/lib/expenses/expense-notifications';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const client = await clientPromise;
  const expense = await client.db('tixmgmt').collection('expenses').findOne({ approvalToken: token });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  if (expense.approvalStatus === 'approved' || expense.status === 'fully-paid') {
    return NextResponse.json({
      alreadyApproved: true,
      expenseId: expense.id,
    });
  }

  return NextResponse.json({ error: 'Verification required' }, { status: 403 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { approveSessionToken, expenseType, amount } = body;

    const approver = await resolveVerifiedSuperAdminApprover(approveSessionToken, token);
    if (!approver) {
      return NextResponse.json({ error: 'Session expired. Please verify OTP again.' }, { status: 403 });
    }

    if (!expenseType || !['recurrent', 'capital'].includes(expenseType)) {
      return NextResponse.json({ error: 'Select expense type (recurrent or capital)' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCol = db.collection('expenses');
    const expense = approver.expense;

    const stillPending = await expensesCol.findOne({
      approvalToken: token,
      approvalStatus: { $ne: 'approved' },
      status: { $ne: 'fully-paid' },
    });

    if (!stillPending) {
      return NextResponse.json({ error: 'This expense is already approved' }, { status: 409 });
    }

    await expensesCol.updateOne(
      { approvalToken: token },
      {
        $set: {
          expenseType,
          amount: parsedAmount,
          balance: 0,
          status: 'fully-paid',
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedByName: approver.name,
          approvedByUserId: approver.userId,
          updatedAt: new Date(),
        },
      }
    );

    let submitterPhone: string | null = null;
    if (expense.submittedByEmail) {
      const submitter = await db.collection('users').findOne({
        email: String(expense.submittedByEmail).toLowerCase(),
      });
      submitterPhone = typeof submitter?.phone === 'string' ? submitter.phone : null;
    }

    notifyExpenseApproved({
      expenseId: expense.id,
      expenseType: expenseType === 'capital' ? 'Capital' : 'Recurrent',
      approvedByName: approver.name,
      submittedByName: expense.submittedByName || 'Unknown',
      submitterPhone,
    }).catch(console.error);

    return NextResponse.json({ success: true, status: 'fully-paid' });
  } catch (error) {
    console.error('[Expense Approve]', error);
    return NextResponse.json({ error: 'Failed to approve expense' }, { status: 500 });
  }
}
