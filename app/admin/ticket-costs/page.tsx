import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import TicketCostsClient from './ticket-costs-client';

export default async function TicketCostsPage() {
  // Check if user is super admin
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
  
  // Only super admin can access
  if (!user || user.role !== 'superadmin') {
    return (
      <div className="flex">
        <div className="md:ml-72 flex-1">
          <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Access denied. Only super admin can view this page.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <Suspense fallback={
      <div className="flex">
        <div className="md:ml-72 flex-1">
          <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    }>
      <TicketCostsClient />
    </Suspense>
  );
}

