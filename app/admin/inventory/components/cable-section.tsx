'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cable, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CableRoll {
  id: string;
  rollCode: string;
  cableType: string;
  originalMeters: number;
  currentRemainingMeters: number;
  status: string;
}

interface CableLog {
  id: string;
  rollId: string;
  technicianId: string;
  jobReference?: string;
  openingMeters: number;
  metersIssued: number;
  metersReturned: number;
  metersUsed: number;
  closingMeters: number;
  createdAt: string;
}

interface Technician {
  id: string;
  name: string;
}

interface CableSectionProps {
  stationId: string;
  onRefresh: () => void;
}

export function CableSection({ stationId, onRefresh }: CableSectionProps) {
  const [rolls, setRolls] = useState<CableRoll[]>([]);
  const [logs, setLogs] = useState<CableLog[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRollOpen, setAddRollOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState<CableRoll | null>(null);
  const [selectedLog, setSelectedLog] = useState<CableLog | null>(null);
  const [newRoll, setNewRoll] = useState({
    rollCode: '',
    cableType: 'Drop Cable',
    originalMeters: '',
  });
  const [issueForm, setIssueForm] = useState({
    rollId: '',
    technicianId: '',
    jobReference: '',
    metersIssued: '',
  });
  const [returnMeters, setReturnMeters] = useState('');
  const [wasteMeters, setWasteMeters] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/isp/cable?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/cable/usage?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/technicians?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([rollsRes, logsRes, techRes]) => {
      setRolls(rollsRes.rolls || []);
      setLogs(logsRes.logs || []);
      setTechnicians(techRes.technicians || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [stationId]);

  const openLogs = logs.filter((l) => l.metersReturned < l.metersIssued);
  const activeRolls = rolls.filter((r) => r.status === 'ACTIVE' && r.currentRemainingMeters > 0);

  const handleAddRoll = () => {
    if (!newRoll.rollCode || !newRoll.cableType || !newRoll.originalMeters) {
      toast.error('Fill all fields');
      return;
    }
    const meters = parseFloat(newRoll.originalMeters);
    if (isNaN(meters) || meters <= 0) {
      toast.error('Enter valid meters');
      return;
    }
    fetch('/api/isp/cable', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId,
        rollCode: newRoll.rollCode,
        cableType: newRoll.cableType,
        originalMeters: meters,
        currentRemainingMeters: meters,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Cable roll added');
        setAddRollOpen(false);
        setNewRoll({ rollCode: '', cableType: 'Drop Cable', originalMeters: '' });
        onRefresh();
        window.location.reload();
      })
      .catch((e) => toast.error(e.message));
  };

  const handleIssue = () => {
    if (!issueForm.rollId || !issueForm.technicianId || !issueForm.metersIssued) {
      toast.error('Fill required fields');
      return;
    }
    const meters = parseFloat(issueForm.metersIssued);
    if (isNaN(meters) || meters <= 0) {
      toast.error('Enter valid meters');
      return;
    }
    fetch('/api/isp/cable/issue', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rollId: issueForm.rollId,
        technicianId: issueForm.technicianId,
        jobReference: issueForm.jobReference || undefined,
        metersIssued: meters,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Cable issued');
        setIssueOpen(false);
        setIssueForm({ rollId: '', technicianId: '', jobReference: '', metersIssued: '' });
        onRefresh();
        window.location.reload();
      })
      .catch((e) => toast.error(e.message));
  };

  const handleReturn = () => {
    if (!selectedLog) return;
    const meters = parseFloat(returnMeters);
    if (isNaN(meters) || meters < 0) {
      toast.error('Enter valid meters');
      return;
    }
    const maxReturn = selectedLog.metersIssued - selectedLog.metersReturned;
    if (meters > maxReturn) {
      toast.error(`Cannot return more than ${maxReturn}m`);
      return;
    }
    const waste = parseFloat(wasteMeters) || 0;
    fetch('/api/isp/cable/return', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usageLogId: selectedLog.id,
        metersReturned: meters,
        wasteMeters: waste,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Return recorded');
        setReturnOpen(false);
        setSelectedLog(null);
        setReturnMeters('');
        setWasteMeters('');
        onRefresh();
        window.location.reload();
      })
      .catch((e) => toast.error(e.message));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Cable className="h-5 w-5 shrink-0" />
            Drop Cable Tracking
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => setAddRollOpen(true)} className="flex-1 sm:flex-initial h-9">
              <Plus className="h-4 w-4 mr-1" />
              Add Roll
            </Button>
            <Button size="sm" onClick={() => setIssueOpen(true)} disabled={activeRolls.length === 0} className="flex-1 sm:flex-initial h-9">
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              Issue Cable
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="space-y-4">
              {rolls.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No cable rolls. Add a roll to start tracking.
                </p>
              ) : (
                <>
                  <div className="md:hidden space-y-3">
                    {rolls.map((r) => (
                      <div key={r.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{r.rollCode}</p>
                          <Badge variant={r.status === 'ACTIVE' && r.currentRemainingMeters > 0 ? 'default' : 'secondary'}>
                            {r.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{r.cableType}</p>
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">{r.originalMeters}m</span>
                          <span className="mx-1">→</span>
                          <span className="font-semibold">{r.currentRemainingMeters}m</span> remaining
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Roll Code</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Original</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rolls.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.rollCode}</TableCell>
                            <TableCell>{r.cableType}</TableCell>
                            <TableCell>{r.originalMeters}m</TableCell>
                            <TableCell>{r.currentRemainingMeters}m</TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'ACTIVE' && r.currentRemainingMeters > 0 ? 'default' : 'secondary'}>
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              {openLogs.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Pending cable returns</p>
                  <div className="md:hidden space-y-2">
                    {openLogs.map((l) => (
                      <div key={l.id} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                        <span className="text-sm">{l.metersIssued - l.metersReturned}m out</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(l);
                            setReturnMeters(String(l.metersIssued - l.metersReturned));
                            setReturnOpen(true);
                          }}
                        >
                          Return
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issued</TableHead>
                          <TableHead>Returned</TableHead>
                          <TableHead>Out</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openLogs.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{l.metersIssued}m</TableCell>
                            <TableCell>{l.metersReturned}m</TableCell>
                            <TableCell>{l.metersIssued - l.metersReturned}m</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLog(l);
                                  setReturnMeters(String(l.metersIssued - l.metersReturned));
                                  setReturnOpen(true);
                                }}
                              >
                                Return
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add roll dialog */}
      <Dialog open={addRollOpen} onOpenChange={setAddRollOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Cable Roll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Roll Code</Label>
              <Input
                value={newRoll.rollCode}
                onChange={(e) => setNewRoll((p) => ({ ...p, rollCode: e.target.value }))}
                placeholder="e.g. DC-001"
              />
            </div>
            <div>
              <Label>Cable Type</Label>
              <Input
                value={newRoll.cableType}
                onChange={(e) => setNewRoll((p) => ({ ...p, cableType: e.target.value }))}
                placeholder="Drop Cable"
              />
            </div>
            <div>
              <Label>Original Length (meters)</Label>
              <Input
                type="number"
                min="0.01"
                value={newRoll.originalMeters}
                onChange={(e) => setNewRoll((p) => ({ ...p, originalMeters: e.target.value }))}
                placeholder="e.g. 305"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRollOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoll}>Add Roll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Cable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Roll</Label>
              <Select
                value={issueForm.rollId}
                onValueChange={(v) => setIssueForm((p) => ({ ...p, rollId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select roll" />
                </SelectTrigger>
                <SelectContent>
                  {activeRolls.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.rollCode} — {r.currentRemainingMeters}m remaining
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Technician</Label>
              <Select
                value={issueForm.technicianId}
                onValueChange={(v) => setIssueForm((p) => ({ ...p, technicianId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Job Reference (optional)</Label>
              <Input
                value={issueForm.jobReference}
                onChange={(e) => setIssueForm((p) => ({ ...p, jobReference: e.target.value }))}
                placeholder="Work ticket"
              />
            </div>
            <div>
              <Label>Meters to Issue</Label>
              <Input
                type="number"
                min="0.01"
                step="0.1"
                value={issueForm.metersIssued}
                onChange={(e) => setIssueForm((p) => ({ ...p, metersIssued: e.target.value }))}
                placeholder="e.g. 25"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Cable</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <p className="text-sm">
                Max return: {selectedLog.metersIssued - selectedLog.metersReturned}m
              </p>
              <div>
                <Label>Meters Returned</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedLog.metersIssued - selectedLog.metersReturned}
                  value={returnMeters}
                  onChange={(e) => setReturnMeters(e.target.value)}
                />
              </div>
              <div>
                <Label>Waste Meters (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={wasteMeters}
                  onChange={(e) => setWasteMeters(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={handleReturn}>Record Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
