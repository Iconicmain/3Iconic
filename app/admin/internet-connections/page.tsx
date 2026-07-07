import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { InternetConnectionsClient } from './internet-connections-client';

export default async function InternetConnectionsPage() {
  // Check if user is superadmin
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const usersCollection = db.collection('users');

  const user = await usersCollection.findOne({
    email: session.user.email.toLowerCase(),
  });

  if (!user || user.role !== 'superadmin') {
    redirect('/admin/waiting-approval');
  }
  
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-w-0 max-w-full overflow-x-hidden">
        <Header />
        <main className="mt-32 md:mt-0 pr-2 sm:pr-4 md:pr-8 pt-2 sm:pt-4 md:pt-8 pb-2 sm:pb-4 md:pb-8 pl-2 sm:pl-4 md:pl-6 max-w-full overflow-x-hidden">
          <InternetConnectionsClient />
        </main>
      </div>
    </div>
  );
}

