'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, ArrowLeftRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { groupByDay } from './inventory-day-groups';
import { DayGroupedSections } from './day-grouped-list';

interface ReplacementRecord {
  id: string;
  stationId: string;
  technicianId: string;
  technicianName?: string;
  ticketId?: string | null;
  itemName?: string;
  newRouterLabel?: string;
  oldRouterLabel?: string;
  oldRouterSerial?: string | null;
  oldRouterMac?: string | null;
  newRouterSerial?: string | null;
  newRouterMac?: string | null;
  status: 'pending' | 'returned' | 'lost' | 'damaged';
  returnCondition?: string | null;
  returnTime?: string | null;
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

function statusBadge(status: ReplacementRecord['status']) {
  switch (status) {
    case 'pending':
      return <Badge variant="default" className="bg-amber-600 hover:bg-amber-600">Awaiting return</Badge>;
    case 'returned':
      return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Returned</Badge>;
    case 'lost':
      return <Badge variant="destructive">Not returned / Lost</Badge>;
    case 'damaged':
      return <Badge variant="destructive">Damaged</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface RouterReplacementReturnsPanelProps {
  stationId: string;
  refreshKey?: number;
  onRefresh: () => void;
}

export function RouterReplacementReturnsPanel({
  stationId,
  refreshKey = 0,
  onRefresh,
}: RouterReplacementReturnsPanelProps) {
  const [records, setRecords] = useState<ReplacementRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selected, setSelected] = useState<ReplacementRecord | null>(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [oldSerial, setOldSerial] = useState('');
  const [oldMac, setOldMac] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRecords = useCallback(() => {
    setLoading(true);
    const status = showResolved ? 'pending,returned,lost,damaged' : 'pending';
    fetch(`/api/isp/router-replacements?stationId=${stationId}&status=${status}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.replacements || []);
        setPendingCount(d.pendingCount ?? (d.replacements || []).filter((r: ReplacementRecord) => r.status === 'pending').length);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [stationId, showResolved]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords, refreshKey]);

  const pendingRecords = useMemo(
    () => records.filter((r) => r.status === 'pending'),
    [records]
  );
  const resolvedRecords = useMemo(
    () => records.filter((r) => r.status !== 'pending'),
    [records]
  );

  const pendingByDay = useMemo(
    () => groupByDay(pendingRecords, (r) => r.createdAt),
    [pendingRecords]
  );
  const resolvedByDay = useMemo(
    () => groupByDay(resolvedRecords, (r) => r.returnTime || r.createdAt),
    [resolvedRecords]
  );

  const openReturn = (rec: ReplacementRecord) => {
    setSelected(rec);
    setOldSerial(rec.oldRouterSerial || '');
    setOldMac(rec.oldRouterMac || '');
    setReturnCondition('Good');
    setNotes('');
    setReturnOpen(true);
  };

  const handleReturn = (markLost = false) => {
    if (!selected) return;
    setSubmitting(true);
    fetch('/api/isp/router-replacements/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replacementId: selected.id,
        returnCondition: markLost ? 'Lost' : returnCondition,
        returnStationId: stationId,
        oldRouterSerial: oldSerial.trim() || undefined,
        oldRouterMac: oldMac.trim() || undefined,
        notes: notes.trim() || undefined,
        markLost,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success(
          markLost
            ? 'Marked as not returned'
            : d.stockRestored
              ? 'Old router returned to stock'
              : 'Replacement return recorded'
        );
        setReturnOpen(false);
        setSelected(null);
        loadRecords();
        onRefresh();
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setSubmitting(false));
  };

  const renderRecord = (rec: ReplacementRecord, showAction: boolean) => (
    <div key={rec.id} className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm">{rec.itemName || 'Router'}</p>
          <p className="text-xs text-muted-foreground">
            {rec.technicianName || rec.technicianId}
            {rec.ticketId && <> · Ticket {rec.ticketId}</>}
          </p>
        </div>
        {statusBadge(rec.status)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-muted-foreground">New (installed)</p>
          <p className="font-mono font-medium truncate">{rec.newRouterLabel || rec.newRouterSerial || rec.newRouterMac || '—'}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-muted-foreground">Old (from client)</p>
          <p className="font-mono font-medium truncate">{rec.oldRouterLabel || rec.oldRouterSerial || rec.oldRouterMac || '—'}</p>
        </div>
      </div>
      {rec.status === 'pending' ? (
        <p className="text-[11px] text-amber-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Old router not yet returned to station
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {rec.status === 'returned' ? (
            <span className="inline-flex items-center gap-1 text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Returned {fmtDateTime(rec.returnTime)}
              {rec.returnCondition && ` · ${rec.returnCondition}`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-destructive">
              <XCircle className="h-3 w-3" /> {rec.status === 'lost' ? 'Not returned' : 'Damaged'} · {fmtDateTime(rec.returnTime)}
            </span>
          )}
        </p>
      )}
      {showAction && rec.status === 'pending' && (
        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => openReturn(rec)}>
          Process old router return
        </Button>
      )}
    </div>
  );

  if (loading && records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading router replacements…
        </CardContent>
      </Card>
    );
  }

  if (!showResolved && pendingRecords.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Router Replacements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No pending replacement returns. When a technician swaps a router at a client site (via ticket), the old unit appears here until returned.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowResolved(true)}>
            Show resolved replacements
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Router Replacements
            {pendingCount > 0 && <Badge variant="secondary">{pendingCount} awaiting</Badge>}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadRecords} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Tracks old routers removed from clients during replacements. Process return when the technician brings the old unit back.
          </p>

          {pendingRecords.length > 0 && (
            <DayGroupedSections
              groups={pendingByDay}
              renderItems={(items) => (
                <div className="space-y-3">{items.map((rec) => renderRecord(rec, true))}</div>
              )}
            />
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResolved((v) => !v)}
            >
              {showResolved ? 'Hide resolved' : 'Show returned / not returned'}
            </Button>
          </div>

          {showResolved && resolvedRecords.length > 0 && (
            <div className="pt-2 border-t space-y-3">
              <p className="text-sm font-medium">Resolved replacements</p>
              <DayGroupedSections
                groups={resolvedByDay}
                renderItems={(items) => (
                  <div className="space-y-3">{items.map((rec) => renderRecord(rec, false))}</div>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return old router from replacement</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm bg-muted/50 rounded-md p-3 space-y-1">
                <p>Technician: <strong>{selected.technicianName}</strong></p>
                <p>New installed: <span className="font-mono">{selected.newRouterLabel}</span></p>
                <p>Expected old unit: <span className="font-mono">{selected.oldRouterLabel}</span></p>
                {selected.ticketId && <p>Ticket: {selected.ticketId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Old router serial (confirm)</Label>
                <Input
                  value={oldSerial}
                  onChange={(e) => setOldSerial(e.target.value)}
                  className="font-mono"
                  placeholder="Serial on unit being returned"
                />
              </div>
              <div className="space-y-2">
                <Label>Old router MAC (confirm)</Label>
                <Input
                  value={oldMac}
                  onChange={(e) => setOldMac(e.target.value)}
                  className="font-mono"
                  placeholder="MAC on unit being returned"
                />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={returnCondition} onValueChange={setReturnCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good — add back to stock</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="Repair">Sent to repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={submitting}
              onClick={() => handleReturn(true)}
            >
              Mark not returned / lost
            </Button>
            <Button variant="outline" onClick={() => setReturnOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" disabled={submitting} onClick={() => handleReturn(false)}>
              {submitting ? 'Saving…' : 'Confirm return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
