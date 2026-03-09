'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  userName?: string;
  userId: string;
  stationId?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  stationId: string;
  refreshKey: number;
}

export function ActivityFeed({ stationId, refreshKey }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/isp/activity?stationId=${stationId}&limit=30`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setActivities(d.activities || []);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [stationId, refreshKey]);

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      CREATE: 'Created',
      ADD_STOCK: 'Added stock',
      ADJUST_STOCK: 'Adjusted stock',
      ISSUE: 'Issued items',
      RETURN: 'Processed return',
      CABLE_ISSUE: 'Issued cable',
      CABLE_RETURN: 'Returned cable',
    };
    return map[action] || action;
  };

  const formatEntity = (entityType: string) => {
    const map: Record<string, string> = {
      station: 'station',
      inventoryItem: 'item',
      inventoryTransaction: 'transaction',
      technicianIssue: 'issue',
      technicianIssueItem: 'return',
      cableRoll: 'cable roll',
      cableUsageLog: 'cable usage',
    };
    return map[entityType] || entityType;
  };

  return (
    <Card className="xl:sticky xl:top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 shrink-0" />
          Today&apos;s Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 sm:py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-6 sm:py-8 text-center text-muted-foreground text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] sm:max-h-[350px] xl:max-h-[400px] overflow-y-auto">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-0.5 py-2 sm:py-2.5 border-b border-border last:border-0"
              >
                <p className="text-xs sm:text-sm font-medium">
                  {formatAction(a.action)} {formatEntity(a.entityType)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {a.userName || a.userId} · {new Date(a.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
