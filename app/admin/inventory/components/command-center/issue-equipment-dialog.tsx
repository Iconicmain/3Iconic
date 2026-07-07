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
  Plus,
  Share2,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ISSUE_TYPE_OPTIONS, type IssueType } from '@/lib/isp/issue-types';

interface Station {
  id: string;
  stationName: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  unitType: string;
  quantityAvailable: number;
}

interface Technician {
  id: string;
  name: string;
}

interface RouterUnitOption {
  id: string;
  serialNumber?: string | null;
  macAddress?: string | null;
}

export interface IssueLineItem {
  itemId: string;
  quantityTaken: number;
  unitType: string;
  routerUnitIds: string[];
}

interface IssueEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stations: Station[];
  technicians: Technician[];
  onSuccess: () => void;
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
  const [availableUnits, setAvailableUnits] = useState<Record<number, RouterUnitOption[]>>({});
  const [form, setForm] = useState({
    issueType: 'SINGLE_STATION' as IssueType,
    sourceStationId: stationId,
    primaryStationId: stationId,
    sharedStationIds: [] as string[],
    technicianId: '',
    projectCustomer: '',
    expectedReturnDate: '',
    notes: '',
    lines: [] as IssueLineItem[],
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
      expectedReturnDate: '',
      notes: '',
      lines: [],
    });
    setAvailableUnits({});
  }, [open, stationId]);

  useEffect(() => {
    if (!open || !form.sourceStationId) return;
    setLoadingItems(true);
    fetch(`/api/isp/inventory?stationId=${form.sourceStationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) =>
        setItems(
          (d.items || []).filter(
            (i: InventoryItem & { isCable?: boolean; category?: string }) =>
              !i.isCable && i.category !== 'Drop Cable'
          )
        )
      )
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
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

  const lineSummary = useMemo(() => {
    return form.lines
      .filter((l) => l.itemId)
      .map((line, idx) => {
        const item = items.find((i) => i.id === line.itemId);
        const units = availableUnits[idx] || [];
        const qty = units.length > 0 ? line.routerUnitIds.length : line.quantityTaken;
        return { name: item?.itemName || 'Item', qty, unit: item?.unitType || 'pcs' };
      });
  }, [form.lines, items, availableUnits]);

  const fetchUnits = (idx: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    fetch(
      `/api/isp/routers?stationId=${form.sourceStationId}&itemName=${encodeURIComponent(item.itemName)}&status=available`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((d) => setAvailableUnits((p) => ({ ...p, [idx]: d.routers || [] })))
      .catch(() => setAvailableUnits((p) => ({ ...p, [idx]: [] })));
  };

  const addLine = () => {
    if (form.lines.length >= 10) return;
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { itemId: '', quantityTaken: 1, unitType: 'pcs', routerUnitIds: [] }],
    }));
  };

  const ensureLine = () => {
    if (form.lines.length === 0) addLine();
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
    if (step === 2) ensureLine();
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    const validLines = form.lines
      .map((line, idx) => ({ ...line, idx }))
      .filter(({ itemId, routerUnitIds, quantityTaken, idx }) => {
        if (!itemId) return false;
        const units = availableUnits[idx] || [];
        if (units.length > 0) return routerUnitIds.length > 0;
        return quantityTaken > 0;
      });

    if (validLines.length === 0) {
      toast.error('Add at least one item');
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
          expectedReturnDate: form.expectedReturnDate || undefined,
          technicianId: form.technicianId,
          jobReference: form.projectCustomer || undefined,
          notes: form.notes || undefined,
          items: validLines.map((line) => {
            const units = availableUnits[line.idx] || [];
            return {
              itemId: line.itemId,
              quantityTaken: units.length > 0 ? line.routerUnitIds.length : line.quantityTaken,
              unitType: items.find((i) => i.id === line.itemId)?.unitType || 'pcs',
              routerUnitIds: line.routerUnitIds.length ? line.routerUnitIds : undefined,
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
                        setForm((f) => ({ ...f, sourceStationId: v, lines: [] }))
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
              <SectionCard title="Items to issue" description={`From ${sourceName || 'source station'}`} icon={Package}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-muted-foreground">
                    {loadingItems ? 'Loading inventory…' : `${items.length} items available`}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={loadingItems}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add item
                  </Button>
                </div>

                {loadingItems ? (
                  <div className="py-10 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : form.lines.length === 0 ? (
                  <button
                    type="button"
                    onClick={addLine}
                    className="w-full rounded-xl border-2 border-dashed py-10 px-4 text-center hover:bg-muted/40 transition-colors"
                  >
                    <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Add your first item</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Routers, ONUs, patch cords, and more
                    </p>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {form.lines.map((line, idx) => {
                      const units = availableUnits[idx] || [];
                      const hasUnits = units.length > 0;
                      const selectedItem = items.find((i) => i.id === line.itemId);
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border bg-background p-3.5 space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              Item {idx + 1}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Item</Label>
                              <Select
                                value={line.itemId}
                                onValueChange={(v) => {
                                  const item = items.find((i) => i.id === v);
                                  setForm((f) => ({
                                    ...f,
                                    lines: f.lines.map((row, i) =>
                                      i === idx
                                        ? {
                                            ...row,
                                            itemId: v,
                                            routerUnitIds: [],
                                            unitType: item?.unitType || 'pcs',
                                          }
                                        : row
                                    ),
                                  }));
                                  fetchUnits(idx, v);
                                }}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Choose item…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((i) => (
                                    <SelectItem key={i.id} value={i.id}>
                                      <span className="font-medium">{i.itemName}</span>
                                      <span className="text-muted-foreground ml-1.5">
                                        · {i.quantityAvailable} {i.unitType} avail
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {!hasUnits && (
                              <div className="space-y-1.5 sm:w-28">
                                <Label className="text-xs text-muted-foreground">Qty</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={selectedItem?.quantityAvailable}
                                  className="h-10"
                                  value={line.quantityTaken}
                                  onChange={(e) =>
                                    setForm((f) => ({
                                      ...f,
                                      lines: f.lines.map((row, i) =>
                                        i === idx
                                          ? { ...row, quantityTaken: parseInt(e.target.value, 10) || 1 }
                                          : row
                                      ),
                                    }))
                                  }
                                />
                              </div>
                            )}
                          </div>
                          {hasUnits && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">Serial / MAC — select units</Label>
                                <Badge variant="secondary">{line.routerUnitIds.length} selected</Badge>
                              </div>
                              <div className="grid gap-1.5 max-h-32 overflow-y-auto rounded-lg border p-2 bg-muted/20">
                                {units.map((u) => (
                                  <label
                                    key={u.id}
                                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-background"
                                  >
                                    <Checkbox
                                      checked={line.routerUnitIds.includes(u.id)}
                                      onCheckedChange={(c) =>
                                        setForm((f) => ({
                                          ...f,
                                          lines: f.lines.map((row, i) => {
                                            if (i !== idx) return row;
                                            const ids = c
                                              ? [...row.routerUnitIds, u.id]
                                              : row.routerUnitIds.filter((id) => id !== u.id);
                                            return { ...row, routerUnitIds: ids };
                                          }),
                                        }))
                                      }
                                    />
                                    <span className="font-mono text-xs">
                                      {u.serialNumber || u.macAddress}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Return & notes" description="Optional tracking details">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Expected return date</Label>
                    <Input
                      type="date"
                      value={form.expectedReturnDate}
                      onChange={(e) => setForm((f) => ({ ...f, expectedReturnDate: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
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
                    {lineSummary.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">Items:</span>{' '}
                        {lineSummary.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(', ')}
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
