'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ISSUE_TYPE_OPTIONS, type IssueType } from '@/lib/isp/issue-types';
import { softBadgeClass } from './inventory-colors';

interface Station {
  id: string;
  stationName: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  unitType: string;
  quantityAvailable: number;
}

interface Technician {
  id: string;
  name: string;
}

interface RouterUnitOption {
  id: string;
  serialNumber?: string | null;
  macAddress?: string | null;
}

export interface IssueLineItem {
  itemId: string;
  quantityTaken: number;
  unitType: string;
  routerUnitIds: string[];
}

interface IssueEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stations: Station[];
  technicians: Technician[];
  onSuccess: () => void;
}

export function IssueEquipmentDialog({
  open,
  onOpenChange,
  stationId,
  stations,
  technicians,
  onSuccess,
}: IssueEquipmentDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<Record<number, RouterUnitOption[]>>({});
  const [form, setForm] = useState({
    issueType: 'SINGLE_STATION' as IssueType,
    sourceStationId: stationId,
    primaryStationId: stationId,
    sharedStationIds: [] as string[],
    technicianId: '',
    projectCustomer: '',
    expectedReturnDate: '',
    notes: '',
    lines: [] as IssueLineItem[],
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      issueType: 'SINGLE_STATION',
      sourceStationId: stationId,
      primaryStationId: stationId,
      sharedStationIds: [],
      technicianId: '',
      projectCustomer: '',
      expectedReturnDate: '',
      notes: '',
      lines: [],
    });
    setAvailableUnits({});
  }, [open, stationId]);

  useEffect(() => {
    if (!open || !form.sourceStationId) return;
    setLoadingItems(true);
    fetch(`/api/isp/inventory?stationId=${form.sourceStationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) =>
        setItems(
          (d.items || []).filter(
            (i: InventoryItem & { isCable?: boolean; category?: string }) =>
              !i.isCable && i.category !== 'Drop Cable'
          )
        )
      )
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  }, [open, form.sourceStationId]);

  const showShared = form.issueType === 'SHARED_STATIONS';
  const showProject = form.issueType === 'PROJECT';

  const otherStations = stations.filter((s) => s.id !== form.primaryStationId);

  const fetchUnits = (idx: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    fetch(
      `/api/isp/routers?stationId=${form.sourceStationId}&itemName=${encodeURIComponent(item.itemName)}&status=available`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((d) => setAvailableUnits((p) => ({ ...p, [idx]: d.routers || [] })))
      .catch(() => setAvailableUnits((p) => ({ ...p, [idx]: [] })));
  };

  const addLine = () => {
    if (form.lines.length >= 10) return;
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { itemId: '', quantityTaken: 1, unitType: 'pcs', routerUnitIds: [] }],
    }));
  };

  const toggleShared = (id: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      sharedStationIds: checked
        ? [...f.sharedStationIds, id]
        : f.sharedStationIds.filter((s) => s !== id),
    }));
  };

  const handleSubmit = async () => {
    if (!form.technicianId) return toast.error('Select a technician');
    if (showShared && form.sharedStationIds.length === 0) {
      return toast.error('Select at least one shared station');
    }

    const validLines = form.lines
      .map((line, idx) => ({ ...line, idx }))
      .filter(({ itemId, routerUnitIds, quantityTaken, idx }) => {
        if (!itemId) return false;
        const units = availableUnits[idx] || [];
        if (units.length > 0) return routerUnitIds.length > 0;
        return quantityTaken > 0;
      });

    if (validLines.length === 0) return toast.error('Add at least one item');

    setSubmitting(true);
    try {
      const res = await fetch('/api/isp/technician-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: form.sourceStationId,
          sourceStationId: form.sourceStationId,
          primaryStationId: form.primaryStationId,
          issueType: form.issueType,
          sharedStationIds: showShared ? form.sharedStationIds : undefined,
          projectCustomer: showProject ? form.projectCustomer : form.projectCustomer || undefined,
          expectedReturnDate: form.expectedReturnDate || undefined,
          technicianId: form.technicianId,
          jobReference: form.projectCustomer || undefined,
          notes: form.notes || undefined,
          items: validLines.map((line) => {
            const units = availableUnits[line.idx] || [];
            return {
              itemId: line.itemId,
              quantityTaken: units.length > 0 ? line.routerUnitIds.length : line.quantityTaken,
              unitType: items.find((i) => i.id === line.itemId)?.unitType || 'pcs',
              routerUnitIds: line.routerUnitIds.length ? line.routerUnitIds : undefined,
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue');
      toast.success(
        showShared
          ? 'Equipment issued for shared station use'
          : 'Equipment issued successfully'
      );
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 max-h-[min(90vh,100dvh)] flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">Issue equipment</DialogTitle>
          <DialogDescription className="text-xs">
            Stock deducts from source station · shared issues track co-located stations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Issue type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {ISSUE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      issueType: opt.value,
                      sharedStationIds: opt.value === 'SHARED_STATIONS' ? f.sharedStationIds : [],
                    }))
                  }
                  className={cn(
                    'rounded-lg border px-2 py-2 text-left transition-colors',
                    form.issueType === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Source station (stock from)</Label>
              <Select
                value={form.sourceStationId}
                onValueChange={(v) => setForm((f) => ({ ...f, sourceStationId: v, lines: [] }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Technician responsible</Label>
              <Select value={form.technicianId} onValueChange={(v) => setForm((f) => ({ ...f, technicianId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showShared && (
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 space-y-3">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Shared station details</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary station</Label>
                <Select
                  value={form.primaryStationId}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      primaryStationId: v,
                      sharedStationIds: f.sharedStationIds.filter((id) => id !== v),
                    }))
                  }
                >
                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shared with station(s)</Label>
                <div className="flex flex-wrap gap-2">
                  {otherStations.map((s) => (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer',
                        form.sharedStationIds.includes(s.id)
                          ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
                          : 'bg-background'
                      )}
                    >
                      <Checkbox
                        checked={form.sharedStationIds.includes(s.id)}
                        onCheckedChange={(c) => toggleShared(s.id, !!c)}
                      />
                      {s.stationName}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(showProject || form.issueType === 'TECHNICIAN_ONLY') && (
            <div className="space-y-1.5">
              <Label className="text-xs">Project / customer {showProject ? '' : '(optional)'}</Label>
              <Input
                value={form.projectCustomer}
                onChange={(e) => setForm((f) => ({ ...f, projectCustomer: e.target.value }))}
                placeholder="Customer name or job reference"
                className="h-9"
              />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Expected return date</Label>
              <Input
                type="date"
                value={form.expectedReturnDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedReturnDate: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="h-9"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Items</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add item
              </Button>
            </div>
            {loadingItems ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {form.lines.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    Add items to issue from {stations.find((s) => s.id === form.sourceStationId)?.stationName}
                  </p>
                )}
                {form.lines.map((line, idx) => {
                  const units = availableUnits[idx] || [];
                  const hasUnits = units.length > 0;
                  return (
                    <div key={idx} className="rounded-lg border p-3 space-y-2 bg-card">
                      <div className="flex gap-2">
                        <Select
                          value={line.itemId}
                          onValueChange={(v) => {
                            const item = items.find((i) => i.id === v);
                            setForm((f) => ({
                              ...f,
                              lines: f.lines.map((row, i) =>
                                i === idx
                                  ? { ...row, itemId: v, routerUnitIds: [], unitType: item?.unitType || 'pcs' }
                                  : row
                              ),
                            }));
                            fetchUnits(idx, v);
                          }}
                        >
                          <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Item" /></SelectTrigger>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.itemName} ({i.quantityAvailable} avail)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!hasUnits && (
                          <Input
                            type="number"
                            min={1}
                            className="w-20 h-9"
                            value={line.quantityTaken}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                lines: f.lines.map((row, i) =>
                                  i === idx ? { ...row, quantityTaken: parseInt(e.target.value, 10) || 1 } : row
                                ),
                              }))
                            }
                          />
                        )}
                        {hasUnits && (
                          <Badge variant="secondary" className="shrink-0 self-center">
                            {line.routerUnitIds.length} units
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() =>
                            setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))
                          }
                        >
                          ×
                        </Button>
                      </div>
                      {hasUnits && (
                        <div className="grid gap-1 max-h-24 overflow-y-auto">
                          {units.map((u) => (
                            <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={line.routerUnitIds.includes(u.id)}
                                onCheckedChange={(c) =>
                                  setForm((f) => ({
                                    ...f,
                                    lines: f.lines.map((row, i) => {
                                      if (i !== idx) return row;
                                      const ids = c
                                        ? [...row.routerUnitIds, u.id]
                                        : row.routerUnitIds.filter((id) => id !== u.id);
                                      return { ...row, routerUnitIds: ids };
                                    }),
                                  }))
                                }
                              />
                              <span className="font-mono">{u.serialNumber || u.macAddress}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showShared && form.sharedStationIds.length > 0 && (
            <p className={softBadgeClass('bg-indigo-100 text-indigo-800 border-indigo-200 text-xs')}>
              Deducts from {stations.find((s) => s.id === form.sourceStationId)?.stationName} · For{' '}
              {stations.find((s) => s.id === form.primaryStationId)?.stationName} +{' '}
              {form.sharedStationIds.map((id) => stations.find((s) => s.id === id)?.stationName).join(', ')}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t px-5 py-3 flex gap-2 bg-muted/20">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue equipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
