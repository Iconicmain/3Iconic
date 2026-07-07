export type AccountType = 'superadmin' | 'admin' | 'technician' | 'customer_care';

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'customer_care', label: 'Customer Care' },
];

export function accountTypeLabel(type: AccountType | string): string {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type)?.label || String(type);
}

export function isSuperAdminAccount(user: {
  role?: string;
  accountType?: string;
  ispRole?: string;
}): boolean {
  if (user.role === 'superadmin') return true;
  if (user.accountType === 'superadmin') return true;
  if (user.ispRole === 'SUPER_ADMIN') return true;
  return false;
}

export function accountTypeFromUser(user: {
  role?: string;
  ispRole?: string;
  accountType?: string;
}): AccountType {
  if (user.accountType && ACCOUNT_TYPE_OPTIONS.some((o) => o.value === user.accountType)) {
    return user.accountType as AccountType;
  }
  if (user.role === 'superadmin') return 'superadmin';
  if (user.role === 'admin') return 'admin';
  if (user.ispRole === 'TECHNICIAN') return 'technician';
  if (user.ispRole === 'CUSTOMER_CARE') return 'customer_care';
  return 'technician';
}

export function applyAccountType(accountType: AccountType): {
  role: 'superadmin' | 'admin' | 'user';
  ispRole?: string;
  accountType: AccountType;
  autoApprove: boolean;
} {
  switch (accountType) {
    case 'superadmin':
      return { role: 'superadmin', ispRole: 'SUPER_ADMIN', accountType, autoApprove: true };
    case 'admin':
      return { role: 'admin', ispRole: undefined, accountType, autoApprove: true };
    case 'technician':
      return { role: 'user', ispRole: 'TECHNICIAN', accountType, autoApprove: true };
    case 'customer_care':
      return { role: 'user', ispRole: 'CUSTOMER_CARE', accountType, autoApprove: true };
  }
}

export function accountTypeRequiresPagePermissions(accountType: AccountType): boolean {
  return accountType === 'admin';
}

export function accountTypeSupportsStationAssignment(accountType: AccountType): boolean {
  return accountType === 'customer_care';
}

/** Users with any admin page grants still need at least one permission (legacy behavior). */
export function userNeedsAdminPagePermissions(
  accountType: AccountType,
  pagePermissions: { permissions?: string[] }[]
): boolean {
  if (accountTypeRequiresPagePermissions(accountType)) return true;
  return pagePermissions.some((p) => (p.permissions?.length || 0) > 0);
}

export function totalPagePermissionCount(pagePermissions: { permissions?: string[] }[]): number {
  return pagePermissions.reduce((acc, p) => acc + (p.permissions?.length || 0), 0);
}
