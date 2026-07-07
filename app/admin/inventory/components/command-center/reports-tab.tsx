'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { activityStyle, softBadgeClass, stockStatusStyle } from './inventory-colors';

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  userName?: string;
  userId: string;
  stationId?: string;
  createdAt: string;
}

export interface StationComparison {
  id: string;
  stationName: string;
  totalStockItems: number;
  itemsIssuedToday: number;
  itemsReturnedToday: number;
  pendingReturns: number;
  lowStockCount: number;
  totalCableRemaining: number;
  activeTechnicians: number;
  healthStatus: string;
}

interface ReportsTabProps {
  stationComparison: StationComparison[];
  activities: ActivityItem[];
  onSelectStation: (stationId: string) => void;
  isAllStations: boolean;
}

const healthStyle: Record<string, string> = {
  Healthy: stockStatusStyle('healthy'),
  'Low Stock': stockStatusStyle('low'),
  'Needs Review': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  'No Activity': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
};

const actionLabels: Record<string, string> = {
  CREATE: 'Item added',
  ADD_STOCK: 'Stock added',
  ADJUST_STOCK: 'Stock adjusted',
  ISSUE: 'Items issued',
  RETURN: 'Return processed',
  SHARED_ISSUE: 'Shared equipment issued',
  SHARED_RETURN: 'Shared equipment returned',
  SHARED_PARTIAL_RETURN: 'Shared partial return',
  SHARED_DAMAGED: 'Shared equipment damaged',
  PROJECT_ISSUE: 'Project equipment issued',
  CABLE_ISSUE: 'Cable issued',
  SHARED_CABLE_ISSUE: 'Shared cable issued',
  CABLE_RETURN: 'Cable returned',
  BULK_ADD_ROUTERS: 'Routers added',
  TRANSFER_STOCK: 'Stock transferred',
};

export function ReportsTab({
  stationComparison,
  activities,
  onSelectStation,
  isAllStations,
}: ReportsTabProps) {
  return (
    <div className="space-y-4">
      {isAllStations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 shrink-0" />
              Station Comparison
            </CardTitle>
            <p className="text-xs text-muted-foreground">Click a station to open its detailed view</p>
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
                    <TableHead>Low Stock</TableHead>
                    <TableHead>Cable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationComparison.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectStation(s.id)}
                    >
                      <TableCell className="font-medium">{s.stationName}</TableCell>
                      <TableCell>{s.totalStockItems}</TableCell>
                      <TableCell>{s.itemsIssuedToday}</TableCell>
                      <TableCell>{s.itemsReturnedToday}</TableCell>
                      <TableCell>{s.pendingReturns > 0 ? <span className={softBadgeClass('bg-orange-100 text-orange-800 border-orange-200')}>{s.pendingReturns}</span> : '-'}</TableCell>
                      <TableCell>{s.lowStockCount > 0 ? <span className={softBadgeClass(stockStatusStyle('low'))}>{s.lowStockCount}</span> : '-'}</TableCell>
                      <TableCell className="text-cyan-700 dark:text-cyan-400 tabular-nums">{s.totalCableRemaining.toLocaleString()}m</TableCell>
                      <TableCell>
                        <span className={softBadgeClass(healthStyle[s.healthStatus] || healthStyle['No Activity'])}>
                          {s.healthStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 shrink-0" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity recorded yet</p>
          ) : (
            <div className="divide-y">
              {activities.slice(0, 25).map((a) => {
                const style = activityStyle(a.action);
                return (
                  <div
                    key={a.id}
                    className={cn('flex items-center justify-between gap-3 py-2.5 px-2 text-sm rounded-lg my-0.5', style.bg)}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', style.dot)} />
                      <div className="min-w-0">
                        <p className={cn('font-medium', style.label)}>
                          {actionLabels[a.action] || a.action}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.userName || a.userId}
                          {a.stationId ? ` · ${a.stationId}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
