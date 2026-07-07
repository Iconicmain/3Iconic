import { checkPagePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';

export default async function InventoryAggregatePage() {
  await checkPagePermission('/admin/inventory/aggregate');
  redirect('/admin/inventory');
}
