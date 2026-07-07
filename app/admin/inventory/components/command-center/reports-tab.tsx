'use client';

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
import { Activity, BarChart3 } from 'lucide-react';

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

const healthBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Healthy: 'default',
  'Low Stock': 'destructive',
  'Needs Review': 'secondary',
  'No Activity': 'outline',
};

const actionLabels: Record<string, string> = {
  CREATE: 'Item added',
  ADD_STOCK: 'Stock added',
  ADJUST_STOCK: 'Stock adjusted',
  ISSUE: 'Items issued',
  RETURN: 'Return processed',
  CABLE_ISSUE: 'Cable issued',
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
                      <TableCell>{s.pendingReturns}</TableCell>
                      <TableCell>{s.lowStockCount > 0 ? <Badge variant="destructive">{s.lowStockCount}</Badge> : '-'}</TableCell>
                      <TableCell>{s.totalCableRemaining}m</TableCell>
                      <TableCell>
                        <Badge variant={healthBadge[s.healthStatus] || 'outline'}>{s.healthStatus}</Badge>
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
              {activities.slice(0, 25).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{actionLabels[a.action] || a.action}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.userName || a.userId}
                      {a.stationId ? ` · ${a.stationId}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
