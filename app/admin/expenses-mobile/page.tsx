import { getOrCreateSubmitToken } from '@/lib/expenses/mobile-submit-token';
import { ExpenseMobileSubmit } from '@/components/expenses/expense-mobile-submit';

export default async function ExpensesMobilePage() {
  const token = await getOrCreateSubmitToken();
  return <ExpenseMobileSubmit token={token} />;
}
