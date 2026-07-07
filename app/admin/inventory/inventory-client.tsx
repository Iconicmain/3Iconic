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
  Cable,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { InventorySection } from './components/inventory-section';
import { IssueReturnSection } from './components/issue-return-section';
import { CableSection } from './components/cable-section';
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
  cableIssuedToday: number;
  cableReturnedToday?: number;
  cableUsedToday?: number;
  cableWastedToday?: number;
  techniciansActiveToday: number;
  damagedLostItems: number;
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
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            warn
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight truncate">{loading ? '…' : value}</p>
          <p className="text-xs text-muted-foreground truncate">{title}</p>
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
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [allItems, setAllItems] = useState<{ id: string; itemName: string; itemCode?: string; category?: string; quantityAvailable: number; minimumLevel: number; unitType?: string }[]>([]);

  const isAllStations = stationId === ALL_STATIONS;
  const currentStation = stations.find((s) => s.id === stationId);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    const activityUrl = isAllStations
      ? '/api/isp/activity?limit=30'
      : `/api/isp/activity?stationId=${stationId}&limit=30`;
    const fetches: Promise<Record<string, unknown>>[] = [
      fetch(`/api/isp/dashboard-summary?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(activityUrl, { cache: 'no-store' }).then((r) => r.json()),
    ];
    if (isAllStations) {
      fetches.push(fetch('/api/isp/inventory?stationId=all', { cache: 'no-store' }).then((r) => r.json()));
    }
    Promise.all(fetches)
      .then(([sum, act, inv]) => {
        if (sum.error) throw new Error(sum.error as string);
        setSummary(sum.summary as DashboardSummary);
        setStationComparison((sum.stationComparison as StationComparison[]) || []);
        setActivities((act.activities as ActivityItem[]) || []);
        if (inv) setAllItems((inv.items as typeof allItems) || []);
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load data');
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [stationId, isAllStations, refreshKey]);

  const handleSelectStationFromReport = (id: string) => {
    setStationId(id);
    setActiveTab('inventory');
  };

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

  const filteredAllItems = allItems.filter((i) => {
    if (filterCategory !== 'all' && i.category !== filterCategory) return false;
    if (filterLowStock && i.quantityAvailable > i.minimumLevel) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.itemName.toLowerCase().includes(q) ||
      (i.itemCode || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
        <Header />
        <main className="mt-32 sm:mt-36 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-5 pb-8 max-w-[1400px]">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAllStations
                  ? 'All stations overview'
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

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <StatCard title="Active Items" value={summary?.totalActiveItems ?? '-'} icon={<Package className="h-4 w-4" />} loading={loading} />
            <StatCard title="Low Stock" value={summary?.lowStockItems ?? '-'} icon={<AlertTriangle className="h-4 w-4" />} loading={loading} warn={!!summary && summary.lowStockItems > 0} />
            <StatCard title="Issued Today" value={summary?.issuedToday ?? '-'} icon={<ArrowUpCircle className="h-4 w-4" />} loading={loading} />
            <StatCard title="Pending Returns" value={summary?.pendingReturns ?? '-'} icon={<ArrowDownCircle className="h-4 w-4" />} loading={loading} warn={!!summary && summary.pendingReturns > 0} />
            <StatCard title="Cable Available" value={summary ? `${summary.cableAvailable}m` : '-'} icon={<Cable className="h-4 w-4" />} loading={loading} />
            <StatCard title="Techs Today" value={summary?.techniciansActiveToday ?? '-'} icon={<Users className="h-4 w-4" />} loading={loading} />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 mb-4 bg-white dark:bg-slate-900 border">
              <TabsTrigger value="inventory" className="flex-1 sm:flex-initial px-4">Inventory</TabsTrigger>
              <TabsTrigger value="issue-return" className="flex-1 sm:flex-initial px-4">
                Issue & Return
                {!!summary?.pendingReturns && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{summary.pendingReturns}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cable" className="flex-1 sm:flex-initial px-4">Cable</TabsTrigger>
              <TabsTrigger value="transfers" className="flex-1 sm:flex-initial px-4">Transfers</TabsTrigger>
              <TabsTrigger value="overview" className="flex-1 sm:flex-initial px-4">Overview</TabsTrigger>
            </TabsList>

            {/* Inventory */}
            <TabsContent value="inventory" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Drop Cable">Drop Cable</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={filterLowStock ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterLowStock(!filterLowStock)}
                  className="h-9"
                >
                  Low stock only
                </Button>
              </div>

              {isAllStations ? (
                <Card>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                    ) : filteredAllItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-10 text-sm">
                        No inventory items found. Select a station to add your first item.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="py-2 pr-4 font-medium">Item</th>
                              <th className="py-2 pr-4 font-medium">Category</th>
                              <th className="py-2 pr-4 font-medium">Available</th>
                              <th className="py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAllItems.slice(0, 100).map((item) => (
                              <tr key={item.id} className="border-b last:border-0">
                                <td className="py-2.5 pr-4">
                                  <p className="font-medium">{item.itemName}</p>
                                  <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                                </td>
                                <td className="py-2.5 pr-4">{item.category}</td>
                                <td className="py-2.5 pr-4">{item.quantityAvailable} {item.unitType}</td>
                                <td className="py-2.5">
                                  {item.quantityAvailable <= 0 ? (
                                    <Badge variant="destructive">Out of Stock</Badge>
                                  ) : item.quantityAvailable <= item.minimumLevel ? (
                                    <Badge className="bg-amber-500">Low Stock</Badge>
                                  ) : (
                                    <Badge variant="secondary">In Stock</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-xs text-muted-foreground mt-3">
                          Viewing all stations. Select a station above to add, issue or adjust items.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : stationId ? (
                <InventorySection
                  stationId={stationId}
                  stations={stationList}
                  searchQuery={searchQuery}
                  filterCategory={filterCategory}
                  filterLowStock={filterLowStock}
                  onRefresh={refresh}
                  refreshKey={refreshKey}
                />
              ) : null}
            </TabsContent>

            {/* Issue & Return */}
            <TabsContent value="issue-return">
              {isAllStations ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground text-sm">
                    Select a station above to issue items or process returns.
                  </CardContent>
                </Card>
              ) : stationId ? (
                <IssueReturnSection stationId={stationId} onRefresh={refresh} refreshKey={refreshKey} />
              ) : null}
            </TabsContent>

            {/* Cable */}
            <TabsContent value="cable">
              {isAllStations ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground text-sm">
                    Select a station above to manage cable rolls.
                  </CardContent>
                </Card>
              ) : stationId ? (
                <CableSection stationId={stationId} onRefresh={refresh} refreshKey={refreshKey} />
              ) : null}
            </TabsContent>

            {/* Transfers */}
            <TabsContent value="transfers">
              <TransfersTab
                stations={stationList}
                stationId={stationId || ALL_STATIONS}
                refreshKey={refreshKey}
                onRefresh={refresh}
              />
            </TabsContent>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <ReportsTab
                stationComparison={stationComparison}
                activities={activities}
                onSelectStation={handleSelectStationFromReport}
                isAllStations={isAllStations}
              />
              <TechniciansTab
                stationId={stationId || ALL_STATIONS}
                stations={stations}
                refreshKey={refreshKey}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
