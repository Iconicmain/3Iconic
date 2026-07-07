'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cable, ArrowUpCircle, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ISSUE_TYPE_OPTIONS, type IssueType } from '@/lib/isp/issue-types';
import { softBadgeClass } from './inventory-colors';

interface Station {
  id: string;
  stationName: string;
}

interface Technician {
  id: string;
  name: string;
}

interface CableRoll {
  id: string;
  rollCode: string;
  cableType: string;
  currentRemainingMeters: number;
  status: string;
}

interface CableItem {
  id: string;
  itemName: string;
}

interface IssueCablePanelProps {
  stationId: string;
  stations?: Station[];
  refreshKey?: number;
  onRefresh: () => void;
}

export function IssueCablePanel({
  stationId,
  stations = [],
  refreshKey = 0,
  onRefresh,
}: IssueCablePanelProps) {
  const stationOptions = stations.length > 0 ? stations : [{ id: stationId, stationName: stationId }];

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [rolls, setRolls] = useState<CableRoll[]>([]);
  const [cableItems, setCableItems] = useState<CableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    issueType: 'SINGLE_STATION' as IssueType,
    sourceStationId: stationId,
    primaryStationId: stationId,
    sharedStationIds: [] as string[],
    technicianId: '',
    cableItemId: '',
    rollId: '',
    meters: '',
    projectCustomer: '',
    expectedReturnDate: '',
    notes: '',
  });

  const showShared = form.issueType === 'SHARED_STATIONS';
  const showProject = form.issueType === 'PROJECT';
  const otherStations = stationOptions.filter((s) => s.id !== form.primaryStationId);

  const loadData = (sourceId: string) => {
    setLoading(true);
    Promise.all([
      fetch(`/api/isp/technicians?stationId=${sourceId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/cable?stationId=${sourceId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/inventory?stationId=${sourceId}&unitType=m`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([tech, cable, inv]) => {
        setTechnicians(tech.technicians || []);
        setRolls(
          (cable.rolls || []).filter(
            (r: CableRoll) => r.status === 'ACTIVE' && r.currentRemainingMeters > 0
          )
        );
        setCableItems(inv.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(form.sourceStationId);
  }, [form.sourceStationId, refreshKey]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      sourceStationId: stationId,
      primaryStationId: stationId,
      sharedStationIds: [],
      rollId: '',
    }));
  }, [stationId]);

  const selectedRoll = rolls.find((r) => r.id === form.rollId);
  const filteredRolls = form.cableItemId
    ? rolls.filter((r) => {
        const item = cableItems.find((i) => i.id === form.cableItemId);
        return item ? r.cableType === item.itemName : true;
      })
    : rolls;

  const toggleShared = (id: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      sharedStationIds: checked
        ? [...f.sharedStationIds, id]
        : f.sharedStationIds.filter((s) => s !== id),
    }));
  };

  const handleIssue = async () => {
    if (!form.technicianId) return toast.error('Select a technician');
    if (!form.rollId) return toast.error('Select a cable roll');
    if (showShared && form.sharedStationIds.length === 0) {
      return toast.error('Select at least one shared station');
    }
    const meters = parseFloat(form.meters);
    if (!meters || meters <= 0) return toast.error('Enter meters to issue');
    if (selectedRoll && meters > selectedRoll.currentRemainingMeters) {
      return toast.error(`Roll ${selectedRoll.rollCode} only has ${selectedRoll.currentRemainingMeters}m remaining`);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/isp/cable/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollId: form.rollId,
          technicianId: form.technicianId,
          metersIssued: meters,
          issueType: form.issueType,
          sourceStationId: form.sourceStationId,
          primaryStationId: form.primaryStationId,
          sharedStationIds: showShared ? form.sharedStationIds : undefined,
          projectCustomer: showProject ? form.projectCustomer : form.projectCustomer || undefined,
          jobReference: form.projectCustomer || undefined,
          expectedReturnDate: form.expectedReturnDate || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue cable');
      toast.success(
        showShared
          ? `Issued ${meters}m for shared station use`
          : `Issued ${meters}m from roll ${selectedRoll?.rollCode}`
      );
      setForm({
        issueType: 'SINGLE_STATION',
        sourceStationId: stationId,
        primaryStationId: stationId,
        sharedStationIds: [],
        technicianId: '',
        cableItemId: '',
        rollId: '',
        meters: '',
        projectCustomer: '',
        expectedReturnDate: '',
        notes: '',
      });
      loadData(stationId);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Cable className="h-4 w-4" />
          Issue Cable (by roll)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading rolls…
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Select roll and meters. Use <strong>Shared stations</strong> when cable serves co-located sites — stock deducts from source station.
            </p>

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
              <div className="space-y-2">
                <Label className="text-xs">Source station (roll from)</Label>
                <Select
                  value={form.sourceStationId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, sourceStationId: v, rollId: '', cableItemId: '' }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stationOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Technician responsible</Label>
                <Select value={form.technicianId} onValueChange={(v) => setForm({ ...form, technicianId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
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
                      {stationOptions.map((s) => (
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

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cable item</Label>
                <Select
                  value={form.cableItemId}
                  onValueChange={(v) => setForm({ ...form, cableItemId: v, rollId: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Filter by cable type" /></SelectTrigger>
                  <SelectContent>
                    {cableItems.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Roll</Label>
                <Select value={form.rollId} onValueChange={(v) => setForm({ ...form, rollId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select roll" /></SelectTrigger>
                  <SelectContent>
                    {filteredRolls.length === 0 ? (
                      <SelectItem value="_none" disabled>No active rolls</SelectItem>
                    ) : (
                      filteredRolls.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.rollCode} — {r.cableType} — {r.currentRemainingMeters}m left
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedRoll && (
              <p className="text-xs text-muted-foreground">
                Roll <strong>{selectedRoll.rollCode}</strong> · {selectedRoll.currentRemainingMeters}m remaining on spool
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Meters to issue</Label>
                <Input
                  type="number"
                  min={0.01}
                  max={selectedRoll?.currentRemainingMeters}
                  value={form.meters}
                  onChange={(e) => setForm({ ...form, meters: e.target.value })}
                  placeholder="e.g. 150"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected return date</Label>
                <Input
                  type="date"
                  value={form.expectedReturnDate}
                  onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
                />
              </div>
            </div>

            {(showProject || form.issueType === 'TECHNICIAN_ONLY') && (
              <div className="space-y-2">
                <Label>Project / customer {showProject ? '' : '(optional)'}</Label>
                <Input
                  value={form.projectCustomer}
                  onChange={(e) => setForm({ ...form, projectCustomer: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>

            {showShared && form.sharedStationIds.length > 0 && (
              <p className={softBadgeClass('bg-indigo-100 text-indigo-800 border-indigo-200 text-xs')}>
                Deducts from {stationOptions.find((s) => s.id === form.sourceStationId)?.stationName} · For{' '}
                {stationOptions.find((s) => s.id === form.primaryStationId)?.stationName} +{' '}
                {form.sharedStationIds.map((id) => stationOptions.find((s) => s.id === id)?.stationName).join(', ')}
              </p>
            )}

            <Button onClick={handleIssue} disabled={submitting || filteredRolls.length === 0} className="w-full sm:w-auto">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpCircle className="h-4 w-4 mr-2" />}
              Issue Cable from Roll
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
