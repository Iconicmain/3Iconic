import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ManageRequestsPageClient from './manage-requests-client';

export default async function ManageRequestsPage() {
  // Server-side permission check - only super admin can access this page
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/admin/login');
  }

  // Check if user is super admin
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
      <ManageRequestsPageClient />
    </Suspense>
  );
}

