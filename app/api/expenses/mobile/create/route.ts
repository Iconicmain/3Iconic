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

const MAX_BATCH_SIZE = 20;

type ExpenseInput = {
  description?: string;
  category?: string;
  date?: string;
};

function normalizeExpenseInputs(body: {
  description?: string;
  category?: string;
  date?: string;
  expenses?: ExpenseInput[];
}): ExpenseInput[] {
  if (Array.isArray(body.expenses) && body.expenses.length > 0) {
    return body.expenses;
  }

  if (body.description || body.category || body.date) {
    return [{ description: body.description, category: body.category, date: body.date }];
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submitToken } = body;
    const expenseInputs = normalizeExpenseInputs(body);

    const submitter = await resolveVerifiedSuperAdminSubmitter(submitToken);
    if (!submitter) {
      return NextResponse.json({ error: 'Session expired. Please verify OTP again.' }, { status: 403 });
    }

    if (expenseInputs.length === 0) {
      return NextResponse.json({ error: 'Add at least one expense' }, { status: 400 });
    }

    if (expenseInputs.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `You can submit up to ${MAX_BATCH_SIZE} expenses at once` },
        { status: 400 }
      );
    }

    const validatedExpenses: Array<{
      description: string;
      category: string;
      date: Date;
    }> = [];

    for (let i = 0; i < expenseInputs.length; i++) {
      const item = expenseInputs[i];
      const safeDescription = sanitizeExpenseDescription(item.description || '');
      const expenseDate = parseExpenseSubmitDate(item.date || '');
      const categoryName = item.category?.trim() || '';

      if (!safeDescription || !expenseDate || !categoryName) {
        return NextResponse.json(
          { error: `Expense ${i + 1}: description, category, and date are required` },
          { status: 400 }
        );
      }

      const categoryValid = await validateExpenseCategoryFromDb(categoryName);
      if (!categoryValid) {
        return NextResponse.json(
          { error: `Expense ${i + 1}: invalid category` },
          { status: 400 }
        );
      }

      validatedExpenses.push({
        description: safeDescription,
        category: categoryName,
        date: expenseDate,
      });
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCol = db.collection('expenses');

    const baseCount = await expensesCol.countDocuments();
    const now = new Date();
    const baseUrl = getExpenseMobileBaseUrl(request.headers.get('origin'));
    const submitUrl = getExpenseMobileSubmitUrl(baseUrl);

    const createdExpenses: Array<{
      id: string;
      description: string;
      category: string;
      date: Date;
      approvalToken: string;
    }> = [];

    for (let i = 0; i < validatedExpenses.length; i++) {
      const input = validatedExpenses[i];
      const expenseId = `EXP-${String(baseCount + 1 + i).padStart(3, '0')}`;
      const approvalToken = createApprovalToken();

      createdExpenses.push({
        id: expenseId,
        description: input.description,
        category: input.category,
        date: input.date,
        approvalToken,
      });
    }

    await expensesCol.insertMany(
      createdExpenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        category: expense.category,
        station: null,
        amount: 0,
        balance: undefined,
        date: expense.date,
        status: 'pending',
        expenseType: null,
        transactionCost: 0,
        sellerPin: null,
        submittedByEmail: submitter.email,
        submittedByName: submitter.name,
        submittedByUserId: submitter.userId,
        approvalToken: expense.approvalToken,
        approvalStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      }))
    );

    for (const expense of createdExpenses) {
      const approvalUrl = getExpenseMobileApprovalUrl(baseUrl, expense.approvalToken);
      const dateLabel = expense.date.toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      try {
        await notifySuperAdminsExpensePending({
          expenseId: expense.id,
          description: expense.description,
          category: expense.category,
          date: dateLabel,
          submittedByName: submitter.name,
          approvalUrl,
          submitUrl,
        });
      } catch (err) {
        console.error('[Expense Create SMS]', expense.id, err);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdExpenses.length,
      expenses: createdExpenses.map((expense) => ({
        id: expense.id,
        status: 'pending',
      })),
      expense: {
        id: createdExpenses[0].id,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[Mobile Expense Create]', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
