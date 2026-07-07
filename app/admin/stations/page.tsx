import { checkPagePermission } from '@/lib/permissions';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { StationGrid } from '@/components/stations/station-grid';
import { StationCharts } from '@/components/stations/station-charts';

export default async function StationsPage() {
  // Server-side permission check - redirects if not authorized
  await checkPagePermission('/admin/stations');
  
  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
          <StationCharts />
          <div className="mt-8">
            <StationGrid />
          </div>
        </main>
      </div>
    </div>
  );
}

