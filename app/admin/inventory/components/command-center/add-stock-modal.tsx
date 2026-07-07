'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Package,
  Wifi,
  Cable,
  Plug,
  Box,
  GitBranch,
  Sparkles,
  Check,
  ClipboardPaste,
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

const STEPS = [
  { id: 1, label: 'Category' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Amount' },
] as const;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.slice(0, total).map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-2 ring-primary/25',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-3 w-3" /> : step.id}
              </span>
              <span
                className={cn(
                  'text-xs font-medium truncate hidden sm:block',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < total - 1 && (
              <div className={cn('h-px flex-1 mx-1', done ? 'bg-primary/40' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
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

  const [step, setStep] = useState(1);
  const [itemTypeId, setItemTypeId] = useState<InventoryItemTypeId>('router');
  const [splitterPreset, setSplitterPreset] = useState('1x8');
  const [idType, setIdType] = useState<'serial' | 'mac'>('serial');
  const [bulkPaste, setBulkPaste] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serialRows, setSerialRows] = useState<string[]>(['']);
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

  const qtyNum = parseInt(form.quantity, 10) || 0;
  const metersPerRoll = parseFloat(form.metersPerRoll) || 0;
  const totalCableMeters = qtyNum * metersPerRoll;

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

  const useBulkByDefault = qtyNum > 12;
  const effectiveBulkPaste = bulkPaste || useBulkByDefault;

  const parsedIds = useMemo(() => {
    if (isSerialized && !effectiveBulkPaste) {
      const rows = serialRows.slice(0, qtyNum).map((s) => s.trim()).filter(Boolean);
      return idType === 'mac' ? rows.map(formatMacAddress).filter(Boolean) : rows;
    }
    const lines = parseIdLines(form.unitIdsText);
    return idType === 'mac' ? lines.map(formatMacAddress).filter(Boolean) : lines;
  }, [isSerialized, effectiveBulkPaste, serialRows, qtyNum, form.unitIdsText, idType]);

  const syncSerialRows = useCallback((count: number) => {
    setSerialRows((prev) => {
      const next = prev.slice(0, Math.max(count, 1));
      while (next.length < count) next.push('');
      return next;
    });
  }, []);

  useEffect(() => {
    if (isSerialized && !effectiveBulkPaste && qtyNum > 0) syncSerialRows(qtyNum);
  }, [qtyNum, isSerialized, effectiveBulkPaste, syncSerialRows]);

  const totalSummary = useMemo(() => {
    if (isRoll && qtyNum > 0 && metersPerRoll > 0) {
      return `${qtyNum} roll${qtyNum !== 1 ? 's' : ''} · ${totalCableMeters.toLocaleString()}m total`;
    }
    if (isSerialized && qtyNum > 0) {
      return `${parsedIds.length}/${qtyNum} ${typeConfig.label.toLowerCase()}${qtyNum !== 1 ? 's' : ''} ready`;
    }
    if (isBulk && qtyNum > 0) return `${qtyNum} pcs`;
    return null;
  }, [isRoll, isSerialized, isBulk, qtyNum, metersPerRoll, totalCableMeters, typeConfig.label, parsedIds.length]);

  const idsComplete = !isSerialized || (parsedIds.length === qtyNum && qtyNum > 0);

  useEffect(() => {
    if (!open) return;
    setStep(isExisting ? 3 : 1);
    setAdvancedOpen(false);
    setBulkPaste(false);
    if (existingItem) {
      const inferred = inferItemTypeFromItem(existingItem);
      setItemTypeId(inferred);
      const cfg = getItemTypeConfig(inferred);
      if (inferred === 'splitter') setSplitterPreset(inferSplitterPresetId(existingItem.itemName));
      setForm({
        itemName: existingItem.itemName,
        itemCode: existingItem.itemCode || '',
        category: existingItem.category || cfg.category,
        minimumLevel: String(existingItem.minimumLevel || 0),
        quantity: '1',
        notes: '',
        metersPerRoll: String(cfg.defaultMetersPerRoll || 1000),
        rollIdPrefix: (existingItem.itemCode || cfg.rollIdPrefix || 'DC').slice(0, 6).toUpperCase(),
        unitIdsText: '',
      });
      setSerialRows(['']);
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
      setSerialRows(['']);
    }
  }, [open, existingItem, isExisting]);

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
    setStep(2);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      itemName: name,
      itemCode: isExisting || f.itemCode ? f.itemCode : slugItemCode(name, typeConfig.codePrefix),
    }));
  };

  const handleSerialRowChange = (index: number, value: string) => {
    const val = idType === 'mac' ? formatMacAddress(value.replace(/[^a-fA-F0-9:]/g, '')) : value;
    setSerialRows((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleBulkPasteText = (text: string) => {
    const formatted = idType === 'mac' ? formatMacLinesText(text) : text;
    setForm((f) => ({ ...f, unitIdsText: formatted }));
    const lines = parseIdLines(formatted);
    const count = lines.length;
    if (count > 0) {
      setForm((f) => ({ ...f, quantity: String(count) }));
    }
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) return true;
    if (s === 2) {
      if (!form.itemName.trim()) {
        toast.error('Enter an item name');
        return false;
      }
      return true;
    }
    if (s === 3) {
      if (!qtyNum || qtyNum < 1) {
        toast.error('Enter a valid quantity');
        return false;
      }
      if (isSerialized && !idsComplete) {
        toast.error(`Enter all ${qtyNum} ${idType === 'serial' ? 'serials' : 'MACs'}`);
        return false;
      }
      if (isRoll && (!metersPerRoll || metersPerRoll <= 0)) {
        toast.error('Enter meters per roll');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

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
    if (!validateStep(2) || !validateStep(3)) return;

    setSubmitting(true);
    try {
      if (isRoll) {
        if (!form.rollIdPrefix.trim()) throw new Error('Roll ID prefix is required');
        const res = await fetch('/api/isp/inventory/add-cable-rolls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId,
            itemName: form.itemName.trim(),
            itemCode: form.itemCode || undefined,
            category: form.category,
            rollCount: qtyNum,
            metersPerRoll,
            rollIdPrefix: form.rollIdPrefix.trim(),
            minimumLevel: parseFloat(form.minimumLevel) || 0,
            notes: form.notes || undefined,
            inventoryItemId: existingItem?.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add cable');
        toast.success(`Added ${qtyNum} roll(s) · ${totalCableMeters.toLocaleString()}m`);
      } else if (isSerialized) {
        const units = parsedIds.map((val) =>
          idType === 'serial' ? { serialNumber: val } : { macAddress: formatMacAddress(val) }
        );
        const added = await addSerializedUnits(form.itemName.trim(), units);
        await ensureInventoryItem(added);
        toast.success(`Added ${added} ${typeConfig.label.toLowerCase()}(s)`);
      } else {
        if (existingItem?.id) {
          await ensureInventoryItem(qtyNum);
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
              quantityAvailable: qtyNum,
              minimumLevel: parseFloat(form.minimumLevel) || 0,
              notes: form.notes || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to create item');
        }
        toast.success(`Added ${qtyNum} pcs`);
      }
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  const TypeIcon = TYPE_ICONS[itemTypeId] || Package;
  const showWizard = !isExisting;
  const isLastStep = step === 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0 space-y-3">
          <div className="flex items-center gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold">
                {isExisting ? `Add stock · ${existingItem?.itemName}` : 'Add to inventory'}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isExisting
                  ? `${typeConfig.label} · enter quantity${isSerialized ? ' and serials' : ''}`
                  : showWizard
                    ? `Step ${step} of 3 — ${STEPS[step - 1]?.label}`
                    : 'Enter stock details'}
              </DialogDescription>
            </div>
            {!isExisting && (
              <Badge variant="outline" className="shrink-0 text-[10px] hidden sm:flex">
                {typeConfig.label}
              </Badge>
            )}
          </div>
          {showWizard && <StepIndicator current={step} total={3} />}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* STEP 1 — Category */}
          {step === 1 && !isExisting && (
            <div className="space-y-4">
              {templates.length > 0 && (
                <div className="rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">From catalog</span>
                  </div>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Pick a saved item…" />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_ITEM_TYPES.map((type) => {
                        const group = templates.filter((t) => t.itemTypeId === type.id);
                        if (!group.length) return null;
                        return (
                          <SelectGroup key={type.id}>
                            <SelectLabel>{type.label}</SelectLabel>
                            {group.map((tpl) => (
                              <SelectItem key={tpl.id} value={tpl.id}>{tpl.itemName}</SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Or choose a type</p>
                <div className="grid grid-cols-3 gap-2">
                  {INVENTORY_ITEM_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t.id] || Package;
                    const selected = itemTypeId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleItemTypeChange(t.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent bg-muted/40 hover:bg-muted/70'
                        )}
                      >
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </span>
                        )}
                        <Icon className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')} />
                        <span className={cn('text-[11px] font-medium leading-tight', selected && 'text-primary')}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isSplitter && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Splitter size</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SPLITTER_PRESETS.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        size="sm"
                        variant={splitterPreset === p.id ? 'default' : 'outline'}
                        className="h-8 text-xs rounded-full px-3"
                        onClick={() => applySplitterPreset(p.id)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Details */}
          {step === 2 && !isExisting && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isSerialized ? 'Model / product name' : 'Item name'}
                </Label>
                <Input
                  value={form.itemName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isSplitter && !splitterIsCustom}
                  placeholder={typeConfig.namePlaceholder}
                  className="h-10"
                  autoFocus
                />
              </div>

              {!isSerialized && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Item code</Label>
                  <Input
                    value={form.itemCode}
                    onChange={(e) => setForm({ ...form, itemCode: e.target.value.toUpperCase() })}
                    disabled={isSplitter && !splitterIsCustom}
                    placeholder={`${typeConfig.codePrefix}-001`}
                    className="h-10 font-mono"
                  />
                </div>
              )}

              {(isRoll || itemTypeId === 'other') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Equipment', 'Materials', 'Drop Cable', 'Fiber Cable', 'Accessories', 'Other'].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {isSerialized && 'Each unit gets a unique serial or MAC'}
                  {isRoll && 'Tracked as individual rolls with meter lengths'}
                  {isBulk && 'Counted in pieces — no serial tracking'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — Amount (also used for existing-item flow) */}
          {step === 3 && (
            <div className="space-y-4">
              {isExisting && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <Badge variant="secondary">{typeConfig.label}</Badge>
                  <span className="text-sm font-medium truncate">{form.itemName}</span>
                </div>
              )}

              {/* Quantity row */}
              <div className={cn('gap-3', isRoll ? 'grid grid-cols-3' : 'grid grid-cols-2')}>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {isRoll ? 'Rolls' : isSerialized ? 'Units' : 'Quantity'}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={qtyNum <= 1}
                      onClick={() => setForm((f) => ({ ...f, quantity: String(Math.max(1, qtyNum - 1)) }))}
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="h-10 text-center text-lg font-semibold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setForm((f) => ({ ...f, quantity: String(qtyNum + 1) }))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {isRoll && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Meters/roll</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.metersPerRoll}
                        onChange={(e) => setForm({ ...form, metersPerRoll: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Prefix</Label>
                      <Input
                        value={form.rollIdPrefix}
                        onChange={(e) => setForm({ ...form, rollIdPrefix: e.target.value.toUpperCase() })}
                        className="h-10 font-mono"
                      />
                    </div>
                  </>
                )}
              </div>

              {isRoll && qtyNum > 0 && form.rollIdPrefix && (
                <p className="text-[11px] text-muted-foreground font-mono text-center">
                  {form.rollIdPrefix}-001 → {form.rollIdPrefix}-{String(qtyNum).padStart(3, '0')}
                </p>
              )}

              {/* Serialized IDs */}
              {isSerialized && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex rounded-lg border p-0.5 bg-muted/30">
                      <button
                        type="button"
                        onClick={() => setIdType('serial')}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          idType === 'serial' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                        )}
                      >
                        Serial #
                      </button>
                      <button
                        type="button"
                        onClick={() => setIdType('mac')}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          idType === 'mac' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                        )}
                      >
                        MAC
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-semibold tabular-nums',
                          idsComplete ? 'text-emerald-600' : 'text-muted-foreground'
                        )}
                      >
                        {parsedIds.length}/{qtyNum}
                      </span>
                      {!useBulkByDefault && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setBulkPaste((b) => !b)}
                        >
                          <ClipboardPaste className="h-3 w-3" />
                          {bulkPaste ? 'One by one' : 'Paste list'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {effectiveBulkPaste ? (
                    <Textarea
                      value={form.unitIdsText}
                      onChange={(e) => handleBulkPasteText(e.target.value)}
                      rows={Math.min(Math.max(qtyNum, 5), 12)}
                      placeholder={
                        idType === 'serial'
                          ? 'Paste one serial per line…'
                          : 'Paste MACs — colons added automatically'
                      }
                      className="font-mono text-xs resize-none"
                      autoFocus
                    />
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {Array.from({ length: qtyNum }, (_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-5 text-right tabular-nums shrink-0">
                            {i + 1}
                          </span>
                          <Input
                            value={serialRows[i] || ''}
                            onChange={(e) => handleSerialRowChange(i, e.target.value)}
                            placeholder={idType === 'serial' ? `Serial ${i + 1}` : 'AA:BB:CC:DD:EE:01'}
                            className="h-9 font-mono text-xs"
                          />
                          {serialRows[i]?.trim() && (
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40"
                  >
                    Low stock alert & notes
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', advancedOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2}
                      placeholder="Supplier, batch…"
                      className="text-sm resize-none"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-muted/20 px-5 py-3 space-y-3">
          {totalSummary && step === 3 && (
            <div
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                idsComplete || !isSerialized
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60'
                  : 'bg-muted border'
              )}
            >
              <span className="text-xs text-muted-foreground">Summary</span>
              <span className={cn('font-semibold', idsComplete || !isSerialized ? 'text-emerald-700 dark:text-emerald-400' : '')}>
                {totalSummary}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {showWizard && step > 1 ? (
              <Button variant="outline" className="gap-1" onClick={goBack} disabled={submitting}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
            )}

            {isLastStep ? (
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || (isSerialized && !idsComplete)}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isExisting ? 'Add to stock' : 'Add to inventory'}
              </Button>
            ) : (
              <Button className="flex-1 gap-1" onClick={goNext}>
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
