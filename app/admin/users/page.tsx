import { checkPagePermission } from '@/lib/permissions';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { UserManagement } from '@/components/users/user-management';

export default async function UsersPage() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin/users');
  
  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8">
          <UserManagement />
        </main>
      </div>
    </div>
  );
}

