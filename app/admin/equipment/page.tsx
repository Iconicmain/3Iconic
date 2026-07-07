import { checkPagePermission } from '@/lib/permissions';
import EquipmentPageClient from './equipment-client';

export default async function EquipmentPage() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin/equipment');
  
  return <EquipmentPageClient />;
}

