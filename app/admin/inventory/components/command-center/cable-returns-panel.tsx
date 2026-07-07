'use client';

import { useState, useEffect } from 'react';
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
import { Cable, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CableLog {
  id: string;
  rollId: string;
  technicianId: string;
  technicianName?: string;
  metersIssued: number;
  metersReturned: number;
  metersUsed: number;
  createdAt: string;
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
    fetch(`/api/isp/cable/usage?stationId=${stationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [stationId, refreshKey]);

  const pending = logs.filter((l) => l.metersReturned < l.metersIssued);

  const openReturn = (log: CableLog) => {
    const outstanding = log.metersIssued - log.metersReturned;
    setSelectedLog(log);
    setReturnMeters(String(outstanding));
    setUsedMeters('');
    setWasteMeters('');
    setReturnOpen(true);
  };

  const handleReturn = () => {
    if (!selectedLog) return;
    const returned = parseFloat(returnMeters) || 0;
    const used = parseFloat(usedMeters) || 0;
    const waste = parseFloat(wasteMeters) || 0;
    const outstanding = selectedLog.metersIssued - selectedLog.metersReturned;

    if (returned + used + waste <= 0) {
      toast.error('Enter used, returned, or damaged meters');
      return;
    }
    if (returned + used + waste > outstanding) {
      toast.error(`Total cannot exceed ${outstanding}m outstanding`);
      return;
    }

    fetch('/api/isp/cable/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usageLogId: selectedLog.id,
        metersReturned: returned,
        wasteMeters: waste,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Cable return recorded');
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

  if (pending.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cable className="h-4 w-4" />
            Cable Returns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No outstanding cable to return.</p>
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
            Cable Returns
            <Badge variant="secondary">{pending.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.map((log) => {
            const outstanding = log.metersIssued - log.metersReturned;
            return (
              <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{log.technicianName || log.technicianId}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued {log.metersIssued}m · {fmtDateTime(log.createdAt)}
                  </p>
                  <p className="text-xs mt-0.5">
                    Outstanding: <strong>{outstanding}m</strong>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openReturn(log)}>
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  Return
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Return Cable</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Issued: {selectedLog?.metersIssued}m · Outstanding:{' '}
              {(selectedLog?.metersIssued || 0) - (selectedLog?.metersReturned || 0)}m
            </p>
            <div className="space-y-2">
              <Label>Returned unused (m)</Label>
              <Input type="number" min={0} value={returnMeters} onChange={(e) => setReturnMeters(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Used (m)</Label>
              <Input type="number" min={0} value={usedMeters} onChange={(e) => setUsedMeters(e.target.value)} placeholder="For your records" />
            </div>
            <div className="space-y-2">
              <Label>Damaged / wasted (m)</Label>
              <Input type="number" min={0} value={wasteMeters} onChange={(e) => setWasteMeters(e.target.value)} />
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
