import { getExpenseMobileApproveBootstrap } from '@/lib/expenses/expense-mobile-data';
import { ExpenseMobileApproveLite } from '@/components/expenses/expense-mobile-approve-lite';

export const dynamic = 'force-dynamic';

export default async function ExpenseApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bootstrap = await getExpenseMobileApproveBootstrap(token);

  if (bootstrap.status === 'not_found') {
    return (
      <div className="em-center">
        <div>
          <h1 className="em-title">Expense not found</h1>
          <p className="em-muted">This approval link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (bootstrap.status === 'already_approved') {
    return (
      <div className="em-center">
        <div>
          <h1 className="em-title">Already approved</h1>
          <p className="em-muted">Expense {bootstrap.expenseId} is fully paid.</p>
        </div>
      </div>
    );
  }

  return (
    <ExpenseMobileApproveLite
      token={token}
      initialAdmins={bootstrap.admins}
      initialExpenseId={bootstrap.expenseId}
    />
  );
}
