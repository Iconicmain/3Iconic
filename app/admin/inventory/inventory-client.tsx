'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Warehouse,
  Package,
  Users,
  Cable,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Activity,
  Wrench,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { InventorySection } from './components/inventory-section';
import { IssueReturnSection } from './components/issue-return-section';
import { CableSection } from './components/cable-section';
import { ActivityFeed } from './components/activity-feed';

interface Station {
  id: string;
  _id?: string;
  stationName: string;
  code: string;
  location: string;
}

interface Stats {
  totalActiveItems: number;
  lowStockItems: number;
  itemsIssuedToday: number;
  itemsReturnedToday: number;
  pendingReturns: number;
  totalCableRemaining: number;
  activeTechniciansToday: number;
}

interface InventoryClientProps {
  stations: Station[];
  allStationsForSelection?: Station[];
  defaultStationId: string | null;
  isSuperAdmin: boolean;
}

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
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
