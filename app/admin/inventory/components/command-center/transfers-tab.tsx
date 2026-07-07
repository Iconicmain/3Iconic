'use client';

import { useState } from 'react';
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
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TransferItem } from './sidebar-panels';

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

interface TransfersTabProps {
  stations: Station[];
  stationId: string;
  items: InventoryItem[];
  transfers: TransferItem[];
  onRefresh: () => void;
  openDrawer?: boolean;
  onDrawerClose?: () => void;
}

export function TransfersTab({
  stations,
  stationId,
  items,
  transfers,
  onRefresh,
  openDrawer = false,
  onDrawerClose,
}: TransfersTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fromStationId: stationId !== 'all' ? stationId : '',
    toStationId: '',
    itemId: '',
    quantity: '',
    reason: '',
    notes: '',
  });

  const isOpen = openDrawer || drawerOpen;

  const handleClose = () => {
    setDrawerOpen(false);
    onDrawerClose?.();
  };

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
      toast.success('Stock transferred successfully');
      setForm({ fromStationId: stationId !== 'all' ? stationId : '', toStationId: '', itemId: '', quantity: '', reason: '', notes: '' });
      handleClose();
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
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Stock Transfers
          </CardTitle>
          <Button size="sm" onClick={() => setDrawerOpen(true)} disabled={stations.length < 2}>
            Transfer Stock
          </Button>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No transfer history yet. Move stock between stations using Transfer Stock.
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
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{new Date(t.date).toLocaleString()}</TableCell>
                      <TableCell>{stations.find((s) => s.id === t.stationId || s.code === t.stationId)?.stationName || t.stationId}</TableCell>
                      <TableCell>{t.itemName}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{t.type.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell className="text-sm">{t.userName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{t.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isOpen} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transfer Stock</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-1 py-4">
            <div>
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
            <div>
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
            <div>
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
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Rebalancing stock" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
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
