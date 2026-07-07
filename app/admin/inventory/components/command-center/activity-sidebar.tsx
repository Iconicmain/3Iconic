'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityItem } from './reports-tab';
import { activityStyle, softBadgeClass } from './inventory-colors';

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
  const alerts: { label: string; count: number; style: string }[] = [];
  if (summary) {
    if (summary.pendingReturns > 0) {
      alerts.push({
        label: 'Pending returns',
        count: summary.pendingReturns,
        style: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
      });
    }
    if (summary.lowStockItems > 0) {
      alerts.push({
        label: 'Low stock items',
        count: summary.lowStockItems,
        style: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
      });
    }
  }

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/15">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {alerts.map((a) => (
              <div key={a.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{a.label}</span>
                <span className={softBadgeClass(a.style)}>{a.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200/80">
        <CardHeader className="pb-2 pt-4 px-4 border-b bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 py-3">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          ) : (
            <ul className="space-y-1 max-h-[420px] overflow-y-auto">
              {activities.slice(0, 20).map((a) => {
                const style = activityStyle(a.action);
                return (
                  <li
                    key={a.id}
                    className={cn(
                      'flex gap-2.5 rounded-lg px-2 py-2 text-sm',
                      style.bg
                    )}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', style.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn('font-medium leading-tight', style.label)}>
                          {fmtAction(a.action)}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {fmtTime(a.createdAt)}
                        </span>
                      </div>
                      {a.userName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{a.userName}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {summary && summary.pendingReturns > 0 && (
        <Card className="border-orange-200/80 bg-orange-50/30 dark:border-orange-900/50 dark:bg-orange-950/15">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-900 dark:text-orange-200">
              <ArrowDownCircle className="h-4 w-4 text-orange-600" />
              Returns pending
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              <span className={softBadgeClass('bg-orange-100 text-orange-800 border-orange-200 mr-1.5')}>
                {summary.pendingReturns}
              </span>
              awaiting return — open the <strong className="text-orange-800 dark:text-orange-300">Returns</strong> tab.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
