export function getExpenseMobileBaseUrl(origin?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (origin) return origin.replace(/\/$/, '');
  return 'https://www.3iconic.co.ke';
}

export function getExpenseMobileSubmitUrl(baseUrl: string): string {
  return `${baseUrl}/expense-mobile`;
}

export function getExpenseMobileApprovalUrl(baseUrl: string, approvalToken: string): string {
  return `${baseUrl}/expense-mobile/approve/${approvalToken}`;
}
