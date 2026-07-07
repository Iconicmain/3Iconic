'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StockItem } from './stock-tab';

interface Station {
  id: string;
  stationName: string;
}

interface AddStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stations: Station[];
  existingItem?: StockItem | null;
  onSuccess: () => void;
}

export function AddStockModal({
  open,
  onOpenChange,
  stationId,
  existingItem,
  onSuccess,
}: AddStockModalProps) {
  const isExisting = !!existingItem;

  const [unitType, setUnitType] = useState<'pcs' | 'm'>('pcs');
  const [itemBehavior, setItemBehavior] = useState<'bulk' | 'serialized' | 'cable'>('bulk');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    itemName: '',
    itemCode: '',
    category: 'Equipment',
    quantity: '',
    minimumLevel: '0',
    supplier: '',
    notes: '',
    rollCount: '1',
    metersPerRoll: '1000',
    rollIdPrefix: 'DC',
    serialTracking: false,
    serialNumbers: '',
  });

  useEffect(() => {
    if (!open) return;
    if (existingItem) {
      const meter = existingItem.isCable || existingItem.unitType === 'meters' || existingItem.unitType === 'm';
      setUnitType(meter ? 'm' : 'pcs');
      setItemBehavior(meter ? 'cable' : 'bulk');
      setForm((f) => ({
        ...f,
        itemName: existingItem.itemName,
        itemCode: existingItem.itemCode || '',
        category: existingItem.category || 'Equipment',
        minimumLevel: String(existingItem.minimumLevel || 0),
        quantity: '',
        rollCount: '1',
        metersPerRoll: '1000',
        rollIdPrefix: (existingItem.itemCode || existingItem.itemName).slice(0, 4).toUpperCase(),
      }));
    } else {
      setUnitType('pcs');
      setItemBehavior('bulk');
      setForm({
        itemName: '',
        itemCode: '',
        category: 'Equipment',
        quantity: '',
        minimumLevel: '0',
        supplier: '',
        notes: '',
        rollCount: '1',
        metersPerRoll: '1000',
        rollIdPrefix: 'DC',
        serialTracking: false,
        serialNumbers: '',
      });
    }
  }, [open, existingItem]);

  useEffect(() => {
    if (unitType === 'm') setItemBehavior('cable');
    else if (itemBehavior === 'cable') setItemBehavior('bulk');
  }, [unitType]);

  const totalCableMeters =
    (parseInt(form.rollCount, 10) || 0) * (parseFloat(form.metersPerRoll) || 0);

  const handleSubmit = async () => {
    if (unitType === 'm' || itemBehavior === 'cable') {
      const rollCount = parseInt(form.rollCount, 10);
      const metersPerRoll = parseFloat(form.metersPerRoll);
      if (!form.itemName.trim()) return toast.error('Item name is required');
      if (!rollCount || rollCount < 1) return toast.error('Enter number of rolls');
      if (!metersPerRoll || metersPerRoll <= 0) return toast.error('Enter length per roll');
      if (!form.rollIdPrefix.trim()) return toast.error('Roll ID prefix is required');

      setSubmitting(true);
      try {
        const res = await fetch('/api/isp/inventory/add-cable-rolls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId,
            itemName: form.itemName.trim(),
            itemCode: form.itemCode || undefined,
            category: form.category,
            rollCount,
            metersPerRoll,
            rollIdPrefix: form.rollIdPrefix.trim(),
            minimumLevel: parseFloat(form.minimumLevel) || 0,
            supplier: form.supplier || undefined,
            notes: form.notes || undefined,
            inventoryItemId: existingItem?.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add cable');
        toast.success(`Added ${rollCount} roll(s) · ${totalCableMeters.toLocaleString()}m total`);
        onOpenChange(false);
        onSuccess();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to add cable');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const qty = parseFloat(form.quantity);
    if (isExisting && existingItem) {
      if (!qty || qty <= 0) return toast.error('Enter valid quantity');
      setSubmitting(true);
      try {
        const res = await fetch('/api/isp/inventory/add-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: existingItem.id,
            quantity: qty,
            notes: form.notes || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add stock');
        toast.success('Stock added');
        onOpenChange(false);
        onSuccess();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!form.itemName.trim() || !form.itemCode.trim()) {
      return toast.error('Item name and code are required');
    }
    if (!qty || qty <= 0) return toast.error('Enter valid quantity');

    setSubmitting(true);
    try {
      const res = await fetch('/api/isp/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          itemName: form.itemName.trim(),
          itemCode: form.itemCode.trim(),
          category: form.category,
          unitType: 'pcs',
          quantityAvailable: qty,
          minimumLevel: parseFloat(form.minimumLevel) || 0,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create item');
      toast.success('Item created');
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const showCableFields = unitType === 'm' || itemBehavior === 'cable';
  const showPcsFields = !showCableFields;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isExisting ? 'Add Stock' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isExisting && (
            <>
              <div className="space-y-2">
                <Label>Unit type</Label>
                <Select value={unitType} onValueChange={(v) => setUnitType(v as 'pcs' | 'm')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs — routers, ONUs, patch cords, tools</SelectItem>
                    <SelectItem value="m">m — cable (roll tracking)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {unitType === 'pcs' && (
                <div className="space-y-2">
                  <Label>Item behavior</Label>
                  <Select value={itemBehavior} onValueChange={(v) => setItemBehavior(v as typeof itemBehavior)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulk">Bulk quantity item</SelectItem>
                      <SelectItem value="serialized">Serialized equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Item name</Label>
            <Input
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              disabled={isExisting}
              placeholder="e.g. Drop Cable, Router WiFi-6"
            />
          </div>

          {!isExisting && showPcsFields && (
            <div className="space-y-2">
              <Label>Item code</Label>
              <Input
                value={form.itemCode}
                onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                placeholder="e.g. ROUTER-W6"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })} disabled={isExisting}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Drop Cable">Drop Cable</SelectItem>
                <SelectItem value="Fiber Cable">Fiber Cable</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCableFields && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Number of rolls</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.rollCount}
                    onChange={(e) => setForm({ ...form, rollCount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Length per roll (m)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.metersPerRoll}
                    onChange={(e) => setForm({ ...form, metersPerRoll: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Roll ID prefix</Label>
                <Input
                  value={form.rollIdPrefix}
                  onChange={(e) => setForm({ ...form, rollIdPrefix: e.target.value.toUpperCase() })}
                  placeholder="DC"
                />
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                Total added: <strong>{totalCableMeters.toLocaleString()}m</strong>
                {parseInt(form.rollCount, 10) > 0 && (
                  <> · {form.rollIdPrefix}-001 … {form.rollIdPrefix}-{String(parseInt(form.rollCount, 10)).padStart(3, '0')}</>
                )}
              </p>
            </>
          )}

          {showPcsFields && (
            <div className="space-y-2">
              <Label>Quantity (pcs)</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Minimum level</Label>
            <Input
              type="number"
              min={0}
              value={form.minimumLevel}
              onChange={(e) => setForm({ ...form, minimumLevel: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {showCableFields ? 'Add Rolls' : isExisting ? 'Add Quantity' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
