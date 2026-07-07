import { checkPagePermission } from '@/lib/permissions';
import SettingsPageClient from './settings-client';

export default async function SettingsPage() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin/settings');
  
  return <SettingsPageClient />;
}
