'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, ArrowDownCircle } from 'lucide-react';
import type { ActivityItem } from './reports-tab';

interface DashboardSummary {
  lowStockItems: number;
  pendingReturns: number;
  cableAvailable: number;
}

interface ActivitySidebarProps {
  activities: ActivityItem[];
  summary: DashboardSummary | null;
  loading?: boolean;
}

function fmtTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fmtAction(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'Created item',
    ADD_STOCK: 'Added stock',
    ADJUST_STOCK: 'Adjusted stock',
    ISSUE: 'Issued items',
    RETURN: 'Processed return',
    CABLE_ISSUE: 'Issued cable',
    CABLE_RETURN: 'Returned cable',
    TRANSFER_STOCK: 'Transferred stock',
  };
  return map[action] || action.replace(/_/g, ' ').toLowerCase();
}

export function ActivitySidebar({ activities, summary, loading }: ActivitySidebarProps) {
  const alerts: { label: string; count: number; warn?: boolean }[] = [];
  if (summary) {
    if (summary.pendingReturns > 0) {
      alerts.push({ label: 'Pending returns', count: summary.pendingReturns, warn: true });
    }
    if (summary.lowStockItems > 0) {
      alerts.push({ label: 'Low stock items', count: summary.lowStockItems, warn: true });
    }
  }

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {alerts.map((a) => (
              <div key={a.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{a.label}</span>
                <Badge variant={a.warn ? 'destructive' : 'secondary'}>{a.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          ) : (
            <ul className="space-y-3 max-h-[420px] overflow-y-auto">
              {activities.slice(0, 20).map((a) => (
                <li key={a.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-tight">{fmtAction(a.action)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtTime(a.createdAt)}</span>
                  </div>
                  {a.userName && (
                    <p className="text-xs text-muted-foreground mt-0.5">{a.userName}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {summary && summary.pendingReturns > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {summary.pendingReturns} item{summary.pendingReturns !== 1 ? 's' : ''} awaiting return.
              Open the <strong>Returns</strong> tab to process.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
