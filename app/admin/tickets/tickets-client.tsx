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
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
          <TicketCharts refreshTrigger={chartRefreshTrigger} />
          <div className="mt-8">
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

