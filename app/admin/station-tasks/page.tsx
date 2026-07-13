import { checkPagePermission } from '@/lib/permissions';
import StationTasksClient from './station-tasks-client';

export default async function StationTasksPage() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin/station-tasks');
  
  return <StationTasksClient />;
}

