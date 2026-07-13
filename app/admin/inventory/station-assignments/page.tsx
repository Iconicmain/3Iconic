import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { Header } from '@/components/layout/header';
import { StationAssignmentsManager } from '@/components/inventory/station-assignments';

export const dynamic = 'force-dynamic';

export default async function StationAssignmentsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  const client = await clientPromise;
  const user = await client.db('tixmgmt').collection('users').findOne(
    { email: session.user.email.toLowerCase() },
    { projection: { role: 1 } }
  );

  if (user?.role !== 'superadmin') {
    redirect('/admin');
  }

  return (
    <>
      <Header />
      <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
        <StationAssignmentsManager />
      </main>
    </>
  );
}
