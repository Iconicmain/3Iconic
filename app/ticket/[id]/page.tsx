import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { TicketViewClient } from './ticket-view-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: PageProps) {
  const { id } = await params;
  
  // Fetch ticket from database
  const client = await clientPromise;
  const db = client.db('tixmgmt');
  const ticketsCollection = db.collection('tickets');
  
  const ticket = await ticketsCollection.findOne({ ticketId: id });
  
  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h1>
          <p className="text-gray-600">The ticket you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Get session to check if user is authenticated
  const session = await auth();

  return (
    <TicketViewClient 
      ticket={JSON.parse(JSON.stringify(ticket))} 
      isAuthenticated={!!session?.user}
      userEmail={session?.user?.email || null}
    />
  );
}

