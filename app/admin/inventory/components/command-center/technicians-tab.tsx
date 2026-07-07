'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users } from 'lucide-react';

interface TechnicianAccountability {
  technicianId: string;
  technicianName?: string;
  stationId: string;
  itemsTaken: number;
  itemsReturned: number;
  itemsPending: number;
  cableMetersUsed: number;
}

interface Station {
  id: string;
  stationName: string;
}

interface TechniciansTabProps {
  stationId: string | 'all';
  stations: Station[];
  refreshKey: number;
}

export function TechniciansTab({ stationId, stations, refreshKey }: TechniciansTabProps) {
  const [techs, setTechs] = useState<TechnicianAccountability[]>([]);
  const [technicianNames, setTechnicianNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const issuesUrl =
      stationId !== 'all'
        ? `/api/isp/technician-issues?stationId=${stationId}`
        : '/api/isp/technician-issues?stationId=all';

    Promise.all([
      fetch(issuesUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/isp/technicians', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/isp/cable/usage', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ logs: [] })),
    ])
      .then(([issuesRes, techRes, cableRes]) => {
        const names: Record<string, string> = {};
        (techRes.technicians || []).forEach((t: { id: string; name: string }) => {
          names[t.id] = t.name;
        });
        setTechnicianNames(names);

        const accountability = new Map<string, TechnicianAccountability>();
        for (const issue of issuesRes.issues || []) {
          for (const item of issue.items || []) {
            const key = `${issue.technicianId}-${issue.stationId}`;
            const existing = accountability.get(key) || {
              technicianId: issue.technicianId,
              stationId: issue.stationId,
              itemsTaken: 0,
              itemsReturned: 0,
              itemsPending: 0,
              cableMetersUsed: 0,
            };
            existing.itemsTaken += item.quantityTaken;
            existing.itemsReturned += item.quantityReturned;
            existing.itemsPending += Math.max(0, item.quantityTaken - item.quantityReturned);
            accountability.set(key, existing);
          }
        }
        for (const log of cableRes.logs || []) {
          const key = `${log.technicianId}-${log.stationId}`;
          const existing = accountability.get(key);
          if (existing) {
            existing.cableMetersUsed += log.metersUsed || 0;
          } else {
            accountability.set(key, {
              technicianId: log.technicianId,
              stationId: log.stationId,
              itemsTaken: 0,
              itemsReturned: 0,
              itemsPending: 0,
              cableMetersUsed: log.metersUsed || 0,
            });
          }
        }
        setTechs(Array.from(accountability.values()));
      })
      .finally(() => setLoading(false));
  }, [stationId, refreshKey]);

  const stationName = (id: string) => stations.find((s) => s.id === id)?.stationName || id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Technician Accountability
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : techs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No technician activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  {stationId === 'all' && <TableHead>Station</TableHead>}
                  <TableHead>Items Taken</TableHead>
                  <TableHead>Items Returned</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Cable Used (m)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {techs.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{technicianNames[t.technicianId] || t.technicianId.slice(0, 8)}</TableCell>
                    {stationId === 'all' && <TableCell>{stationName(t.stationId)}</TableCell>}
                    <TableCell>{t.itemsTaken}</TableCell>
                    <TableCell>{t.itemsReturned}</TableCell>
                    <TableCell>{t.itemsPending}</TableCell>
                    <TableCell>{t.cableMetersUsed}</TableCell>
                    <TableCell>
                      {t.itemsPending > 0 ? (
                        <Badge variant="destructive">Pending returns</Badge>
                      ) : (
                        <Badge variant="secondary">Clear</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
