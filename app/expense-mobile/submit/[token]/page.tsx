import { ExpenseMobileSubmit } from '@/components/expenses/expense-mobile-submit';

export default async function ExpenseSubmitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ExpenseMobileSubmit token={token} />;
}
