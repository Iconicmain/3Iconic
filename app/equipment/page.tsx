'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { EquipmentTabs } from '@/components/equipment/equipment-tabs';
import { EquipmentCharts } from '@/components/equipment/equipment-charts';

export default function EquipmentPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEquipmentUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-w-0 max-w-full overflow-x-hidden">
        <Header />
        <main className="mt-32 md:mt-0 pr-3 sm:pr-4 md:pr-8 pt-3 sm:pt-4 md:pt-8 pb-3 sm:pb-4 md:pb-8 pl-3 sm:pl-4 md:pl-6 max-w-full overflow-x-hidden">
          <div className="max-w-full overflow-x-hidden">
            <EquipmentCharts refreshTrigger={refreshTrigger} />
            <div className="mt-4 sm:mt-6 md:mt-8 max-w-full overflow-x-hidden">
              <EquipmentTabs onEquipmentUpdate={handleEquipmentUpdate} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
