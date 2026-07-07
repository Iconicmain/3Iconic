'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  INVENTORY_ITEM_TYPES,
  getItemTypeConfig,
  inferItemTypeFromItem,
  slugItemCode,
  parseIdLines,
  type InventoryItemTypeId,
} from './inventory-item-types';

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

function quantityLabel(tracking: 'serialized' | 'bulk' | 'roll'): string {
  if (tracking === 'roll') return 'Quantity (rolls)';
  if (tracking === 'serialized') return 'Quantity (units)';
  return 'Quantity (pcs)';
}

export function AddStockModal({
  open,
  onOpenChange,
  stationId,
  existingItem,
  onSuccess,
}: AddStockModalProps) {
  const isExisting = !!existingItem;

  const [itemTypeId, setItemTypeId] = useState<InventoryItemTypeId>('router');
  const [idType, setIdType] = useState<'serial' | 'mac'>('serial');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    itemName: '',
    itemCode: '',
    category: 'Equipment',
    quantity: '1',
    minimumLevel: '0',
    notes: '',
    metersPerRoll: '1000',
    rollIdPrefix: 'DC',
    unitIdsText: '',
  });

  const typeConfig = useMemo(() => getItemTypeConfig(itemTypeId), [itemTypeId]);
  const isSerialized = typeConfig.tracking === 'serialized';
  const isRoll = typeConfig.tracking === 'roll';
  const isBulk = typeConfig.tracking === 'bulk';

  const parsedIds = useMemo(() => parseIdLines(form.unitIdsText), [form.unitIdsText]);
  const qtyNum = parseInt(form.quantity, 10) || 0;
  const metersPerRoll = parseFloat(form.metersPerRoll) || 0;
  const totalCableMeters = qtyNum * metersPerRoll;

  const totalSummary = useMemo(() => {
    if (isRoll && qtyNum > 0 && metersPerRoll > 0) {
      return `${qtyNum} roll${qtyNum !== 1 ? 's' : ''} × ${metersPerRoll.toLocaleString()}m = ${totalCableMeters.toLocaleString()}m total`;
    }
    if (isSerialized && qtyNum > 0) {
      return `${qtyNum} ${typeConfig.label.toLowerCase()}${qtyNum !== 1 ? 's' : ''}`;
    }
    if (isBulk && qtyNum > 0) {
      return `${qtyNum} pcs`;
    }
    return null;
  }, [isRoll, isSerialized, isBulk, qtyNum, metersPerRoll, totalCableMeters, typeConfig.label]);

  useEffect(() => {
    if (!open) return;
    if (existingItem) {
      const inferred = inferItemTypeFromItem(existingItem);
      setItemTypeId(inferred);
      const cfg = getItemTypeConfig(inferred);
      setForm((f) => ({
        ...f,
        itemName: existingItem.itemName,
        itemCode: existingItem.itemCode || '',
        category: existingItem.category || cfg.category,
        minimumLevel: String(existingItem.minimumLevel || 0),
        quantity: '1',
        metersPerRoll: String(cfg.defaultMetersPerRoll || 1000),
        rollIdPrefix: (existingItem.itemCode || cfg.rollIdPrefix || 'DC').slice(0, 6).toUpperCase(),
        unitIdsText: '',
      }));
    } else {
      setItemTypeId('router');
      setIdType('serial');
      setForm({
        itemName: '',
        itemCode: '',
        category: 'Equipment',
        quantity: '1',
        minimumLevel: '0',
        notes: '',
        metersPerRoll: '1000',
        rollIdPrefix: 'DC',
        unitIdsText: '',
      });
    }
  }, [open, existingItem]);

  const handleItemTypeChange = (id: InventoryItemTypeId) => {
    setItemTypeId(id);
    const cfg = getItemTypeConfig(id);
    setForm((f) => ({
      ...f,
      category: cfg.category,
      rollIdPrefix: cfg.rollIdPrefix || f.rollIdPrefix,
      metersPerRoll: String(cfg.defaultMetersPerRoll || f.metersPerRoll),
      itemCode: f.itemName ? slugItemCode(f.itemName, cfg.codePrefix) : '',
    }));
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      itemName: name,
      itemCode: isExisting || f.itemCode ? f.itemCode : slugItemCode(name, typeConfig.codePrefix),
    }));
  };

  const addSerializedUnits = async (itemName: string, units: { serialNumber?: string; macAddress?: string }[]) => {
    const res = await fetch('/api/isp/routers/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationIds: [stationId], itemName, units }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add units');
    return data.added as number;
  };

  const ensureInventoryItem = async (qty: number) => {
    if (existingItem?.id) {
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
      if (!res.ok) throw new Error(data.error || 'Failed to update stock');
      return existingItem.id;
    }

    const itemCode = (form.itemCode || slugItemCode(form.itemName, typeConfig.codePrefix)).trim();
    const res = await fetch('/api/isp/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId,
        itemName: form.itemName.trim(),
        itemCode,
        category: form.category,
        unitType: 'pcs',
        quantityAvailable: qty,
        minimumLevel: parseFloat(form.minimumLevel) || 0,
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create item');
    return data.item?.id as string;
  };

  const handleSubmit = async () => {
    if (!form.itemName.trim()) return toast.error('Item name is required');

    const qty = parseInt(form.quantity, 10);
    if (!qty || qty < 1) return toast.error('Enter a valid quantity (minimum 1)');

    setSubmitting(true);
    try {
      if (isRoll) {
        if (!metersPerRoll || metersPerRoll <= 0) throw new Error('Enter length per roll in meters');
        if (!form.rollIdPrefix.trim()) throw new Error('Roll ID prefix is required');

        const res = await fetch('/api/isp/inventory/add-cable-rolls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId,
            itemName: form.itemName.trim(),
            itemCode: form.itemCode || undefined,
            category: form.category,
            rollCount: qty,
            metersPerRoll,
            rollIdPrefix: form.rollIdPrefix.trim(),
            minimumLevel: parseFloat(form.minimumLevel) || 0,
            notes: form.notes || undefined,
            inventoryItemId: existingItem?.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add cable');
        toast.success(`Added ${qty} roll(s) × ${metersPerRoll.toLocaleString()}m = ${totalCableMeters.toLocaleString()}m`);
      } else if (isSerialized) {
        if (parsedIds.length === 0) {
          throw new Error(`Enter ${qty} ${idType === 'serial' ? 'serial number' : 'MAC address'}${qty !== 1 ? 's' : ''} (one per line)`);
        }
        if (parsedIds.length !== qty) {
          throw new Error(`Quantity is ${qty} but you entered ${parsedIds.length} ${idType === 'serial' ? 'serial' : 'MAC'} value${parsedIds.length !== 1 ? 's' : ''}. They must match.`);
        }
        const units = parsedIds.map((val) =>
          idType === 'serial' ? { serialNumber: val } : { macAddress: val }
        );
        const added = await addSerializedUnits(form.itemName.trim(), units);
        await ensureInventoryItem(added);
        toast.success(`Added ${added} ${typeConfig.label.toLowerCase()}(s)`);
      } else {
        if (existingItem?.id) {
          await ensureInventoryItem(qty);
        } else {
          const itemCode = (form.itemCode || slugItemCode(form.itemName, typeConfig.codePrefix)).trim();
          if (!itemCode) throw new Error('Item code is required');
          const res = await fetch('/api/isp/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stationId,
              itemName: form.itemName.trim(),
              itemCode,
              category: form.category,
              unitType: 'pcs',
              quantityAvailable: qty,
              minimumLevel: parseFloat(form.minimumLevel) || 0,
              notes: form.notes || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to create item');
        }
        toast.success(`Added ${qty} pcs`);
      }

      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = isExisting ? 'Add Stock' : 'Add to Inventory';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isExisting ? 'Add Stock' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isExisting && (
            <p className="text-sm rounded-md bg-muted/50 px-3 py-2">
              Adding to <strong>{typeConfig.label}</strong>
            </p>
          )}

          {!isExisting && (
            <div className="space-y-2">
              <Label>Item type</Label>
              <Select value={itemTypeId} onValueChange={(v) => handleItemTypeChange(v as InventoryItemTypeId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVENTORY_ITEM_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{isSerialized ? 'Model / item name' : 'Item name'}</Label>
            <Input
              value={form.itemName}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isExisting}
              placeholder={typeConfig.namePlaceholder}
            />
          </div>

          {!isExisting && !isSerialized && (
            <div className="space-y-2">
              <Label>Item code</Label>
              <Input
                value={form.itemCode}
                onChange={(e) => setForm({ ...form, itemCode: e.target.value.toUpperCase() })}
                placeholder={`e.g. ${typeConfig.codePrefix}-001`}
              />
            </div>
          )}

          {(isRoll || itemTypeId === 'other') && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })} disabled={isExisting && itemTypeId !== 'other'}>
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
          )}

          {/* Quantity — shown for ALL item types */}
          <div className="space-y-2">
            <Label>{quantityLabel(typeConfig.tracking)}</Label>
            <Input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder={isRoll ? 'e.g. 10 rolls' : isSerialized ? 'e.g. 10 units' : 'e.g. 10'}
            />
            {isRoll && (
              <p className="text-xs text-muted-foreground">
                How many rolls you are adding — e.g. 10 rolls of 1km, or 5 rolls of 2km
              </p>
            )}
            {isSerialized && (
              <p className="text-xs text-muted-foreground">
                How many units you bought — enter the same count of serial/MAC values below
              </p>
            )}
          </div>

          {isRoll && (
            <>
              <div className="space-y-2">
                <Label>Length per roll (m)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.metersPerRoll}
                  onChange={(e) => setForm({ ...form, metersPerRoll: e.target.value })}
                  placeholder="e.g. 1000 for 1km, 2000 for 2km"
                />
              </div>
              <div className="space-y-2">
                <Label>Roll ID prefix</Label>
                <Input
                  value={form.rollIdPrefix}
                  onChange={(e) => setForm({ ...form, rollIdPrefix: e.target.value.toUpperCase() })}
                  placeholder="DC"
                />
              </div>
            </>
          )}

          {isSerialized && (
            <>
              <div className="space-y-2">
                <Label>Add by</Label>
                <Select value={idType} onValueChange={(v) => setIdType(v as 'serial' | 'mac')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serial">Serial Number</SelectItem>
                    <SelectItem value="mac">MAC Address</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {idType === 'serial' ? 'Serial Numbers' : 'MAC Addresses'} — enter {qtyNum || '…'} (one per line)
                </Label>
                <Textarea
                  value={form.unitIdsText}
                  onChange={(e) => setForm({ ...form, unitIdsText: e.target.value })}
                  rows={Math.min(Math.max(qtyNum, 3), 12)}
                  placeholder={
                    qtyNum > 0
                      ? Array.from({ length: Math.min(qtyNum, 3) }, (_, i) =>
                          idType === 'serial' ? `SN${String(i + 1).padStart(3, '0')}` : `AA:BB:CC:DD:EE:${String(i + 1).padStart(2, '0')}`
                        ).join('\n') + (qtyNum > 3 ? '\n...' : '')
                      : idType === 'serial'
                        ? 'SN001\nSN002'
                        : 'AA:BB:CC:DD:EE:01\nAA:BB:CC:DD:EE:02'
                  }
                  className="font-mono text-sm"
                />
                <p className={`text-xs ${parsedIds.length === qtyNum && qtyNum > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {parsedIds.length} of {qtyNum || '?'} entered
                  {qtyNum > 0 && parsedIds.length !== qtyNum && ' — must match quantity'}
                </p>
              </div>
            </>
          )}

          {totalSummary && (
            <p className="text-sm font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 rounded-md px-3 py-2">
              Total added: {totalSummary}
              {isRoll && qtyNum > 0 && (
                <> · {form.rollIdPrefix}-001 … {form.rollIdPrefix}-{String(qtyNum).padStart(3, '0')}</>
              )}
            </p>
          )}

          <div className="space-y-2">
            <Label>Minimum level {isRoll ? '(m)' : '(pcs)'}</Label>
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
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
