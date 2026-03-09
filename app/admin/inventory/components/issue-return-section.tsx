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
import { ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  unitType: string;
  quantityAvailable: number;
}

interface IssueItem {
  id: string;
  itemId: string;
  itemName?: string;
  quantityTaken: number;
  quantityReturned: number;
  quantityUsed: number;
  unitType: string;
}

interface Issue {
  id: string;
  technicianId: string;
  jobReference?: string;
  status: string;
  issueDate: string;
  items: IssueItem[];
}

interface IssueReturnSectionProps {
  stationId: string;
  onRefresh: () => void;
}

export function IssueReturnSection({ stationId, onRefresh }: IssueReturnSectionProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedIssueItem, setSelectedIssueItem] = useState<{ issue: Issue; item: IssueItem } | null>(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnCondition, setReturnCondition] = useState('');
  const [issueForm, setIssueForm] = useState({
    technicianId: '',
    jobReference: '',
    items: [] as { itemId: string; quantityTaken: number; unitType: string }[],
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      fetch(`/api/isp/technician-issues?stationId=${stationId}&date=${today}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/inventory?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/technicians?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([issuesRes, itemsRes, techRes]) => {
      setIssues(issuesRes.issues || []);
      setItems((itemsRes.items || []).filter((i: InventoryItem & { isCable?: boolean; category?: string }) => !i.isCable && i.category !== 'Drop Cable'));
      setTechnicians(techRes.technicians || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [stationId]);

  const pendingItems = issues.flatMap((issue) =>
    issue.items
      .filter((i) => i.quantityReturned < i.quantityTaken)
      .map((item) => ({ issue, item }))
  );

  const addIssueItem = () => {
    if (issueForm.items.length >= 10) return;
    setIssueForm((p) => ({
      ...p,
      items: [...p.items, { itemId: '', quantityTaken: 1, unitType: 'pcs' }],
    }));
  };

  const updateIssueItem = (idx: number, field: string, value: string | number) => {
    setIssueForm((p) => ({
      ...p,
      items: p.items.map((it, i) =>
        i === idx ? { ...it, [field]: value } : it
      ),
    }));
  };

  const removeIssueItem = (idx: number) => {
    setIssueForm((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx),
    }));
  };

  const handleIssue = () => {
    if (!issueForm.technicianId || issueForm.items.length === 0) {
      toast.error('Select technician and add at least one item');
      return;
    }
    const validItems = issueForm.items.filter(
      (it) => it.itemId && it.quantityTaken > 0
    );
    if (validItems.length === 0) {
      toast.error('Add valid items');
      return;
    }
    fetch('/api/isp/technician-issues', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId,
        technicianId: issueForm.technicianId,
        jobReference: issueForm.jobReference || undefined,
        items: validItems.map((it) => ({
          itemId: it.itemId,
          quantityTaken: it.quantityTaken,
          unitType: items.find((i) => i.id === it.itemId)?.unitType || 'pcs',
        })),
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Items issued');
        setIssueOpen(false);
        setIssueForm({ technicianId: '', jobReference: '', items: [] });
        onRefresh();
        window.location.reload(); // Refresh issues list
      })
      .catch((e) => toast.error(e.message));
  };

  const handleReturn = () => {
    if (!selectedIssueItem) return;
    const qty = parseFloat(returnQty);
    if (isNaN(qty) || qty < 0) {
      toast.error('Enter valid quantity');
      return;
    }
    if (qty > selectedIssueItem.item.quantityTaken - selectedIssueItem.item.quantityReturned) {
      toast.error('Cannot return more than taken');
      return;
    }
    fetch('/api/isp/technician-issues/return', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issueItemId: selectedIssueItem.item.id,
        quantityReturned: qty,
        returnCondition: returnCondition || undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Return recorded');
        setReturnOpen(false);
        setSelectedIssueItem(null);
        setReturnQty('');
        setReturnCondition('');
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
            <ArrowUpCircle className="h-5 w-5 shrink-0" />
            Daily Issue / Return
          </CardTitle>
          <Button size="sm" onClick={() => setIssueOpen(true)} className="w-full sm:w-auto h-9">
            <Plus className="h-4 w-4 mr-1" />
            Issue Items
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReturnOpen(true)}
                  disabled={pendingItems.length === 0}
                >
                  Process Return
                </Button>
              </div>
              {pendingItems.length > 0 ? (
                <>
                  <div className="md:hidden space-y-3">
                    {pendingItems.map(({ issue, item }) => (
                      <div key={item.id} className="rounded-lg border p-3 space-y-2">
                        <p className="font-medium">{item.itemName || item.itemId}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>Taken: {item.quantityTaken} {item.unitType}</span>
                          <span>Returned: {item.quantityReturned}</span>
                          <span>Out: {item.quantityTaken - item.quantityReturned}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={item.quantityReturned > 0 ? 'secondary' : 'default'}>
                            {item.quantityReturned >= item.quantityTaken ? 'Closed' : 'Pending'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIssueItem({ issue, item });
                              setReturnQty(String(item.quantityTaken - item.quantityReturned));
                              setReturnOpen(true);
                            }}
                          >
                            Return
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Taken</TableHead>
                          <TableHead>Returned</TableHead>
                          <TableHead>Out</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingItems.map(({ issue, item }) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.itemName || item.itemId}</TableCell>
                            <TableCell>{item.quantityTaken} {item.unitType}</TableCell>
                            <TableCell>{item.quantityReturned}</TableCell>
                            <TableCell>{item.quantityTaken - item.quantityReturned}</TableCell>
                            <TableCell>
                              <Badge variant={item.quantityReturned > 0 ? 'secondary' : 'default'}>
                                {item.quantityReturned >= item.quantityTaken ? 'Closed' : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedIssueItem({ issue, item });
                                  setReturnQty(String(item.quantityTaken - item.quantityReturned));
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
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No pending returns. Issue items to technicians to get started.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Items to Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                placeholder="Work ticket / job ID"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button variant="ghost" size="sm" onClick={addIssueItem}>
                  + Add item
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {issueForm.items.map((it, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Select
                      value={it.itemId}
                      onValueChange={(v) => {
                        const item = items.find((i) => i.id === v);
                        updateIssueItem(idx, 'itemId', v);
                        if (item) updateIssueItem(idx, 'unitType', item.unitType);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.itemName} ({i.quantityAvailable} avail)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      className="w-full sm:w-20"
                      value={it.quantityTaken}
                      onChange={(e) =>
                        updateIssueItem(idx, 'quantityTaken', parseInt(e.target.value) || 0)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeIssueItem(idx)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
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
            <DialogTitle>Process Return</DialogTitle>
          </DialogHeader>
          {selectedIssueItem && (
            <div className="space-y-4">
              <p className="text-sm">
                {selectedIssueItem.item.itemName || selectedIssueItem.item.itemId} — Max return:{' '}
                {selectedIssueItem.item.quantityTaken - selectedIssueItem.item.quantityReturned}{' '}
                {selectedIssueItem.item.unitType}
              </p>
              <div>
                <Label>Quantity Returned</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedIssueItem.item.quantityTaken - selectedIssueItem.item.quantityReturned}
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                />
              </div>
              <div>
                <Label>Condition (optional)</Label>
                <Input
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  placeholder="Good, Damaged, etc."
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
