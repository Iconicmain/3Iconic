'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Users,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { StockTab } from './components/command-center/stock-tab';
import { ActivitySidebar } from './components/command-center/activity-sidebar';
import { IssueReturnSection } from './components/issue-return-section';
import { CableReturnsPanel } from './components/command-center/cable-returns-panel';
import { TransfersTab } from './components/command-center/transfers-tab';
import { ReportsTab } from './components/command-center/reports-tab';
import { TechniciansTab } from './components/command-center/technicians-tab';
import type { ActivityItem, StationComparison } from './components/command-center/reports-tab';

const ALL_STATIONS = 'all';

interface Station {
  id: string;
  _id?: string;
  stationName: string;
  code: string;
  location: string;
}

interface DashboardSummary {
  totalStations: number;
  totalActiveItems: number;
  lowStockItems: number;
  issuedToday: number;
  returnedToday: number;
  pendingReturns: number;
  cableAvailable: number;
  techniciansActiveToday: number;
}

interface InventoryClientProps {
  stations: Station[];
  allStationsForSelection?: Station[];
  defaultStationId: string | null;
  isSuperAdmin: boolean;
}

function StatCard({
  title,
  value,
  icon,
  loading,
  warn,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className={warn ? 'border-amber-300 dark:border-amber-800' : ''}>
      <CardContent className="p-3 flex items-center gap-2.5">
        <div
          className={`p-1.5 rounded-lg shrink-0 ${
            warn
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight truncate">{loading ? '…' : value}</p>
          <p className="text-[11px] text-muted-foreground truncate">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryStationPage({
  stations,
  allStationsForSelection = [],
  defaultStationId,
  isSuperAdmin,
}: InventoryClientProps) {
  const stationList = allStationsForSelection.length > 0 ? allStationsForSelection : stations;
  const initialStation = isSuperAdmin ? ALL_STATIONS : (defaultStationId || stations[0]?.id || null);

  const [stationId, setStationId] = useState<string | null>(initialStation);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [stationComparison, setStationComparison] = useState<StationComparison[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [refreshKey, setRefreshKey] = useState(0);

  const isAllStations = stationId === ALL_STATIONS;
  const currentStation = stations.find((s) => s.id === stationId);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    const activityUrl = isAllStations
      ? '/api/isp/activity?limit=30'
      : `/api/isp/activity?stationId=${stationId}&limit=30`;
    Promise.all([
      fetch(`/api/isp/dashboard-summary?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(activityUrl, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([sum, act]) => {
        if (sum.error) throw new Error(sum.error as string);
        setSummary(sum.summary as DashboardSummary);
        setStationComparison((sum.stationComparison as StationComparison[]) || []);
        setActivities((act.activities as ActivityItem[]) || []);
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load data');
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [stationId, isAllStations, refreshKey]);

  if (stations.length === 0) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="md:ml-72 flex-1">
          <Header />
          <main className="mt-32 sm:mt-36 md:mt-0 px-4 md:px-6 lg:px-8 pt-6 pb-8">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <p className="font-semibold mb-2">No Stations</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create stations from the Stations page to use inventory.
                </p>
                <Button asChild><a href="/admin/stations">Go to Stations</a></Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
        <Header />
        <main className="mt-32 sm:mt-36 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-5 pb-8">
          {/* Command bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAllStations
                  ? 'All stations — unified stock view'
                  : `${currentStation?.stationName || 'Station'} operations`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={stationId || ''} onValueChange={setStationId}>
                <SelectTrigger className="w-full sm:w-[210px] bg-background">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value={ALL_STATIONS}>All Stations</SelectItem>}
                  {stations.map((s, i) => (
                    <SelectItem key={s._id || s.id || String(i)} value={String(s.id)}>
                      {s.stationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={refresh} className="shrink-0" title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
            <StatCard title="Active Items" value={summary?.totalActiveItems ?? '-'} icon={<Package className="h-3.5 w-3.5" />} loading={loading} />
            <StatCard title="Low Stock" value={summary?.lowStockItems ?? '-'} icon={<AlertTriangle className="h-3.5 w-3.5" />} loading={loading} warn={!!summary && summary.lowStockItems > 0} />
            <StatCard title="Issued Today" value={summary?.issuedToday ?? '-'} icon={<ArrowUpCircle className="h-3.5 w-3.5" />} loading={loading} />
            <StatCard title="Pending Returns" value={summary?.pendingReturns ?? '-'} icon={<ArrowDownCircle className="h-3.5 w-3.5" />} loading={loading} warn={!!summary && summary.pendingReturns > 0} />
            <StatCard title="Cable (m)" value={summary ? `${summary.cableAvailable.toLocaleString()}m` : '-'} icon={<Package className="h-3.5 w-3.5" />} loading={loading} />
            <StatCard title="Techs Today" value={summary?.techniciansActiveToday ?? '-'} icon={<Users className="h-3.5 w-3.5" />} loading={loading} />
          </div>

          {/* Main layout: tabs + sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">
            <div className="min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 mb-3 bg-white dark:bg-slate-900 border">
                  <TabsTrigger value="stock" className="flex-1 sm:flex-initial px-3 text-sm">Stock</TabsTrigger>
                  <TabsTrigger value="movement" className="flex-1 sm:flex-initial px-3 text-sm">Movement</TabsTrigger>
                  <TabsTrigger value="returns" className="flex-1 sm:flex-initial px-3 text-sm">
                    Returns
                    {!!summary?.pendingReturns && (
                      <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">{summary.pendingReturns}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="transfers" className="flex-1 sm:flex-initial px-3 text-sm">Transfers</TabsTrigger>
                  <TabsTrigger value="reports" className="flex-1 sm:flex-initial px-3 text-sm">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="stock" className="space-y-3 mt-0">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background h-9"
                      />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-full sm:w-[130px] bg-background h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Materials">Materials</SelectItem>
                        <SelectItem value="Drop Cable">Drop Cable</SelectItem>
                        <SelectItem value="Fiber Cable">Fiber Cable</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterUnit} onValueChange={setFilterUnit}>
                      <SelectTrigger className="w-full sm:w-[90px] bg-background h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All units</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={filterLowStock ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterLowStock(!filterLowStock)}
                      className="h-9"
                    >
                      Low stock
                    </Button>
                  </div>

                  {stationId ? (
                    <StockTab
                      stationId={stationId}
                      stations={stationList}
                      isAllStations={isAllStations}
                      searchQuery={searchQuery}
                      filterCategory={filterCategory}
                      filterUnit={filterUnit}
                      filterLowStock={filterLowStock}
                      refreshKey={refreshKey}
                      onRefresh={refresh}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="movement" className="mt-0">
                  {isAllStations ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground text-sm">
                        Select a station to issue equipment or cable.
                      </CardContent>
                    </Card>
                  ) : stationId ? (
                    <IssueReturnSection
                      stationId={stationId}
                      mode="issue"
                      onRefresh={refresh}
                      refreshKey={refreshKey}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="returns" className="space-y-4 mt-0">
                  {isAllStations ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground text-sm">
                        Select a station to process returns.
                      </CardContent>
                    </Card>
                  ) : stationId ? (
                    <>
                      <IssueReturnSection
                        stationId={stationId}
                        mode="return"
                        onRefresh={refresh}
                        refreshKey={refreshKey}
                      />
                      <CableReturnsPanel
                        stationId={stationId}
                        refreshKey={refreshKey}
                        onRefresh={refresh}
                      />
                    </>
                  ) : null}
                </TabsContent>

                <TabsContent value="transfers" className="mt-0">
                  <TransfersTab
                    stations={stationList}
                    stationId={stationId || ALL_STATIONS}
                    refreshKey={refreshKey}
                    onRefresh={refresh}
                  />
                </TabsContent>

                <TabsContent value="reports" className="space-y-4 mt-0">
                  <ReportsTab
                    stationComparison={stationComparison}
                    activities={activities}
                    onSelectStation={(id) => {
                      setStationId(id);
                      setActiveTab('stock');
                    }}
                    isAllStations={isAllStations}
                  />
                  <TechniciansTab
                    stationId={stationId || ALL_STATIONS}
                    stations={stations}
                    refreshKey={refreshKey}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <aside className="hidden xl:block">
              <ActivitySidebar activities={activities} summary={summary} loading={loading} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
