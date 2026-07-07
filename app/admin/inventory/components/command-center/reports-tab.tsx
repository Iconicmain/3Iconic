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
import type { ActivityItem } from './sidebar-panels';

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

export function ReportsTab({
  stationComparison,
  activities,
  onSelectStation,
  isAllStations,
}: ReportsTabProps) {
  return (
    <div className="space-y-6">
      {isAllStations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Station Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Issued Today</TableHead>
                    <TableHead>Returned Today</TableHead>
                    <TableHead>Pending Returns</TableHead>
                    <TableHead>Low Stock</TableHead>
                    <TableHead>Cable Available</TableHead>
                    <TableHead>Techs Today</TableHead>
                    <TableHead>Health Status</TableHead>
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
                      <TableCell>{s.activeTechnicians}</TableCell>
                      <TableCell>
                        <Badge variant={healthBadge[s.healthStatus] || 'outline'}>{s.healthStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Click a station row to switch to that station&apos;s detailed view.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity & Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{new Date(a.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{a.userName || a.userId}</TableCell>
                      <TableCell>{a.action}</TableCell>
                      <TableCell>{a.stationId || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{a.entityType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type { StationComparison };
