import { checkPagePermission } from '@/lib/permissions';
import { Dashboard } from '@/components/dashboard/dashboard';

export default async function AdminDashboard() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin');
  
  return <Dashboard />;
}

