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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ArrowLeftRight, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Station {
  id: string;
  stationName: string;
  code: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  quantityAvailable: number;
}

export interface TransferItem {
  id: string;
  date: string;
  stationId: string;
  itemName: string;
  quantity: number;
  type: string;
  userName: string;
  notes?: string;
}

interface TransfersTabProps {
  stations: Station[];
  stationId: string;
  refreshKey: number;
  onRefresh: () => void;
}

export function TransfersTab({ stations, stationId, refreshKey, onRefresh }: TransfersTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState({
    fromStationId: stationId !== 'all' ? stationId : '',
    toStationId: '',
    itemId: '',
    quantity: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    setLoading(true);
    const transferUrl =
      stationId === 'all'
        ? '/api/isp/inventory/transfer?limit=25'
        : `/api/isp/inventory/transfer?stationId=${stationId}&limit=25`;
    const itemsUrl = `/api/isp/inventory?stationId=${stationId}`;
    Promise.all([
      fetch(transferUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(itemsUrl, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([xfer, inv]) => {
        setTransfers(xfer.transfers || []);
        setItems(inv.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stationId, refreshKey]);

  const handleSubmit = async () => {
    const qty = parseFloat(form.quantity);
    if (!form.fromStationId || !form.toStationId || !form.itemId || !form.reason.trim()) {
      toast.error('Fill all required fields');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter valid quantity');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/isp/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      toast.success('Stock transferred');
      setForm({ fromStationId: stationId !== 'all' ? stationId : '', toStationId: '', itemId: '', quantity: '', reason: '', notes: '' });
      setDrawerOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fromItems = items.filter((i) => i.quantityAvailable > 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 shrink-0" />
            Stock Transfers
          </CardTitle>
          <Button size="sm" onClick={() => setDrawerOpen(true)} disabled={stations.length < 2}>
            <Plus className="h-4 w-4 mr-1" />
            Transfer Stock
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No transfers yet. Use Transfer Stock to move items between stations.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(t.date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{stations.find((s) => s.id === t.stationId || s.code === t.stationId)?.stationName || t.stationId}</TableCell>
                      <TableCell className="font-medium">{t.itemName}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell className="text-xs">{t.type === 'TRANSFER_IN' ? 'In' : 'Out'}</TableCell>
                      <TableCell className="text-sm">{t.userName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transfer Stock</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 py-2">
            <div className="space-y-1.5">
              <Label>From station</Label>
              <Select value={form.fromStationId} onValueChange={(v) => setForm((p) => ({ ...p, fromStationId: v, itemId: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To station</Label>
              <Select value={form.toStationId} onValueChange={(v) => setForm((p) => ({ ...p, toStationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {stations.filter((s) => s.id !== form.fromStationId).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Item</Label>
              <Select value={form.itemId} onValueChange={(v) => setForm((p) => ({ ...p, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {fromItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.itemName} ({i.quantityAvailable} avail)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Rebalancing stock" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Transfer Stock
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
