'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Users, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

interface StationOption {
  id: string;
  stationName: string;
  code: string;
}

interface AssignableUser {
  id: string;
  email: string;
  name: string;
  accountType: string;
  accountTypeLabel: string;
  assignedStationIds: string[];
  hasInventoryAccess: boolean;
}

export function StationAssignmentsManager() {
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [draft, setDraft] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/station-assignments', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
      setStations(data.stations || []);
      const initial: Record<string, string[]> = {};
      for (const u of data.users || []) {
        initial[u.id] = [...(u.assignedStationIds || [])];
      }
      setDraft(initial);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStation = (userId: string, stationId: string) => {
    setDraft((prev) => {
      const current = prev[userId] || [];
      const has = current.includes(stationId);
      return {
        ...prev,
        [userId]: has ? current.filter((id) => id !== stationId) : [...current, stationId],
      };
    });
  };

  const saveUser = async (user: AssignableUser) => {
    const assignedStationIds = draft[user.id] || [];
    if (assignedStationIds.length === 0) {
      toast.error('Select at least one station');
      return;
    }

    setSavingUserId(user.id);
    try {
      const res = await fetch('/api/users/station-assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, assignedStationIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Stations saved for ${user.name}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, assignedStationIds } : u))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingUserId(null);
    }
  };

  const isDirty = (user: AssignableUser) => {
    const current = [...(draft[user.id] || [])].sort().join(',');
    const saved = [...(user.assignedStationIds || [])].sort().join(',');
    return current !== saved;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory station assignments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign which stations each Customer Care / inventory user can view and manage.
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium">No users need station assignment</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a <strong>Customer Care</strong> user with{' '}
              <strong>Inventory Command Center</strong> permission on the{' '}
              <Link href="/admin/users" className="text-emerald-700 underline">
                Users page
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : stations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium">No stations found</p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Create stations first before assigning users.
            </p>
            <Button asChild>
              <Link href="/admin/stations">Go to Stations</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const selected = draft[user.id] || [];
            const missing = selected.length === 0;

            return (
              <Card
                key={user.id}
                className={missing ? 'border-amber-300 bg-amber-50/30' : undefined}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-700" />
                        {user.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {user.email} · {user.accountTypeLabel}
                        {user.hasInventoryAccess ? ' · Inventory access' : ''}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={() => saveUser(user)}
                      disabled={savingUserId === user.id || !isDirty(user)}
                    >
                      {savingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                  {missing && (
                    <p className="text-sm text-amber-800 mt-2">
                      No stations assigned — this user cannot use inventory until you select at least one.
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <Warehouse className="h-4 w-4" />
                    Stations to manage ({selected.length} selected)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {stations.map((station) => (
                      <label
                        key={station.id}
                        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selected.includes(station.id)}
                          onCheckedChange={() => toggleStation(user.id, station.id)}
                        />
                        <span className="truncate font-medium">{station.stationName}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
