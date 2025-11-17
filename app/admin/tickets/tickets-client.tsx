'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { TicketList } from '@/components/tickets/ticket-list';
import { TicketCharts } from '@/components/tickets/ticket-charts';

export default function TicketsPageClient() {
  const searchParams = useSearchParams();
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);
  const [initialStationFilter, setInitialStationFilter] = useState<string | null>(null);
  const [initialTicketId, setInitialTicketId] = useState<string | null>(null);

  useEffect(() => {
    const station = searchParams.get('station');
    const ticket = searchParams.get('ticket');
    if (station) {
      setInitialStationFilter(station);
    }
    if (ticket) {
      setInitialTicketId(ticket);
    }
  }, [searchParams]);

  const handleChartRefresh = () => {
    setChartRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full md:ml-72 flex-1 min-w-0">
        <Header />
        <main className="mt-16 md:mt-0 pr-2 sm:pr-4 md:pr-8 pt-2 sm:pt-4 md:pt-8 pb-2 sm:pb-4 md:pb-8 pl-2 sm:pl-4 md:pl-6 max-w-full overflow-x-hidden">
          <TicketCharts refreshTrigger={chartRefreshTrigger} />
          <div className="mt-4 sm:mt-8">
            <TicketList 
              onTicketUpdate={handleChartRefresh} 
              initialStationFilter={initialStationFilter}
              initialTicketId={initialTicketId}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

