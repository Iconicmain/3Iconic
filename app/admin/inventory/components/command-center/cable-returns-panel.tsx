'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Cable, ArrowDownCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { softBadgeClass } from './inventory-colors';
import { groupByDay } from './inventory-day-groups';
import { DayGroupedSections } from './day-grouped-list';

interface CableLog {
  id: string;
  rollId: string;
  rollCode?: string;
  cableType?: string;
  technicianId: string;
  technicianName?: string;
  issueType?: string;
  sourceStationId?: string;
  sourceStationName?: string;
  primaryStationId?: string;
  primaryStationName?: string;
  sharedStationIds?: string[];
  sharedStationNames?: string[];
  expectedReturnDate?: string | null;
  metersIssued: number;
  metersReturned: number;
  metersUsed: number;
  wasteMeters?: number;
  outstandingMeters?: number;
  createdAt: string;
}

function sharedCableLabel(log: CableLog): string | null {
  if (log.issueType !== 'SHARED_STATIONS') return null;
  const primary = log.primaryStationName || log.primaryStationId;
  const shared = log.sharedStationNames?.length
    ? log.sharedStationNames.join(', ')
    : log.sharedStationIds?.join(', ');
  if (primary && shared) return `${primary} + ${shared}`;
  return primary || shared || null;
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CableReturnsPanelProps {
  stationId: string;
  refreshKey?: number;
  onRefresh: () => void;
}

export function CableReturnsPanel({ stationId, refreshKey = 0, onRefresh }: CableReturnsPanelProps) {
  const [logs, setLogs] = useState<CableLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CableLog | null>(null);
  const [returnMeters, setReturnMeters] = useState('');
  const [usedMeters, setUsedMeters] = useState('');
  const [wasteMeters, setWasteMeters] = useState('');

  const loadLogs = () => {
    setLoading(true);
    fetch(`/api/isp/cable/usage?stationId=${stationId}&pendingOnly=true`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [stationId, refreshKey]);

  const logsByDay = useMemo(
    () => groupByDay(logs, (log) => log.createdAt),
    [logs]
  );

  const openReturn = (log: CableLog) => {
    const outstanding = log.outstandingMeters ?? log.metersIssued - log.metersReturned - log.metersUsed - (log.wasteMeters || 0);
    setSelectedLog(log);
    setReturnMeters('');
    setUsedMeters(String(outstanding));
    setWasteMeters('');
    setReturnOpen(true);
  };

  const handleReturn = () => {
    if (!selectedLog) return;
    const returned = parseFloat(returnMeters) || 0;
    const used = parseFloat(usedMeters) || 0;
    const waste = parseFloat(wasteMeters) || 0;
    const outstanding =
      selectedLog.outstandingMeters ??
      selectedLog.metersIssued - selectedLog.metersReturned - selectedLog.metersUsed - (selectedLog.wasteMeters || 0);

    if (returned + used + waste <= 0) {
      toast.error('Enter used, returned unused, or damaged meters');
      return;
    }
    if (returned + used + waste > outstanding) {
      toast.error(`Total cannot exceed ${outstanding}m outstanding on roll ${selectedLog.rollCode}`);
      return;
    }

    fetch('/api/isp/cable/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usageLogId: selectedLog.id,
        metersReturned: returned,
        metersUsed: used,
        wasteMeters: waste,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success(`Roll ${selectedLog.rollCode}: ${used}m used, ${returned}m returned to roll`);
        setReturnOpen(false);
        loadLogs();
        onRefresh();
      })
      .catch((e) => toast.error(e.message));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading cable returns…</CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cable className="h-4 w-4" />
            Cable Returns (by roll)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No outstanding cable issues per roll.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cable className="h-4 w-4" />
            Cable Returns (by roll)
            <Badge variant="secondary">{logs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DayGroupedSections
            groups={logsByDay}
            renderItems={(dayLogs) => (
              <div className="space-y-3">
                {dayLogs.map((log) => {
                  const outstanding =
                    log.outstandingMeters ??
                    log.metersIssued - log.metersReturned - log.metersUsed - (log.wasteMeters || 0);
                  const shared = sharedCableLabel(log);
                  return (
                    <div key={log.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            Roll <span className="font-mono">{log.rollCode || log.rollId}</span>
                            {log.cableType && <span className="text-muted-foreground font-normal"> · {log.cableType}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.technicianName || log.technicianId} · Issued {fmtDateTime(log.createdAt)}
                          </p>
                          {log.sourceStationName && (
                            <p className="text-xs text-muted-foreground">From: {log.sourceStationName}</p>
                          )}
                          {shared && (
                            <p className="text-[11px] text-indigo-700 flex items-center gap-1 mt-0.5">
                              <Share2 className="h-3 w-3 shrink-0" /> {shared}
                            </p>
                          )}
                          {log.expectedReturnDate && (
                            <p className="text-[11px] text-muted-foreground">
                              Expected return: {fmtDateTime(log.expectedReturnDate)}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openReturn(log)}>
                          <ArrowDownCircle className="h-4 w-4 mr-1" />
                          Return
                        </Button>
                      </div>
                      {shared && (
                        <span className={softBadgeClass('bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]')}>
                          Shared station issue
                        </span>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Issued</span><p className="font-medium">{log.metersIssued}m</p></div>
                        <div><span className="text-muted-foreground">Used</span><p className="font-medium">{log.metersUsed || 0}m</p></div>
                        <div><span className="text-muted-foreground">Returned</span><p className="font-medium">{log.metersReturned || 0}m</p></div>
                        <div><span className="text-muted-foreground">Outstanding</span><p className="font-medium text-amber-600">{outstanding}m</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Cable — Roll {selectedLog?.rollCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm bg-muted/50 rounded-md p-3 space-y-1">
              <p>Roll: <strong className="font-mono">{selectedLog?.rollCode}</strong> · {selectedLog?.cableType}</p>
              <p>Issued to tech: <strong>{selectedLog?.metersIssued}m</strong></p>
              <p>Already used: {selectedLog?.metersUsed || 0}m · Returned to roll: {selectedLog?.metersReturned || 0}m</p>
              <p>Outstanding on this issue: <strong>{selectedLog ? (selectedLog.outstandingMeters ?? selectedLog.metersIssued - selectedLog.metersReturned - selectedLog.metersUsed - (selectedLog.wasteMeters || 0)) : 0}m</strong></p>
            </div>
            <div className="space-y-2">
              <Label>Used on job (m)</Label>
              <Input type="number" min={0} value={usedMeters} onChange={(e) => setUsedMeters(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Returned unused to roll (m)</Label>
              <Input type="number" min={0} value={returnMeters} onChange={(e) => setReturnMeters(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Damaged / wasted (m)</Label>
              <Input type="number" min={0} value={wasteMeters} onChange={(e) => setWasteMeters(e.target.value)} />
              <p className="text-xs text-muted-foreground">Damaged cable is not added back to roll stock</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={handleReturn}>Record Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
