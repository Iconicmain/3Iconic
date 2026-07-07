'use client';

import { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
=======
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
<<<<<<< HEAD
=======
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
  Warehouse,
  Package,
  Users,
  Cable,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Search,
<<<<<<< HEAD
  RefreshCw,
  ArrowLeftRight,
  Wifi,
  Loader2,
  ShieldAlert,
=======
  Filter,
  RefreshCw,
  Activity,
  Wrench,
  Loader2,
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
} from 'lucide-react';
import { toast } from 'sonner';
import { InventorySection } from './components/inventory-section';
import { IssueReturnSection } from './components/issue-return-section';
import { CableSection } from './components/cable-section';
<<<<<<< HEAD
import { SidebarPanels } from './components/command-center/sidebar-panels';
import { TransfersTab } from './components/command-center/transfers-tab';
import { ReportsTab } from './components/command-center/reports-tab';
import { TechniciansTab } from './components/command-center/technicians-tab';
import type { ActivityItem, PendingItem, LowStockItem, TransferItem } from './components/command-center/sidebar-panels';
import type { StationComparison } from './components/command-center/reports-tab';

export const ALL_STATIONS = 'all';
=======
import { ActivityFeed } from './components/activity-feed';
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c

interface Station {
  id: string;
  _id?: string;
  stationName: string;
  code: string;
  location: string;
}

<<<<<<< HEAD
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
=======
interface Stats {
  totalActiveItems: number;
  lowStockItems: number;
  itemsIssuedToday: number;
  itemsReturnedToday: number;
  pendingReturns: number;
  totalCableRemaining: number;
  activeTechniciansToday: number;
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
}

interface InventoryClientProps {
  stations: Station[];
  allStationsForSelection?: Station[];
  defaultStationId: string | null;
  isSuperAdmin: boolean;
}

<<<<<<< HEAD
type QuickAction =
  | 'add-item'
  | 'add-routers'
  | 'issue'
  | 'return'
  | 'add-roll'
  | 'issue-cable'
  | 'transfer';
=======
export function InventoryStationPage({
  stations,
  allStationsForSelection = [],
  defaultStationId,
  isSuperAdmin,
}: InventoryClientProps) {
  const router = useRouter();
  const [stationId, setStationId] = useState<string | null>(() => defaultStationId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fixingDuplicates, setFixingDuplicates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleFixDuplicates = useCallback(async () => {
    setFixingDuplicates(true);
    try {
      const res = await fetch('/api/isp/stations/fix-duplicates', { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fix duplicates');
      toast.success(data.message || 'Duplicate station IDs fixed. Refreshing...');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fix duplicates');
    } finally {
      setFixingDuplicates(false);
    }
  }, [router]);

  useEffect(() => {
    if (!stationId) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/isp/station-stats?stationId=${stationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStats(d);
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load stats');
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [stationId, refreshKey]);

  const currentStation = stations.find((s) => s.id === stationId);

  if (stations.length === 0) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="md:ml-72 flex-1">
          <Header />
          <main className="mt-32 sm:mt-36 md:mt-0 px-4 md:px-6 lg:px-8 pt-6 pb-8">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>No Stations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  No stations found. Create stations from the Stations page to use inventory.
                </p>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/admin/stations">Go to Stations</a>
                </Button>
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
        <main className="mt-32 sm:mt-36 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 md:pb-8">
          {/* Station selector & header */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Station Operations
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Inventory, issues, returns & cable tracking
              </p>
            </div>
            {isSuperAdmin && stations.length > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Select
                  value={stationId ? String(stationId) : ''}
                  onValueChange={(v) => setStationId(v || null)}
                >
                  <SelectTrigger className="w-full sm:w-[220px] bg-background h-10 sm:h-9">
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s, i) => (
                      <SelectItem key={s._id || s.id || String(i)} value={String(s.id)}>
                        {s.stationName} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={refresh} className="h-10 w-10 sm:h-9 sm:w-9 shrink-0">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFixDuplicates}
                    disabled={fixingDuplicates}
                    title="Assign unique IDs to stations that share the same ID"
                    className="flex-1 sm:flex-initial h-10 sm:h-9 text-xs sm:text-sm"
                  >
                    {fixingDuplicates ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1" /> : <Wrench className="h-4 w-4 sm:mr-1" />}
                    <span className="hidden sm:inline">{fixingDuplicates ? 'Fixing...' : 'Fix IDs'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!stationId && stations.length > 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a station to view operations
              </CardContent>
            </Card>
          ) : stationId ? (
            <>
              {/* Summary cards - 2 cols mobile, 4 tablet, 8 desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                <StatCard
                  title="Station"
                  value={currentStation?.stationName || '-'}
                  icon={<Warehouse className="h-4 w-4" />}
                  loading={loading}
                />
                <StatCard
                  title="Active Items"
                  value={stats?.totalActiveItems ?? '-'}
                  icon={<Package className="h-4 w-4" />}
                  loading={loading}
                />
                <StatCard
                  title="Low Stock"
                  value={stats?.lowStockItems ?? '-'}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  loading={loading}
                  variant={stats && stats.lowStockItems > 0 ? 'warning' : undefined}
                />
                <StatCard
                  title="Issued Today"
                  value={stats?.itemsIssuedToday ?? '-'}
                  icon={<ArrowUpCircle className="h-4 w-4" />}
                  loading={loading}
                />
                <StatCard
                  title="Returned Today"
                  value={stats?.itemsReturnedToday ?? '-'}
                  icon={<ArrowDownCircle className="h-4 w-4" />}
                  loading={loading}
                />
                <StatCard
                  title="Pending Returns"
                  value={stats?.pendingReturns ?? '-'}
                  icon={<Package className="h-4 w-4" />}
                  loading={loading}
                  variant={stats && stats.pendingReturns > 0 ? 'warning' : undefined}
                />
                <StatCard
                  title="Cable (m)"
                  value={stats?.totalCableRemaining ?? '-'}
                  icon={<Cable className="h-4 w-4" />}
                  loading={loading}
                />
                <StatCard
                  title="Techs Today"
                  value={stats?.activeTechniciansToday ?? '-'}
                  icon={<Users className="h-4 w-4" />}
                  loading={loading}
                />
              </div>

              {/* Quick filters - full width on mobile */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-4">
                <div className="relative flex-1 w-full sm:min-w-[140px] sm:max-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 sm:h-9 w-full"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="Drop Cable">Drop Cable</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={filterLowStock ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterLowStock(!filterLowStock)}
                  className="h-10 sm:h-9 w-full sm:w-auto"
                >
                  Low stock only
                </Button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                {/* Left column: Inventory + Issue/Return */}
                <div className="xl:col-span-2 space-y-6">
                  <InventorySection
                    stationId={stationId}
                    stations={allStationsForSelection.length > 0 ? allStationsForSelection : stations}
                    searchQuery={searchQuery}
                    filterCategory={filterCategory}
                    filterLowStock={filterLowStock}
                    onRefresh={refresh}
                  />
                  <IssueReturnSection stationId={stationId} onRefresh={refresh} />
                  <CableSection stationId={stationId} onRefresh={refresh} />
                </div>

                {/* Right column: Activity */}
                <div>
                  <ActivityFeed stationId={stationId} refreshKey={refreshKey} />
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c

function StatCard({
  title,
  value,
  icon,
  loading,
  variant,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  variant?: 'warning';
}) {
  return (
<<<<<<< HEAD
    <Card className={`overflow-hidden ${variant === 'warning' ? 'border-amber-200 dark:border-amber-800' : ''}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className="text-base sm:text-lg font-bold mt-0.5 truncate">{loading ? '...' : value}</p>
          </div>
          <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
=======
    <Card
      className={`overflow-hidden transition-shadow ${
        variant === 'warning' ? 'border-amber-200 dark:border-amber-800' : ''
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="text-base sm:text-lg font-bold mt-0.5 sm:mt-1 truncate" title={String(value)}>
              {loading ? '...' : value}
            </p>
          </div>
          <div
            className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
              variant === 'warning'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
<<<<<<< HEAD

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
  const [loading, setLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [openDialog, setOpenDialog] = useState<QuickAction | null>(null);
  const [transferDrawer, setTransferDrawer] = useState(false);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; itemName: string; quantityAvailable: number }[]>([]);

  const isAllStations = stationId === ALL_STATIONS;
  const effectiveStationId = isAllStations ? (stations[0]?.id || '') : (stationId || '');

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchSummary = useCallback(() => {
    if (!stationId) return;
    setLoading(true);
    fetch(`/api/isp/dashboard-summary?stationId=${stationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSummary(d.summary);
        setStationComparison(d.stationComparison || []);
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load summary');
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [stationId, refreshKey]);

  const fetchSidebarData = useCallback(() => {
    if (!stationId) return;
    setSidebarLoading(true);
    const activityUrl = isAllStations
      ? '/api/isp/activity?limit=30'
      : `/api/isp/activity?stationId=${stationId}&limit=30`;
    const inventoryUrl = isAllStations
      ? '/api/isp/inventory?stationId=all&lowStock=true'
      : `/api/isp/inventory?stationId=${stationId}&lowStock=true`;
    const issuesUrl = isAllStations
      ? '/api/isp/technician-issues?stationId=all'
      : `/api/isp/technician-issues?stationId=${stationId}`;
    const transferUrl = isAllStations
      ? '/api/isp/inventory/transfer?limit=10'
      : `/api/isp/inventory/transfer?stationId=${stationId}&limit=10`;
    const allItemsUrl = isAllStations
      ? '/api/isp/inventory?stationId=all'
      : `/api/isp/inventory?stationId=${stationId}`;

    Promise.all([
      fetch(activityUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(issuesUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(inventoryUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(transferUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(allItemsUrl, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([act, issues, lowStock, xfer, allItems]) => {
        setActivities(act.activities || []);
        const pending = (issues.issues || []).flatMap((issue: PendingItem['issue'] & { items: PendingItem['item'][] }) =>
          (issue.items || [])
            .filter((i) => i.quantityReturned < i.quantityTaken)
            .map((item) => ({ issue, item }))
        );
        setPendingItems(pending);
        setLowStockItems(lowStock.items || []);
        setTransfers(xfer.transfers || []);
        setInventoryItems(allItems.items || []);
      })
      .catch(() => {})
      .finally(() => setSidebarLoading(false));
  }, [stationId, isAllStations, refreshKey]);

  useEffect(() => {
    fetchSummary();
    fetchSidebarData();
  }, [fetchSummary, fetchSidebarData]);

  const handleQuickAction = (action: QuickAction) => {
    if (isAllStations && action !== 'transfer' && ['issue', 'return', 'add-roll', 'issue-cable', 'add-item', 'add-routers'].includes(action)) {
      toast.info('Select a specific station to perform this action');
      return;
    }
    if (action === 'transfer') {
      setActiveTab('transfers');
      setTransferDrawer(true);
      return;
    }
    if (action === 'add-roll' || action === 'issue-cable') {
      setActiveTab('cable');
    } else if (action === 'issue' || action === 'return') {
      setActiveTab('issue-return');
    } else {
      setActiveTab('inventory');
    }
    setOpenDialog(action);
  };

  const handleSelectStationFromReport = (id: string) => {
    setStationId(id);
    setActiveTab('inventory');
    toast.success('Switched to station view');
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

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
        <Header />

        {/* Sticky command header */}
        <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-b">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory Command Center</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Manage inventory, issues, returns, routers, cable, and station stock from one place
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={stationId || ''} onValueChange={setStationId}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-background">
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && (
                      <SelectItem value={ALL_STATIONS}>All Stations</SelectItem>
                    )}
                    {stations.map((s, i) => (
                      <SelectItem key={s._id || s.id || String(i)} value={String(s.id)}>
                        {s.stationName} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={refresh} className="shrink-0">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, serial, router ID, technician, station, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[140px] bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="Drop Cable">Drop Cable</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Materials">Materials</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={filterLowStock ? 'default' : 'outline'} size="sm" onClick={() => setFilterLowStock(!filterLowStock)}>
                Low stock
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleQuickAction('add-item')}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('add-routers')}><Wifi className="h-4 w-4 mr-1" />Add Routers</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('issue')}><ArrowUpCircle className="h-4 w-4 mr-1" />Issue Items</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('return')} disabled={pendingItems.length === 0}><ArrowDownCircle className="h-4 w-4 mr-1" />Process Return</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('add-roll')}><Cable className="h-4 w-4 mr-1" />Add Cable Roll</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('issue-cable')}><Cable className="h-4 w-4 mr-1" />Issue Cable</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('transfer')}><ArrowLeftRight className="h-4 w-4 mr-1" />Transfer Stock</Button>
            </div>
          </div>
        </div>

        <main className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 pb-8">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-3 mb-6">
            <StatCard title="Total Stations" value={summary?.totalStations ?? '-'} icon={<Warehouse className="h-4 w-4" />} loading={loading} />
            <StatCard title="Active Items" value={summary?.totalActiveItems ?? '-'} icon={<Package className="h-4 w-4" />} loading={loading} />
            <StatCard title="Low Stock" value={summary?.lowStockItems ?? '-'} icon={<AlertTriangle className="h-4 w-4" />} loading={loading} variant={summary && summary.lowStockItems > 0 ? 'warning' : undefined} />
            <StatCard title="Issued Today" value={summary?.issuedToday ?? '-'} icon={<ArrowUpCircle className="h-4 w-4" />} loading={loading} />
            <StatCard title="Returned Today" value={summary?.returnedToday ?? '-'} icon={<ArrowDownCircle className="h-4 w-4" />} loading={loading} />
            <StatCard title="Pending Returns" value={summary?.pendingReturns ?? '-'} icon={<Package className="h-4 w-4" />} loading={loading} variant={summary && summary.pendingReturns > 0 ? 'warning' : undefined} />
            <StatCard title="Cable Available" value={summary ? `${summary.cableAvailable}m` : '-'} icon={<Cable className="h-4 w-4" />} loading={loading} />
            <StatCard title="Cable Issued Today" value={summary ? `${summary.cableIssuedToday}m` : '-'} icon={<Cable className="h-4 w-4" />} loading={loading} />
            <StatCard title="Techs Today" value={summary?.techniciansActiveToday ?? '-'} icon={<Users className="h-4 w-4" />} loading={loading} />
            <StatCard title="Damaged / Lost" value={summary?.damagedLostItems ?? '-'} icon={<ShieldAlert className="h-4 w-4" />} loading={loading} variant={summary && summary.damagedLostItems > 0 ? 'warning' : undefined} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Main column */}
            <div className="xl:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 mb-4">
                  <TabsTrigger value="inventory" className="flex-1 min-w-[80px]">Inventory</TabsTrigger>
                  <TabsTrigger value="issue-return" className="flex-1 min-w-[80px]">Issue / Return</TabsTrigger>
                  <TabsTrigger value="cable" className="flex-1 min-w-[80px]">Cable</TabsTrigger>
                  <TabsTrigger value="transfers" className="flex-1 min-w-[80px]">Transfers</TabsTrigger>
                  <TabsTrigger value="technicians" className="flex-1 min-w-[80px]">Technicians</TabsTrigger>
                  <TabsTrigger value="reports" className="flex-1 min-w-[80px]">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory">
                  {isAllStations ? (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground mb-4">
                          Company-wide inventory overview. Select a station to manage items, or use Reports for station comparison.
                        </p>
                        {loading ? (
                          <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="py-2 pr-4">Item</th>
                                  <th className="py-2 pr-4">Category</th>
                                  <th className="py-2 pr-4">Available</th>
                                  <th className="py-2 pr-4">Min</th>
                                  <th className="py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventoryItems
                                  .filter((i: { itemName: string; itemCode?: string; category?: string; quantityAvailable: number; minimumLevel: number }) => {
                                    if (filterCategory !== 'all' && i.category !== filterCategory) return false;
                                    if (filterLowStock && i.quantityAvailable > i.minimumLevel) return false;
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    return i.itemName.toLowerCase().includes(q) || (i.itemCode || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
                                  })
                                  .slice(0, 100)
                                  .map((item: { id: string; itemName: string; category: string; quantityAvailable: number; minimumLevel: number; unitType?: string }) => (
                                    <tr key={item.id} className="border-b last:border-0">
                                      <td className="py-2.5 pr-4 font-medium">{item.itemName}</td>
                                      <td className="py-2.5 pr-4">{item.category}</td>
                                      <td className="py-2.5 pr-4">{item.quantityAvailable} {item.unitType}</td>
                                      <td className="py-2.5 pr-4">{item.minimumLevel}</td>
                                      <td className="py-2.5">
                                        {item.quantityAvailable <= item.minimumLevel ? (
                                          <Badge className="bg-amber-500">Low Stock</Badge>
                                        ) : (
                                          <Badge variant="secondary">In Stock</Badge>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                            {inventoryItems.length === 0 && (
                              <p className="text-center text-muted-foreground py-8">
                                No inventory items found. Add your first item or router to begin tracking.
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : effectiveStationId ? (
                    <InventorySection
                      stationId={effectiveStationId}
                      stations={stationList}
                      searchQuery={searchQuery}
                      filterCategory={filterCategory}
                      filterLowStock={filterLowStock}
                      onRefresh={refresh}
                      refreshKey={refreshKey}
                      hideHeader
                      openDialog={openDialog === 'add-item' ? 'add-item' : openDialog === 'add-routers' ? 'add-routers' : null}
                      onOpenDialogHandled={() => setOpenDialog(null)}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="issue-return">
                  {isAllStations ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Select a station to issue or process returns.</CardContent></Card>
                  ) : effectiveStationId ? (
                    <IssueReturnSection
                      stationId={effectiveStationId}
                      onRefresh={refresh}
                      refreshKey={refreshKey}
                      hideHeader
                      openDialog={openDialog === 'issue' ? 'issue' : openDialog === 'return' ? 'return' : null}
                      onOpenDialogHandled={() => setOpenDialog(null)}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="cable">
                  {isAllStations ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Select a station to manage cable rolls.</CardContent></Card>
                  ) : effectiveStationId ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                        {[
                          { label: 'Cable Available', value: `${summary?.cableAvailable ?? 0}m` },
                          { label: 'Issued Today', value: `${summary?.cableIssuedToday ?? 0}m` },
                          { label: 'Returned Today', value: `${summary?.cableReturnedToday ?? 0}m` },
                          { label: 'Used Today', value: `${summary?.cableUsedToday ?? 0}m` },
                          { label: 'Wasted / Damaged', value: `${summary?.cableWastedToday ?? 0}m` },
                        ].map((c) => (
                          <Card key={c.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{c.label}</p><p className="font-bold">{c.value}</p></CardContent></Card>
                        ))}
                      </div>
                      <CableSection
                        stationId={effectiveStationId}
                        onRefresh={refresh}
                        refreshKey={refreshKey}
                        hideHeader
                        openDialog={openDialog === 'add-roll' ? 'add-roll' : openDialog === 'issue-cable' ? 'issue-cable' : null}
                        onOpenDialogHandled={() => setOpenDialog(null)}
                      />
                    </>
                  ) : null}
                </TabsContent>

                <TabsContent value="transfers">
                  <TransfersTab
                    stations={stationList}
                    stationId={stationId || ALL_STATIONS}
                    items={inventoryItems}
                    transfers={transfers}
                    onRefresh={refresh}
                    openDrawer={transferDrawer}
                    onDrawerClose={() => setTransferDrawer(false)}
                  />
                </TabsContent>

                <TabsContent value="technicians">
                  <TechniciansTab stationId={stationId || ALL_STATIONS} stations={stations} refreshKey={refreshKey} />
                </TabsContent>

                <TabsContent value="reports">
                  <ReportsTab
                    stationComparison={stationComparison}
                    activities={activities}
                    onSelectStation={handleSelectStationFromReport}
                    isAllStations={isAllStations}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right sidebar panels */}
            <div>
              <SidebarPanels
                stationId={stationId || ALL_STATIONS}
                stations={stations}
                refreshKey={refreshKey}
                activities={activities}
                pendingItems={pendingItems}
                lowStockItems={lowStockItems}
                transfers={transfers}
                loading={sidebarLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export { InventoryStationPage as InventoryCommandCenter };
=======
>>>>>>> 8e1879135597300faf42ee752b3c23a349ee4e0c
