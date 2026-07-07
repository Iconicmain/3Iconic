import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  resolveVerifiedSuperAdminSubmitter,
  createApprovalToken,
  validateExpenseCategoryFromDb,
  parseExpenseSubmitDate,
  sanitizeExpenseDescription,
} from '@/lib/expenses/expense-submit-auth';
import { notifySuperAdminsExpensePending } from '@/lib/expenses/expense-notifications';
import {
  getExpenseMobileApprovalUrl,
  getExpenseMobileBaseUrl,
  getExpenseMobileSubmitUrl,
} from '@/lib/expenses/expense-mobile-urls';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submitToken, description, category, date } = body;

    const submitter = await resolveVerifiedSuperAdminSubmitter(submitToken);
    if (!submitter) {
      return NextResponse.json({ error: 'Session expired. Please verify OTP again.' }, { status: 403 });
    }

    const safeDescription = sanitizeExpenseDescription(description);
    const expenseDate = parseExpenseSubmitDate(date);

    if (!safeDescription || !expenseDate) {
      return NextResponse.json({ error: 'Description, category, and date are required' }, { status: 400 });
    }

    const categoryValid = await validateExpenseCategoryFromDb(category);
    if (!categoryValid) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCol = db.collection('expenses');

    const count = await expensesCol.countDocuments();
    const expenseId = `EXP-${String(count + 1).padStart(3, '0')}`;
    const approvalToken = createApprovalToken();
    const categoryName = category.trim();

    const expense = {
      id: expenseId,
      description: safeDescription,
      category: categoryName,
      station: null,
      amount: 0,
      balance: undefined,
      date: expenseDate,
      status: 'pending',
      expenseType: null,
      transactionCost: 0,
      sellerPin: null,
      submittedByEmail: submitter.email,
      submittedByName: submitter.name,
      submittedByUserId: submitter.userId,
      approvalToken,
      approvalStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await expensesCol.insertOne(expense);

    const baseUrl = getExpenseMobileBaseUrl(request.headers.get('origin'));
    const approvalUrl = getExpenseMobileApprovalUrl(baseUrl, approvalToken);
    const submitUrl = getExpenseMobileSubmitUrl(baseUrl);

    const dateLabel = expenseDate.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    try {
      await notifySuperAdminsExpensePending({
        expenseId,
        description: expense.description,
        category: expense.category,
        date: dateLabel,
        submittedByName: submitter.name,
        approvalUrl,
        submitUrl,
      });
    } catch (err) {
      console.error('[Expense Create SMS]', err);
    }

    return NextResponse.json({
      success: true,
      expense: {
        id: expenseId,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[Mobile Expense Create]', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
