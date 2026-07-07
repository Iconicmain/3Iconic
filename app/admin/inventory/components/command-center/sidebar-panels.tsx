'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, ArrowLeftRight, Package } from 'lucide-react';

interface Station {
  id: string;
  stationName: string;
}

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  userName?: string;
  userId: string;
  stationId?: string;
  createdAt: string;
}

interface PendingItem {
  issue: { technicianId: string; issueDate: string; stationId?: string };
  item: { itemName?: string; itemId: string; quantityTaken: number; quantityReturned: number; unitType: string };
}

interface LowStockItem {
  id: string;
  itemName: string;
  quantityAvailable: number;
  minimumLevel: number;
  stationId?: string;
  stationIds?: string[];
}

interface TransferItem {
  id: string;
  date: string;
  stationId: string;
  itemName: string;
  quantity: number;
  type: string;
  userName: string;
  notes?: string;
}

interface SidebarPanelsProps {
  stationId: string | 'all';
  stations: Station[];
  refreshKey: number;
  activities: ActivityItem[];
  pendingItems: PendingItem[];
  lowStockItems: LowStockItem[];
  transfers: TransferItem[];
  loading: boolean;
}

const actionLabels: Record<string, string> = {
  CREATE: 'Item added',
  ADD_STOCK: 'Stock added',
  ADJUST_STOCK: 'Item adjusted',
  ISSUE: 'Item issued',
  RETURN: 'Item returned',
  CABLE_ISSUE: 'Cable issued',
  CABLE_RETURN: 'Cable returned',
  BULK_ADD_ROUTERS: 'Routers added',
  TRANSFER_STOCK: 'Stock transferred',
};

function stationLabel(stations: Station[], id?: string) {
  if (!id) return '';
  const s = stations.find((st) => st.id === id || st.stationName === id);
  return s?.stationName || id;
}

export function SidebarPanels({
  stationId,
  stations,
  activities,
  pendingItems,
  lowStockItems,
  transfers,
  loading,
}: SidebarPanelsProps) {
  return (
    <div className="space-y-4 xl:sticky xl:top-[180px]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Today&apos;s Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity today</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {activities.slice(0, 12).map((a) => (
                <div key={a.id} className="py-2 border-b last:border-0 text-sm">
                  <p className="font-medium">{actionLabels[a.action] || a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.userName || a.userId}
                    {stationId === 'all' && a.stationId ? ` · ${stationLabel(stations, a.stationId)}` : ''}
                    {' · '}
                    {new Date(a.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pending Returns
            {pendingItems.length > 0 && (
              <Badge variant="destructive" className="ml-auto">{pendingItems.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No pending returns</p>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {pendingItems.slice(0, 8).map(({ issue, item }) => (
                <div key={item.id} className="text-sm py-1.5 border-b last:border-0">
                  <p className="font-medium truncate">{item.itemName || item.itemId}</p>
                  <p className="text-xs text-muted-foreground">
                    Out: {item.quantityTaken - item.quantityReturned} {item.unitType}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={lowStockItems.length > 0 ? 'border-amber-200' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">All items above minimum levels</p>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {lowStockItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span className="truncate mr-2">{item.itemName}</span>
                  <Badge variant="outline" className="shrink-0 text-amber-700">
                    {item.quantityAvailable}/{item.minimumLevel}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No recent transfers</p>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {transfers.slice(0, 6).map((t) => (
                <div key={t.id} className="text-sm py-1.5 border-b last:border-0">
                  <p className="font-medium truncate">{t.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.quantity} · {t.type.replace('_', ' ')} · {new Date(t.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type { ActivityItem, PendingItem, LowStockItem, TransferItem };
