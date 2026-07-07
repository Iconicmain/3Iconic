import { ExpenseApproveClient } from './expense-approve-client';

export default async function ExpenseApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ExpenseApproveClient token={token} />;
}
