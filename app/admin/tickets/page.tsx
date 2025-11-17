import { checkPagePermission } from '@/lib/permissions';
import { Suspense } from 'react';
import TicketsPageClient from './tickets-client';

export default async function TicketsPage() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin/tickets');
  
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
      <TicketsPageClient />
    </Suspense>
  );
}

