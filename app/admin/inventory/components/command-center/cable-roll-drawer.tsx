'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { StockItem } from './stock-tab';

interface RollDetail {
  id: string;
  rollCode: string;
  originalMeters: number;
  remainingMeters: number;
  metersIssued: number;
  metersUsed: number;
  metersReturned: number;
  wasteMeters: number;
  status: string;
  lastMovement: string;
}

interface Technician {
  id: string;
  name: string;
}

interface CableRollDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockItem | null;
  stationId: string;
  onRefresh: () => void;
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

function rollStatusBadge(status: string, remaining: number) {
  if (status === 'DAMAGED') return <Badge variant="destructive">Damaged</Badge>;
  if (status === 'FINISHED' || status === 'CLOSED' || remaining <= 0) return <Badge variant="secondary">Finished</Badge>;
  if (remaining < 1000 && remaining > 0) return <Badge className="bg-amber-500">Active</Badge>;
  return <Badge variant="outline">Full</Badge>;
}

export function CableRollDrawer({ open, onOpenChange, item, stationId, onRefresh }: CableRollDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState<RollDetail[]>([]);
  const [summary, setSummary] = useState({
    totalOriginal: 0,
    totalRemaining: 0,
    activeRolls: 0,
    finishedRolls: 0,
    totalWaste: 0,
  });
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState<RollDetail | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [issueForm, setIssueForm] = useState({ technicianId: '', meters: '', jobReference: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchRolls = () => {
    if (!item) return;
    setLoading(true);
    fetch(`/api/isp/inventory/cable-rolls?itemId=${item.id}&stationId=${stationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRolls(d.rolls || []);
        setSummary({
          totalOriginal: d.totalOriginal || 0,
          totalRemaining: d.totalRemaining || 0,
          activeRolls: d.activeRolls || 0,
          finishedRolls: d.finishedRolls || 0,
          totalWaste: d.totalWaste || 0,
        });
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && item) fetchRolls();
  }, [open, item?.id, stationId]);

  useEffect(() => {
    if (!issueOpen) return;
    fetch(`/api/isp/technicians?stationId=${stationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setTechnicians(d.technicians || []))
      .catch(() => setTechnicians([]));
  }, [issueOpen, stationId]);

  const openIssue = (roll: RollDetail) => {
    if (roll.remainingMeters <= 0 || roll.status === 'FINISHED' || roll.status === 'CLOSED' || roll.status === 'DAMAGED') {
      toast.error('This roll is not available for issuing');
      return;
    }
    setSelectedRoll(roll);
    setIssueForm({ technicianId: '', meters: '', jobReference: '', notes: '' });
    setIssueOpen(true);
  };

  const handleIssue = async () => {
    if (!selectedRoll) return;
    const meters = parseFloat(issueForm.meters);
    if (!issueForm.technicianId) return toast.error('Select a technician');
    if (!meters || meters <= 0) return toast.error('Enter meters to issue');
    if (meters > selectedRoll.remainingMeters) {
      return toast.error(`Cannot issue more than ${selectedRoll.remainingMeters}m remaining`);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/isp/cable/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollId: selectedRoll.id,
          technicianId: issueForm.technicianId,
          metersIssued: meters,
          jobReference: issueForm.jobReference || undefined,
          notes: issueForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Issue failed');
      toast.success(`Issued ${meters}m from ${selectedRoll.rollCode}`);
      setIssueOpen(false);
      fetchRolls();
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{item?.itemName} Roll Details</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Total remaining</p>
                  <p className="font-semibold text-lg">{summary.totalRemaining.toLocaleString()}m</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Total original</p>
                  <p className="font-semibold text-lg">{summary.totalOriginal.toLocaleString()}m</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Active rolls</p>
                  <p className="font-semibold">{summary.activeRolls}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Finished / waste</p>
                  <p className="font-semibold">{summary.finishedRolls} / {summary.totalWaste}m</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll ID</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead className="hidden sm:table-cell">Issued</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rolls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No rolls yet. Add stock to create rolls.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rolls.map((roll) => (
                        <TableRow key={roll.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{roll.rollCode}</p>
                            <p className="text-xs text-muted-foreground">{roll.originalMeters}m original</p>
                          </TableCell>
                          <TableCell className="font-medium">{roll.remainingMeters}m</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {roll.metersIssued}m
                          </TableCell>
                          <TableCell>{rollStatusBadge(roll.status, roll.remainingMeters)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={roll.remainingMeters <= 0 || ['FINISHED', 'CLOSED', 'DAMAGED'].includes(roll.status)}
                              onClick={() => openIssue(roll)}
                              title="Issue from roll"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {rolls.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Last movement: {fmtDateTime(rolls[rolls.length - 1]?.lastMovement)}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Issue from {selectedRoll?.rollCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Available: <strong>{selectedRoll?.remainingMeters}m</strong>
            </p>
            <div className="space-y-2">
              <Label>Technician</Label>
              <Select value={issueForm.technicianId} onValueChange={(v) => setIssueForm({ ...issueForm, technicianId: v })}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Length to issue (m)</Label>
              <Input
                type="number"
                min={0.01}
                max={selectedRoll?.remainingMeters}
                value={issueForm.meters}
                onChange={(e) => setIssueForm({ ...issueForm, meters: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Project / customer</Label>
              <Input
                value={issueForm.jobReference}
                onChange={(e) => setIssueForm({ ...issueForm, jobReference: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleIssue} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue Cable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
