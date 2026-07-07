'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  ChevronDown,
  Package,
  Wifi,
  Cable,
  Plug,
  Box,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StockItem } from './stock-tab';
import {
  INVENTORY_ITEM_TYPES,
  getItemTypeConfig,
  inferItemTypeFromItem,
  slugItemCode,
  parseIdLines,
  formatMacAddress,
  formatMacLinesText,
  SPLITTER_PRESETS,
  getSplitterPreset,
  inferSplitterPresetId,
  type InventoryItemTypeId,
} from './inventory-item-types';
import { cn } from '@/lib/utils';
import type { ItemTemplate } from './item-catalog-sheet';

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
  templates?: ItemTemplate[];
  onSuccess: () => void;
}

const TYPE_ICONS: Partial<Record<InventoryItemTypeId, typeof Package>> = {
  router: Wifi,
  access_point: Wifi,
  bridge: Wifi,
  onu: Box,
  cable: Cable,
  patch_cord: Plug,
  splitter: GitBranch,
  socket: Plug,
  other: Package,
};

function FormSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step?: number;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 space-y-3', className)}>
      <div className="flex items-start gap-3">
        {step != null && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {step}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold leading-none">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

function quantityLabel(tracking: 'serialized' | 'bulk' | 'roll'): string {
  if (tracking === 'roll') return 'Number of rolls';
  if (tracking === 'serialized') return 'How many units';
  return 'Quantity (pcs)';
}

export function AddStockModal({
  open,
  onOpenChange,
  stationId,
  existingItem,
  templates = [],
  onSuccess,
}: AddStockModalProps) {
  const isExisting = !!existingItem;

  const [itemTypeId, setItemTypeId] = useState<InventoryItemTypeId>('router');
  const [splitterPreset, setSplitterPreset] = useState('1x8');
  const [idType, setIdType] = useState<'serial' | 'mac'>('serial');
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  const isSplitter = itemTypeId === 'splitter';
  const splitterIsCustom = splitterPreset === 'custom';

  const applySplitterPreset = (presetId: string) => {
    setSplitterPreset(presetId);
    const preset = getSplitterPreset(presetId);
    if (!preset) return;
    if (presetId === 'custom') {
      setForm((f) => ({ ...f, itemName: '', itemCode: '', category: 'Materials' }));
    } else {
      setForm((f) => ({
        ...f,
        itemName: preset.itemName,
        itemCode: preset.itemCode,
        category: 'Materials',
      }));
    }
  };

  const parsedIds = useMemo(() => {
    const lines = parseIdLines(form.unitIdsText);
    return idType === 'mac' ? lines.map(formatMacAddress).filter(Boolean) : lines;
  }, [form.unitIdsText, idType]);

  const qtyNum = parseInt(form.quantity, 10) || 0;
  const metersPerRoll = parseFloat(form.metersPerRoll) || 0;
  const totalCableMeters = qtyNum * metersPerRoll;

  const totalSummary = useMemo(() => {
    if (isRoll && qtyNum > 0 && metersPerRoll > 0) {
      return `${qtyNum} roll${qtyNum !== 1 ? 's' : ''} × ${metersPerRoll.toLocaleString()}m = ${totalCableMeters.toLocaleString()}m`;
    }
    if (isSerialized && qtyNum > 0) return `${qtyNum} ${typeConfig.label.toLowerCase()}${qtyNum !== 1 ? 's' : ''}`;
    if (isBulk && qtyNum > 0) return `${qtyNum} pcs`;
    return null;
  }, [isRoll, isSerialized, isBulk, qtyNum, metersPerRoll, totalCableMeters, typeConfig.label]);

  useEffect(() => {
    if (!open) return;
    setAdvancedOpen(false);
    if (existingItem) {
      const inferred = inferItemTypeFromItem(existingItem);
      setItemTypeId(inferred);
      const cfg = getItemTypeConfig(inferred);
      if (inferred === 'splitter') setSplitterPreset(inferSplitterPresetId(existingItem.itemName));
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
        notes: '',
      }));
    } else {
      setItemTypeId('router');
      setSplitterPreset('1x8');
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
    if (id === 'splitter') {
      applySplitterPreset('1x8');
    } else {
      setForm((f) => ({
        ...f,
        category: cfg.category,
        rollIdPrefix: cfg.rollIdPrefix || f.rollIdPrefix,
        metersPerRoll: String(cfg.defaultMetersPerRoll || f.metersPerRoll),
        itemCode: f.itemName ? slugItemCode(f.itemName, cfg.codePrefix) : '',
      }));
    }
  };

  const handleUnitIdsTextChange = (text: string) => {
    setForm({ ...form, unitIdsText: idType === 'mac' ? formatMacLinesText(text) : text });
  };

  const applyTemplate = (templateId: string) => {
    if (!templateId || templateId === '_none') return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const typeId = tpl.itemTypeId as InventoryItemTypeId;
    const cfg = getItemTypeConfig(typeId);
    setItemTypeId(typeId);
    if (typeId === 'splitter') setSplitterPreset(tpl.splitterPreset || inferSplitterPresetId(tpl.itemName));
    setForm((f) => ({
      ...f,
      itemName: tpl.itemName,
      itemCode: tpl.itemCode || '',
      category: tpl.category || cfg.category,
      minimumLevel: String(tpl.defaultMinimumLevel ?? 0),
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
        body: JSON.stringify({ itemId: existingItem.id, quantity: qty, notes: form.notes || undefined }),
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
        toast.success(`Added ${totalSummary}`);
      } else if (isSerialized) {
        if (parsedIds.length === 0) {
          throw new Error(`Enter ${qty} ${idType === 'serial' ? 'serial number' : 'MAC address'}${qty !== 1 ? 's' : ''}`);
        }
        if (parsedIds.length !== qty) {
          throw new Error(`Enter exactly ${qty} ${idType === 'serial' ? 'serials' : 'MACs'} to match quantity`);
        }
        const units = parsedIds.map((val) =>
          idType === 'serial' ? { serialNumber: val } : { macAddress: formatMacAddress(val) }
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

  const submitLabel = isExisting ? 'Add to stock' : 'Add to inventory';
  const TypeIcon = TYPE_ICONS[itemTypeId] || Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {isExisting ? 'Add stock' : 'New inventory item'}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isExisting
                  ? `Adding more to ${existingItem?.itemName}`
                  : 'Choose type, enter details, confirm quantity'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!isExisting && templates.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2.5">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <Select onValueChange={applyTemplate}>
                <SelectTrigger className="h-8 border-0 bg-transparent shadow-none focus:ring-0 px-0 flex-1">
                  <SelectValue placeholder="Quick pick from saved catalog…" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_ITEM_TYPES.map((type) => {
                    const group = templates.filter((t) => t.itemTypeId === type.id);
                    if (!group.length) return null;
                    return (
                      <SelectGroup key={type.id}>
                        <SelectLabel>{type.label}</SelectLabel>
                        {group.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.itemName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isExisting && (
            <FormSection step={1} title="What are you adding?" description="Tap a category">
              <div className="grid grid-cols-3 gap-1.5">
                {INVENTORY_ITEM_TYPES.map((t) => {
                  const Icon = TYPE_ICONS[t.id] || Package;
                  const selected = itemTypeId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleItemTypeChange(t.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors',
                        selected
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                          : 'border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] sm:text-xs font-medium leading-tight">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {isSplitter && (
                <div className="pt-1">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Splitter size</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPLITTER_PRESETS.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        size="sm"
                        variant={splitterPreset === p.id ? 'default' : 'outline'}
                        className="h-7 text-xs px-2.5"
                        onClick={() => applySplitterPreset(p.id)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </FormSection>
          )}

          <FormSection
            step={isExisting ? undefined : 2}
            title={isExisting ? existingItem?.itemName || 'Item' : 'Item details'}
            description={
              isSerialized
                ? 'Equipment tracked by serial or MAC'
                : isRoll
                  ? 'Cable tracked by roll in meters'
                  : 'Bulk item counted in pieces'
            }
          >
            {!isExisting && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{isSerialized ? 'Model name' : 'Item name'}</Label>
                  <Input
                    value={form.itemName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSplitter && !splitterIsCustom}
                    placeholder={typeConfig.namePlaceholder}
                    className="h-9"
                  />
                </div>
                {!isSerialized && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Item code</Label>
                    <Input
                      value={form.itemCode}
                      onChange={(e) => setForm({ ...form, itemCode: e.target.value.toUpperCase() })}
                      disabled={isSplitter && !splitterIsCustom}
                      placeholder={`${typeConfig.codePrefix}-001`}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                )}
                {(isRoll || itemTypeId === 'other') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
              </div>
            )}

            {isExisting && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{typeConfig.label}</Badge>
                {form.itemCode && <span className="text-xs font-mono text-muted-foreground">{form.itemCode}</span>}
              </div>
            )}
          </FormSection>

          <FormSection
            step={isExisting ? undefined : 3}
            title="How much?"
            description={
              isRoll
                ? 'Rolls × meters per roll'
                : isSerialized
                  ? 'Count must match serial/MAC list'
                  : 'Total pieces to add'
            }
          >
            <div className={cn('gap-3', isRoll ? 'grid sm:grid-cols-3' : 'grid sm:grid-cols-2')}>
              <div className="space-y-1.5">
                <Label className="text-xs">{quantityLabel(typeConfig.tracking)}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="h-9 text-base font-medium"
                />
              </div>
              {isRoll && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Meters per roll</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.metersPerRoll}
                      onChange={(e) => setForm({ ...form, metersPerRoll: e.target.value })}
                      placeholder="1000"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Roll prefix</Label>
                    <Input
                      value={form.rollIdPrefix}
                      onChange={(e) => setForm({ ...form, rollIdPrefix: e.target.value.toUpperCase() })}
                      placeholder="DC"
                      className="h-9 font-mono"
                    />
                  </div>
                </>
              )}
            </div>

            {isSerialized && (
              <div className="space-y-3 pt-1 border-t">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={idType === 'serial' ? 'default' : 'outline'}
                    className="flex-1 h-8"
                    onClick={() => setIdType('serial')}
                  >
                    Serial #
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={idType === 'mac' ? 'default' : 'outline'}
                    className="flex-1 h-8"
                    onClick={() => setIdType('mac')}
                  >
                    MAC address
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      {idType === 'serial' ? 'Serial numbers' : 'MAC addresses'} — one per line
                    </Label>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        parsedIds.length === qtyNum && qtyNum > 0 ? 'text-emerald-600' : 'text-muted-foreground'
                      )}
                    >
                      {parsedIds.length}/{qtyNum || '?'}
                    </span>
                  </div>
                  <Textarea
                    value={form.unitIdsText}
                    onChange={(e) => handleUnitIdsTextChange(e.target.value)}
                    rows={Math.min(Math.max(qtyNum, 4), 10)}
                    placeholder={
                      idType === 'serial'
                        ? 'SN001\nSN002\nSN003'
                        : 'AABBCCDDEE01\n(colons added automatically)'
                    }
                    className="font-mono text-xs resize-none"
                  />
                </div>
              </div>
            )}
          </FormSection>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <span>Low stock alert & notes</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum level {isRoll ? '(m)' : '(pcs)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.minimumLevel}
                    onChange={(e) => setForm({ ...form, minimumLevel: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Supplier, batch, location…"
                  className="text-sm resize-none"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="shrink-0 border-t bg-muted/20 px-5 py-3 space-y-3">
          {totalSummary && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-semibold text-primary">{totalSummary}</span>
            </div>
          )}
          {isRoll && qtyNum > 0 && form.rollIdPrefix && (
            <p className="text-[11px] text-muted-foreground text-center font-mono">
              Rolls: {form.rollIdPrefix}-001 … {form.rollIdPrefix}-{String(qtyNum).padStart(3, '0')}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
