import { checkPagePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { canAccessSuperAdmin } from '@/lib/isp/permissions';
import { AggregatePageClient } from './aggregate-client';

export default async function InventoryAggregatePage() {
  await checkPagePermission('/admin/inventory/aggregate');

  if (!(await canAccessSuperAdmin())) {
    redirect('/admin/inventory');
  }

  return <AggregatePageClient />;
}
