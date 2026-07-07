'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpCircle,
  Briefcase,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Share2,
  User,
  Wifi,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ISSUE_TYPE_OPTIONS, type IssueType } from '@/lib/isp/issue-types';
import {
  inferItemTypeFromItem,
  getItemTypeConfig,
  INVENTORY_ITEM_TYPES,
  type InventoryItemTypeId,
} from './inventory-item-types';
import { softBadgeClass, unitBadgeClasses } from './inventory-colors';
import { IssuePickerStep } from './issue-picker-step';

interface Station {
  id: string;
  stationName: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  unitType: string;
  quantityAvailable: number;
  category?: string;
  isCable?: boolean;
}

interface RouterUnitOption {
  id: string;
  itemName?: string;
  serialNumber?: string | null;
  macAddress?: string | null;
}

/** Per-item selection in the quick picker */
interface ItemSelection {
  quantityTaken: number;
  routerUnitIds: string[];
}

export interface IssueLineItem {
  itemId: string;
  quantityTaken: number;
  unitType: string;
  routerUnitIds: string[];
}

interface ConsolidatedItem {
  id: string;
  itemName: string;
  unitType: string;
  quantityAvailable: number;
  category?: string;
  typeId: InventoryItemTypeId;
  itemKey: string;
}

function consolidateInventoryItems(raw: InventoryItem[]): ConsolidatedItem[] {
  const map = new Map<string, ConsolidatedItem & { bestQty: number }>();
  for (const item of raw) {
    const itemKey = item.itemName.trim().toLowerCase();
    if (!itemKey) continue;
    const existing = map.get(itemKey);
    if (existing) {
      existing.quantityAvailable += item.quantityAvailable;
      if (item.quantityAvailable >= existing.bestQty) {
        existing.id = item.id;
        existing.bestQty = item.quantityAvailable;
      }
    } else {
      map.set(itemKey, {
        id: item.id,
        itemName: item.itemName,
        unitType: item.unitType,
        quantityAvailable: item.quantityAvailable,
        category: item.category,
        typeId: inferItemTypeFromItem(item),
        itemKey,
        bestQty: item.quantityAvailable,
      });
    }
  }
  return [...map.values()]
    .filter((i) => i.quantityAvailable > 0)
    .map(({ bestQty: _, ...rest }) => rest);
}

type PickerLevel = 'types' | 'items' | 'units';

interface IssueEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stations: Station[];
  technicians: { id: string; name: string }[];
  onSuccess: () => void;
}

type ReturnPreset = 'same_day_6pm' | 'custom' | 'none';

function sameDay6pmLocal(): string {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
}

function formatReturnDisplay(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function unitDisplayParts(u: RouterUnitOption): { serial?: string; mac?: string; fallback: string } {
  return {
    serial: u.serialNumber || undefined,
    mac: u.macAddress || undefined,
    fallback: u.serialNumber || u.macAddress || u.id,
  };
}

function unitLabel(u: RouterUnitOption): string {
  const p = unitDisplayParts(u);
  if (p.serial && p.mac) return `${p.serial} · ${p.mac}`;
  return p.fallback;
}

function getUnitsForItem(
  item: Pick<ConsolidatedItem, 'itemName'>,
  unitsByItemName: Map<string, RouterUnitOption[]>
): RouterUnitOption[] {
  return unitsByItemName.get(item.itemName.toLowerCase()) || [];
}

function isSerializedItem(
  item: Pick<ConsolidatedItem, 'itemName' | 'category' | 'unitType'>,
  units: RouterUnitOption[]
): boolean {
  if (units.length > 0) return true;
  const typeId = inferItemTypeFromItem(item);
  return getItemTypeConfig(typeId).tracking === 'serialized';
}

const STEPS = [
  { id: 1, label: 'Issue type' },
  { id: 2, label: 'Who & where' },
  { id: 3, label: 'Items' },
] as const;

const ISSUE_TYPE_ICONS: Record<IssueType, typeof User> = {
  TECHNICIAN_ONLY: User,
  SINGLE_STATION: Building2,
  SHARED_STATIONS: Share2,
  PROJECT: Briefcase,
};

const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  TECHNICIAN_ONLY: 'border-violet-300 bg-violet-50 text-violet-900 ring-violet-400/30 dark:bg-violet-950/30 dark:text-violet-200',
  SINGLE_STATION: 'border-blue-300 bg-blue-50 text-blue-900 ring-blue-400/30 dark:bg-blue-950/30 dark:text-blue-200',
  SHARED_STATIONS: 'border-indigo-300 bg-indigo-50 text-indigo-900 ring-indigo-400/30 dark:bg-indigo-950/30 dark:text-indigo-200',
  PROJECT: 'border-amber-300 bg-amber-50 text-amber-900 ring-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200',
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 px-5 py-3 border-b bg-muted/30 shrink-0">
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm',
                  !done && !active && 'bg-background border text-muted-foreground'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step.id}
              </span>
              <span
                className={cn(
                  'text-xs font-medium truncate',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px flex-1 mx-1', done ? 'bg-primary/40' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  accent = 'slate',
}: {
  title: string;
  description?: string;
  icon?: typeof Package;
  children: React.ReactNode;
  accent?: 'slate' | 'indigo' | 'blue';
}) {
  const accentClass =
    accent === 'indigo'
      ? 'border-indigo-200/80 bg-indigo-50/30 dark:bg-indigo-950/15'
      : accent === 'blue'
        ? 'border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/15'
        : 'border-border bg-card';

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', accentClass)}>
      <div className="flex items-start gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border shadow-sm">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function IssueEquipmentDialog({
  open,
  onOpenChange,
  stationId,
  stations,
  technicians,
  onSuccess,
}: IssueEquipmentDialogProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsByItemName, setUnitsByItemName] = useState<Map<string, RouterUnitOption[]>>(new Map());
  const [selections, setSelections] = useState<Record<string, ItemSelection>>({});
  const [itemSearch, setItemSearch] = useState('');
  const [pickerLevel, setPickerLevel] = useState<PickerLevel>('types');
  const [activeTypeId, setActiveTypeId] = useState<InventoryItemTypeId | null>(null);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
  const [macSearch, setMacSearch] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    issueType: 'SINGLE_STATION' as IssueType,
    sourceStationId: stationId,
    primaryStationId: stationId,
    sharedStationIds: [] as string[],
    technicianId: '',
    projectCustomer: '',
    returnPreset: 'same_day_6pm' as ReturnPreset,
    expectedReturnDate: sameDay6pmLocal(),
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm({
      issueType: 'SINGLE_STATION',
      sourceStationId: stationId,
      primaryStationId: stationId,
      sharedStationIds: [],
      technicianId: '',
      projectCustomer: '',
      returnPreset: 'same_day_6pm',
      expectedReturnDate: sameDay6pmLocal(),
      notes: '',
    });
    setSelections({});
    setUnitsByItemName(new Map());
    setItemSearch('');
    setPickerLevel('types');
    setActiveTypeId(null);
    setActiveItemKey(null);
    setMacSearch({});
  }, [open, stationId]);

  useEffect(() => {
    if (!open || !form.sourceStationId) return;
    setLoadingItems(true);
    fetch(`/api/isp/inventory?stationId=${form.sourceStationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) =>
        setItems(
          (d.items || []).filter(
            (i: InventoryItem) => !i.isCable && i.category !== 'Drop Cable'
          )
        )
      )
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  }, [open, form.sourceStationId]);

  useEffect(() => {
    setSelections({});
    setMacSearch({});
    setPickerLevel('types');
    setActiveTypeId(null);
    setActiveItemKey(null);
  }, [form.sourceStationId]);

  const consolidatedItems = useMemo(
    () => consolidateInventoryItems(items),
    [items]
  );

  const searchQuery = itemSearch.trim().toLowerCase();

  const typeGroups = useMemo(() => {
    return INVENTORY_ITEM_TYPES.filter((t) => t.id !== 'cable').map((config) => {
      const typeItems = consolidatedItems.filter((item) => {
        if (item.typeId !== config.id) return false;
        if (!searchQuery) return true;
        return item.itemName.toLowerCase().includes(searchQuery);
      });
      const selectedInType = typeItems.filter((item) => {
        const sel = selections[item.id];
        if (!sel) return false;
        const macUnits = getUnitsForItem(item, unitsByItemName);
        return macUnits.length > 0
          ? sel.routerUnitIds.length > 0
          : sel.quantityTaken > 0;
      }).length;
      const totalUnits = typeItems.reduce((s, item) => {
        const macUnits = getUnitsForItem(item, unitsByItemName);
        const sel = selections[item.id];
        if (sel) {
          return s + (macUnits.length > 0 ? sel.routerUnitIds.length : sel.quantityTaken);
        }
        return s;
      }, 0);
      return {
        config,
        items: typeItems,
        stockUnits: typeItems.reduce((s, i) => s + i.quantityAvailable, 0),
        selectedInType,
        pickedUnits: totalUnits,
      };
    }).filter((g) => g.items.length > 0);
  }, [consolidatedItems, searchQuery, selections, unitsByItemName]);

  const activeTypeConfig = activeTypeId ? getItemTypeConfig(activeTypeId) : null;
  const activeTypeGroup = typeGroups.find((g) => g.config.id === activeTypeId);
  const activeItem = activeItemKey
    ? consolidatedItems.find((i) => i.itemKey === activeItemKey) || null
    : null;

  const filteredItems = useMemo(() => {
    if (!activeTypeId) return [];
    return (activeTypeGroup?.items || []).filter((item) => {
      if (!searchQuery) return true;
      return item.itemName.toLowerCase().includes(searchQuery);
    });
  }, [activeTypeId, activeTypeGroup, searchQuery]);

  useEffect(() => {
    if (!open || !form.sourceStationId) return;
    setLoadingUnits(true);
    fetch(`/api/isp/routers?stationId=${form.sourceStationId}&status=available`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<string, RouterUnitOption[]>();
        for (const u of (d.routers || []) as RouterUnitOption[]) {
          const key = (u.itemName || '').toLowerCase();
          if (!key) continue;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(u);
        }
        setUnitsByItemName(map);
      })
      .catch(() => setUnitsByItemName(new Map()))
      .finally(() => setLoadingUnits(false));
  }, [open, form.sourceStationId]);

  const showShared = form.issueType === 'SHARED_STATIONS';
  const showProject = form.issueType === 'PROJECT';
  const otherStations = stations.filter((s) => s.id !== form.primaryStationId);

  const sourceName = stations.find((s) => s.id === form.sourceStationId)?.stationName;
  const techName = technicians.find((t) => t.id === form.technicianId)?.name;
  const primaryName = stations.find((s) => s.id === form.primaryStationId)?.stationName;
  const sharedNames = form.sharedStationIds
    .map((id) => stations.find((s) => s.id === id)?.stationName)
    .filter(Boolean);

  const selectedCount = useMemo(() => {
    let lines = 0;
    let units = 0;
    for (const item of consolidatedItems) {
      const sel = selections[item.id];
      if (!sel) continue;
      const macUnits = getUnitsForItem(item, unitsByItemName);
      if (macUnits.length > 0 && sel.routerUnitIds.length > 0) {
        lines += 1;
        units += sel.routerUnitIds.length;
      } else if (macUnits.length === 0 && sel.quantityTaken > 0) {
        lines += 1;
        units += sel.quantityTaken;
      }
    }
    return { lines, units };
  }, [consolidatedItems, selections, unitsByItemName]);

  const lineSummary = useMemo(() => {
    const rows: { name: string; qty: number; unit: string; macs?: string[] }[] = [];
    for (const item of consolidatedItems) {
      const sel = selections[item.id];
      if (!sel) continue;
      const macUnits = getUnitsForItem(item, unitsByItemName);
      if (macUnits.length > 0 && sel.routerUnitIds.length > 0) {
        const labels = sel.routerUnitIds
          .map((id) => macUnits.find((u) => u.id === id))
          .filter(Boolean)
          .map((u) => unitLabel(u!));
        rows.push({
          name: item.itemName,
          qty: sel.routerUnitIds.length,
          unit: item.unitType,
          macs: labels,
        });
      } else if (macUnits.length === 0 && sel.quantityTaken > 0) {
        rows.push({ name: item.itemName, qty: sel.quantityTaken, unit: item.unitType });
      }
    }
    return rows;
  }, [consolidatedItems, selections, unitsByItemName]);

  const getSelection = (itemId: string): ItemSelection =>
    selections[itemId] || { quantityTaken: 0, routerUnitIds: [] };

  const setBulkQty = (item: ConsolidatedItem, qty: number) => {
    const max = item.quantityAvailable;
    const next = Math.max(0, Math.min(max, qty));
    setSelections((prev) => {
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[item.id];
      } else {
        copy[item.id] = { quantityTaken: next, routerUnitIds: [] };
      }
      return copy;
    });
  };

  const adjustBulkQty = (item: ConsolidatedItem, delta: number) => {
    const current = getSelection(item.id).quantityTaken;
    setBulkQty(item, current + delta);
  };

  const toggleMacUnit = (itemId: string, unitId: string, checked: boolean) => {
    setSelections((prev) => {
      const current = prev[itemId] || { quantityTaken: 0, routerUnitIds: [] };
      const ids = checked
        ? [...current.routerUnitIds, unitId]
        : current.routerUnitIds.filter((id) => id !== unitId);
      const copy = { ...prev };
      if (ids.length === 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = { quantityTaken: ids.length, routerUnitIds: ids };
      }
      return copy;
    });
  };

  const selectAllMacs = (item: ConsolidatedItem) => {
    const units = getUnitsForItem(item, unitsByItemName);
    const filter = (macSearch[item.id] || '').toLowerCase();
    const filtered = filter
      ? units.filter((u) => unitLabel(u).toLowerCase().includes(filter))
      : units;
    setSelections((prev) => ({
      ...prev,
      [item.id]: {
        quantityTaken: filtered.length,
        routerUnitIds: filtered.map((u) => u.id),
      },
    }));
  };

  const openType = (typeId: InventoryItemTypeId) => {
    setActiveTypeId(typeId);
    setActiveItemKey(null);
    setPickerLevel('items');
  };

  const openItemUnits = (item: ConsolidatedItem) => {
    setActiveTypeId(item.typeId);
    setActiveItemKey(item.itemKey);
    setPickerLevel('units');
  };

  const pickerBack = () => {
    if (pickerLevel === 'units') {
      setActiveItemKey(null);
      setPickerLevel('items');
    } else if (pickerLevel === 'items') {
      setActiveTypeId(null);
      setPickerLevel('types');
    }
  };

  const clearItemSelection = (itemId: string) => {
    setSelections((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const toggleShared = (id: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      sharedStationIds: checked
        ? [...f.sharedStationIds, id]
        : f.sharedStationIds.filter((s) => s !== id),
    }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) return true;
    if (s === 2) {
      if (!form.technicianId) {
        toast.error('Select a technician');
        return false;
      }
      if (showShared && form.sharedStationIds.length === 0) {
        toast.error('Select at least one shared station');
        return false;
      }
      if (showProject && !form.projectCustomer.trim()) {
        toast.error('Enter a project or customer name');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step === 2 && form.returnPreset === 'same_day_6pm' && !form.expectedReturnDate) {
      setForm((f) => ({ ...f, expectedReturnDate: sameDay6pmLocal() }));
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const setReturnPreset = (preset: ReturnPreset) => {
    if (preset === 'same_day_6pm') {
      setForm((f) => ({
        ...f,
        returnPreset: 'same_day_6pm',
        expectedReturnDate: sameDay6pmLocal(),
      }));
    } else if (preset === 'custom') {
      setForm((f) => ({
        ...f,
        returnPreset: 'custom',
        expectedReturnDate: f.expectedReturnDate || sameDay6pmLocal(),
      }));
    } else {
      setForm((f) => ({ ...f, returnPreset: 'none', expectedReturnDate: '' }));
    }
  };

  const resolvedReturnDate = (): string | undefined => {
    if (form.returnPreset === 'none' || !form.expectedReturnDate) return undefined;
    const d = new Date(form.expectedReturnDate);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    const validLines: { item: ConsolidatedItem; sel: ItemSelection }[] = [];
    for (const item of consolidatedItems) {
      const sel = selections[item.id];
      if (!sel) continue;
      const macUnits = getUnitsForItem(item, unitsByItemName);
      if (macUnits.length > 0) {
        if (sel.routerUnitIds.length === 0) continue;
        if (sel.routerUnitIds.length > macUnits.length) {
          toast.error(`Too many units selected for ${item.itemName}`);
          return;
        }
        validLines.push({ item, sel });
      } else if (sel.quantityTaken > 0) {
        if (sel.quantityTaken > item.quantityAvailable) {
          toast.error(`Not enough ${item.itemName} in stock`);
          return;
        }
        validLines.push({ item, sel });
      }
    }

    if (validLines.length === 0) {
      toast.error('Select at least one item — set qty or pick MAC addresses');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/isp/technician-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: form.sourceStationId,
          sourceStationId: form.sourceStationId,
          primaryStationId: form.primaryStationId,
          issueType: form.issueType,
          sharedStationIds: showShared ? form.sharedStationIds : undefined,
          projectCustomer: showProject ? form.projectCustomer : form.projectCustomer || undefined,
          expectedReturnDate: resolvedReturnDate(),
          technicianId: form.technicianId,
          jobReference: form.projectCustomer || undefined,
          notes: form.notes || undefined,
          items: validLines.map(({ item, sel }) => {
            const macUnits = getUnitsForItem(item, unitsByItemName);
            return {
              itemId: item.id,
              quantityTaken:
                macUnits.length > 0 ? sel.routerUnitIds.length : sel.quantityTaken,
              unitType: item.unitType || 'pcs',
              routerUnitIds: sel.routerUnitIds.length ? sel.routerUnitIds : undefined,
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue');
      toast.success(
        showShared
          ? 'Equipment issued for shared station use'
          : 'Equipment issued successfully'
      );
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[min(92vh,100dvh)] flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0 space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpCircle className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold">Issue Equipment</DialogTitle>
              <DialogDescription className="text-sm">
                Stock deducts from source station · track returns by technician
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <StepIndicator current={step} />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
          {step === 1 && (
            <>
              <SectionCard
                title="How is this equipment being issued?"
                description="Pick the option that matches your operation"
                icon={Package}
              >
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {ISSUE_TYPE_OPTIONS.map((opt) => {
                    const Icon = ISSUE_TYPE_ICONS[opt.value];
                    const selected = form.issueType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            issueType: opt.value,
                            sharedStationIds:
                              opt.value === 'SHARED_STATIONS' ? f.sharedStationIds : [],
                          }))
                        }
                        className={cn(
                          'rounded-xl border-2 p-3.5 text-left transition-all hover:shadow-sm',
                          selected
                            ? cn('ring-2 ring-offset-1', ISSUE_TYPE_COLORS[opt.value])
                            : 'border-border bg-background hover:border-muted-foreground/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              selected ? 'bg-background/80' : 'bg-muted'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                              {opt.description}
                            </p>
                          </div>
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-primary ml-auto mt-0.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {showShared && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3 flex gap-3">
                  <Share2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                      Shared station mode
                    </p>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                      Next step: choose primary station and which co-located stations share the equipment.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <SectionCard title="Source & technician" description="Who is responsible and where stock comes from" icon={MapPin}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Source station</Label>
                    <p className="text-[11px] text-muted-foreground -mt-1">Stock deducts from here</p>
                    <Select
                      value={form.sourceStationId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, sourceStationId: v }))
                      }
                    >
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Technician responsible</Label>
                    <p className="text-[11px] text-muted-foreground -mt-1">Who carries the items</p>
                    <Select
                      value={form.technicianId}
                      onValueChange={(v) => setForm((f) => ({ ...f, technicianId: v }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select technician…" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.length === 0 ? (
                          <SelectItem value="_none" disabled>No technicians found</SelectItem>
                        ) : (
                          technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>

              {showShared && (
                <SectionCard
                  title="Shared stations"
                  description="Equipment used across co-located sites"
                  icon={Share2}
                  accent="indigo"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Primary station</Label>
                      <Select
                        value={form.primaryStationId}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            primaryStationId: v,
                            sharedStationIds: f.sharedStationIds.filter((id) => id !== v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stations.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Shared with</Label>
                      <p className="text-[11px] text-muted-foreground">Select all co-located stations</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {otherStations.map((s) => {
                          const checked = form.sharedStationIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleShared(s.id, !checked)}
                              className={cn(
                                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors',
                                checked
                                  ? 'border-indigo-400 bg-indigo-100/80 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100'
                                  : 'bg-background hover:bg-muted/50'
                              )}
                            >
                              <Checkbox checked={checked} className="pointer-events-none" />
                              <span className="font-medium truncate">{s.stationName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {(showProject || form.issueType === 'TECHNICIAN_ONLY') && (
                <SectionCard title="Project / customer" icon={Briefcase}>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {showProject ? 'Project or customer name' : 'Reference (optional)'}
                    </Label>
                    <Input
                      value={form.projectCustomer}
                      onChange={(e) => setForm((f) => ({ ...f, projectCustomer: e.target.value }))}
                      placeholder="e.g. Customer install — Main Street"
                      className="h-10"
                    />
                  </div>
                </SectionCard>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <SectionCard
                title="Select equipment"
                description={`Choose category → item → MAC if needed · From ${sourceName || 'source station'}`}
                icon={Package}
              >
                <IssuePickerStep
                  sourceName={sourceName}
                  loading={loadingItems || loadingUnits}
                  itemSearch={itemSearch}
                  onItemSearchChange={setItemSearch}
                  selectedCount={selectedCount}
                  pickerLevel={pickerLevel}
                  typeGroups={typeGroups}
                  activeTypeConfig={activeTypeConfig}
                  filteredItems={filteredItems}
                  activeItem={activeItem}
                  unitsByItemName={unitsByItemName}
                  selections={selections}
                  macSearch={macSearch}
                  onMacSearchChange={(itemId, v) => setMacSearch((p) => ({ ...p, [itemId]: v }))}
                  onBack={pickerBack}
                  onOpenType={openType}
                  onOpenItemUnits={openItemUnits}
                  getSelection={getSelection}
                  adjustBulkQty={adjustBulkQty}
                  setBulkQty={setBulkQty}
                  toggleMacUnit={toggleMacUnit}
                  selectAllMacs={selectAllMacs}
                  clearItemSelection={clearItemSelection}
                  isSerializedItem={isSerializedItem}
                  getUnitsForItem={getUnitsForItem}
                  hasStock={consolidatedItems.length > 0}
                />
              </SectionCard>

              {lineSummary.length > 0 && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Selected for issue ({lineSummary.length})
                  </p>
                  <ul className="space-y-1.5">
                    {lineSummary.map((row) => (
                      <li key={row.name} className="text-sm flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-medium">{row.name}</span>
                        <span className={softBadgeClass(unitBadgeClasses(row.unit === 'm' ? 'm' : 'pcs'))}>
                          {row.qty} {row.unit}
                        </span>
                        {row.macs && row.macs.length > 0 && (
                          <ul className="w-full mt-1 space-y-0.5">
                            {row.macs.map((mac) => (
                              <li
                                key={mac}
                                className="text-xs font-mono bg-violet-50 dark:bg-violet-950/30 border border-violet-200/80 rounded px-2 py-1 text-violet-900 dark:text-violet-200"
                              >
                                {mac}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <SectionCard title="Return & notes" description="When should equipment come back?">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Expected return</Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReturnPreset('same_day_6pm')}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                          form.returnPreset === 'same_day_6pm'
                            ? 'border-orange-400 bg-orange-50 text-orange-900 ring-2 ring-orange-300/40 dark:bg-orange-950/30 dark:text-orange-200'
                            : 'border-border bg-background hover:bg-muted/50'
                        )}
                      >
                        <Clock className="h-4 w-4 shrink-0" />
                        Same day by 6 PM
                        {form.returnPreset === 'same_day_6pm' && (
                          <Check className="h-4 w-4 shrink-0 text-orange-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnPreset('custom')}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all',
                          form.returnPreset === 'custom'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/25'
                            : 'border-border bg-background hover:bg-muted/50'
                        )}
                      >
                        Custom date & time
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnPreset('none')}
                        className={cn(
                          'inline-flex items-center rounded-xl border px-3 py-2.5 text-sm transition-all',
                          form.returnPreset === 'none'
                            ? 'border-muted-foreground/40 bg-muted'
                            : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        No return date
                      </button>
                    </div>
                    {form.returnPreset === 'same_day_6pm' && form.expectedReturnDate && (
                      <p className={softBadgeClass('bg-orange-100 text-orange-900 border-orange-200 text-xs')}>
                        Due back {formatReturnDisplay(form.expectedReturnDate)} — same day by 6:00 PM
                      </p>
                    )}
                    {form.returnPreset === 'custom' && (
                      <Input
                        type="datetime-local"
                        value={form.expectedReturnDate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            expectedReturnDate: e.target.value,
                            returnPreset: 'custom',
                          }))
                        }
                        className="h-10 max-w-xs"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Job details, location, or special instructions…"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </SectionCard>

              {(techName || lineSummary.length > 0) && (
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Issue summary
                  </p>
                  <div className="text-sm space-y-1">
                    {techName && (
                      <p>
                        <span className="text-muted-foreground">Technician:</span>{' '}
                        <strong>{techName}</strong>
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">From:</span>{' '}
                      <strong>{sourceName}</strong>
                    </p>
                    {showShared && sharedNames.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">Shared:</span>{' '}
                        <strong>{primaryName} + {sharedNames.join(', ')}</strong>
                      </p>
                    )}
                    {form.returnPreset !== 'none' && form.expectedReturnDate && (
                      <p>
                        <span className="text-muted-foreground">Return by:</span>{' '}
                        <strong className="text-orange-700 dark:text-orange-300">
                          {form.returnPreset === 'same_day_6pm'
                            ? 'Same day by 6 PM'
                            : formatReturnDisplay(form.expectedReturnDate)}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t px-5 py-4 flex items-center gap-2 bg-muted/20">
          {step > 1 ? (
            <Button variant="outline" onClick={goBack} disabled={submitting} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
          )}

          <div className="flex-1" />

          {step < 3 ? (
            <Button onClick={goNext} className="gap-1 min-w-[120px]">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5 min-w-[140px]">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="h-4 w-4" />
              )}
              Issue equipment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
