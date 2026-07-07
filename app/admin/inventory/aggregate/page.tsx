import { checkPagePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
<<<<<<< HEAD

export default async function InventoryAggregatePage() {
  await checkPagePermission('/admin/inventory/aggregate');
  redirect('/admin/inventory');
=======
import { canAccessSuperAdmin } from '@/lib/isp/permissions';
import { AggregatePageClient } from './aggregate-client';

export default async function InventoryAggregatePage() {
  await checkPagePermission('/admin/inventory/aggregate');

  if (!(await canAccessSuperAdmin())) {
    redirect('/admin/inventory');
  }

  return <AggregatePageClient />;
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
}
