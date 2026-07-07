'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cable, ArrowUpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  refreshKey?: number;
  onRefresh: () => void;
}

export function IssueCablePanel({ stationId, refreshKey = 0, onRefresh }: IssueCablePanelProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [rolls, setRolls] = useState<CableRoll[]>([]);
  const [cableItems, setCableItems] = useState<CableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    technicianId: '',
    cableItemId: '',
    rollId: '',
    meters: '',
    jobReference: '',
    notes: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/isp/technicians?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/cable?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/inventory?stationId=${stationId}&unitType=m`, { cache: 'no-store' }).then((r) => r.json()),
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
    loadData();
  }, [stationId, refreshKey]);

  const selectedRoll = rolls.find((r) => r.id === form.rollId);
  const filteredRolls = form.cableItemId
    ? rolls.filter((r) => {
        const item = cableItems.find((i) => i.id === form.cableItemId);
        return item ? r.cableType === item.itemName : true;
      })
    : rolls;

  const handleIssue = async () => {
    if (!form.technicianId) return toast.error('Select a technician');
    if (!form.rollId) return toast.error('Select a cable roll');
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
          jobReference: form.jobReference || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue cable');
      toast.success(
        `Issued ${meters}m from roll ${selectedRoll?.rollCode} to technician`
      );
      setForm({ technicianId: '', cableItemId: '', rollId: '', meters: '', jobReference: '', notes: '' });
      loadData();
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
              Select the exact roll and meters issued. Returns are tracked per roll — used vs returned unused.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Technician</Label>
                <Select value={form.technicianId} onValueChange={(v) => setForm({ ...form, technicianId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              {selectedRoll && (
                <p className="text-xs text-muted-foreground">
                  Roll <strong>{selectedRoll.rollCode}</strong> · {selectedRoll.currentRemainingMeters}m remaining on spool
                </p>
              )}
            </div>

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
                <Label>Project / customer</Label>
                <Input
                  value={form.jobReference}
                  onChange={(e) => setForm({ ...form, jobReference: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

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
