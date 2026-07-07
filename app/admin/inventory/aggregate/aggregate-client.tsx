'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Summary {
  totalStations: number;
  totalInventoryItems: number;
  totalIssuedToday: number;
  totalReturnedToday: number;
  totalPendingReturns: number;
  totalLowStock: number;
  totalCableRemaining: number;
  activeTechniciansToday: number;
  cableIssuedToday: number;
  cableReturnedToday: number;
  cableUsedToday: number;
}

interface StationComparison {
  id: string;
  stationName: string;
  totalStockItems: number;
  itemsIssuedToday: number;
  itemsReturnedToday: number;
  pendingReturns: number;
  lowStockCount: number;
  totalCableRemaining: number;
  activeTechnicians: number;
  lastActivityTime: string | null;
}

interface TechnicianAccountability {
  technicianId: string;
  stationId: string;
  itemsTaken: number;
  itemsReturned: number;
  itemsPending: number;
  cableMetersUsed: number;
}

interface AggregateData {
  summary: Summary;
  stationComparison: StationComparison[];
  technicianAccountability: TechnicianAccountability[];
  cableOverview: {
    rolls: { id: string; rollCode: string; stationId: string; currentRemainingMeters: number }[];
    totalIssuedToday: number;
    totalReturnedToday: number;
    totalUsedToday: number;
  };
}

export function AggregatePageClient() {
  const [data, setData] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<unknown[]>([]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/isp/aggregate', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/isp/activity?limit=50', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([aggRes, actRes]) => {
        if (aggRes.error) throw new Error(aggRes.error);
        setData(aggRes);
        setActivities(actRes.activities || []);
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load data');
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="md:ml-72 flex-1">
          <Header />
          <main className="mt-32 md:mt-0 px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="grid grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const stations = data?.stationComparison || [];
  const techs = data?.technicianAccountability || [];
  const cable = data?.cableOverview;

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
        <Header />
        <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 md:pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Inventory Overview
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Aggregated data from all stations
              </p>
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>

          {/* Global summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-6">
            <StatCard title="Stations" value={summary?.totalStations ?? '-'} icon={<Warehouse className="h-4 w-4" />} />
            <StatCard title="Total Items" value={summary?.totalInventoryItems ?? '-'} icon={<Package className="h-4 w-4" />} />
            <StatCard title="Issued Today" value={summary?.totalIssuedToday ?? '-'} icon={<ArrowUpCircle className="h-4 w-4" />} />
            <StatCard title="Returned Today" value={summary?.totalReturnedToday ?? '-'} icon={<ArrowDownCircle className="h-4 w-4" />} />
            <StatCard title="Pending Returns" value={summary?.totalPendingReturns ?? '-'} icon={<Package className="h-4 w-4" />} variant={summary?.totalPendingReturns ? 'warning' : undefined} />
            <StatCard title="Low Stock" value={summary?.totalLowStock ?? '-'} icon={<AlertTriangle className="h-4 w-4" />} variant={summary?.totalLowStock ? 'warning' : undefined} />
            <StatCard title="Cable (m)" value={summary?.totalCableRemaining ?? '-'} icon={<Cable className="h-4 w-4" />} />
            <StatCard title="Techs Today" value={summary?.activeTechniciansToday ?? '-'} icon={<Users className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Station comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Station Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Station</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Returned</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Low</TableHead>
                        <TableHead>Cable (m)</TableHead>
                        <TableHead>Techs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stations.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.stationName}</TableCell>
                          <TableCell>{s.totalStockItems}</TableCell>
                          <TableCell>{s.itemsIssuedToday}</TableCell>
                          <TableCell>{s.itemsReturnedToday}</TableCell>
                          <TableCell>{s.pendingReturns}</TableCell>
                          <TableCell>
                            {s.lowStockCount > 0 ? (
                              <Badge variant="destructive">{s.lowStockCount}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{s.totalCableRemaining}</TableCell>
                          <TableCell>{s.activeTechnicians}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Cable overview */}
            <Card>
              <CardHeader>
                <CardTitle>Cable Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Issued Today</p>
                      <p className="text-lg font-bold">{cable?.totalIssuedToday ?? 0}m</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Returned Today</p>
                      <p className="text-lg font-bold">{cable?.totalReturnedToday ?? 0}m</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Used Today</p>
                      <p className="text-lg font-bold">{cable?.totalUsedToday ?? 0}m</p>
                    </div>
                  </div>
                  {cable?.rolls && cable.rolls.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Rolls by station</p>
                      <div className="space-y-1 text-sm">
                        {cable.rolls.slice(0, 10).map((r: { rollCode: string; currentRemainingMeters: number; stationId: string }) => (
                          <div key={r.rollCode + r.stationId} className="flex justify-between">
                            <span>{r.rollCode}</span>
                            <span>{r.currentRemainingMeters}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Technician accountability */}
          {techs.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Technician Accountability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician ID</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Items Taken</TableHead>
                        <TableHead>Items Returned</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Cable Used (m)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {techs.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{t.technicianId.slice(0, 8)}...</TableCell>
                          <TableCell>{stations.find((s) => s.id === t.stationId)?.stationName || t.stationId}</TableCell>
                          <TableCell>{t.itemsTaken}</TableCell>
                          <TableCell>{t.itemsReturned}</TableCell>
                          <TableCell>{t.itemsPending}</TableCell>
                          <TableCell>{t.cableMetersUsed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit activity */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No recent activity</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activities.slice(0, 20).map((a: { id: string; action: string; entityType: string; userName?: string; createdAt: string }, i: number) => (
                    <div
                      key={a.id || i}
                      className="flex justify-between items-center py-2 border-b text-sm last:border-0"
                    >
                      <span>{a.action} {a.entityType}</span>
                      <span className="text-muted-foreground text-xs">
                        {a.userName} · {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'warning';
}) {
  return (
    <Card className={variant === 'warning' ? 'border-amber-200 dark:border-amber-800' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
          <div
            className={`p-2 rounded-lg ${
              variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'
            }`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
