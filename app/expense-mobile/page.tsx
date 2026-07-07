import { getOrCreateSubmitToken } from '@/lib/expenses/mobile-submit-token';
import {
  getExpenseMobileCategories,
  getExpenseMobileSubmitBootstrap,
} from '@/lib/expenses/expense-mobile-data';
import { ExpenseMobileSubmitLite } from '@/components/expenses/expense-mobile-submit-lite';

export const dynamic = 'force-dynamic';

export default async function ExpenseMobilePage() {
  const token = await getOrCreateSubmitToken();
  const [{ admins }, categories] = await Promise.all([
    getExpenseMobileSubmitBootstrap(token),
    getExpenseMobileCategories(),
  ]);

  return (
    <ExpenseMobileSubmitLite
      token={token}
      initialAdmins={admins}
      initialCategories={categories}
    />
  );
}
