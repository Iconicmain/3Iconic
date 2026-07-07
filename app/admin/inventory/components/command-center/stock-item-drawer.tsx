'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  PackagePlus,
  Wifi,
  Cable,
  Plug,
  Box,
  GitBranch,
  Package,
  Copy,
  Check,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MergedStockItem } from './stock-tab';
import {
  inferItemTypeFromItem,
  getItemTypeConfig,
  type InventoryItemTypeId,
} from './inventory-item-types';
import {
  categoryBadgeClasses,
  softBadgeClass,
  stockStatusStyle,
  unitBadgeClasses,
  kpiCardClasses,
  kpiIconClasses,
  type StockStatus,
} from './inventory-colors';
import { cn } from '@/lib/utils';

interface Station {
  id: string;
  stationName: string;
}

interface RouterUnit {
  id: string;
  itemName?: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  status?: string;
  stationIds?: string[];
  stationId?: string;
  technicianId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface StockItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MergedStockItem | null;
  stationId: string;
  stations: Station[];
  isAllStations: boolean;
  onAddStock?: (item: MergedStockItem) => void;
}

type UnitFilter = 'all' | 'available' | 'issued';

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

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stockStatusForItem(qty: number, min: number): { label: string; status: StockStatus } {
  if (qty <= 0) return { label: 'Out of stock', status: 'out' };
  if (min > 0 && qty <= min) return { label: 'Low stock', status: 'low' };
  return { label: 'Healthy', status: 'healthy' };
}

function unitStatusStyle(status?: string): string {
  switch (status) {
    case 'available':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'issued':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
    case 'damaged':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300';
  }
}

function stationNameForUnit(unit: RouterUnit, stations: Station[]): string {
  const ids = unit.stationIds?.length ? unit.stationIds : unit.stationId ? [unit.stationId] : [];
  if (ids.length === 0) return '—';
  return ids.map((id) => stations.find((s) => s.id === id)?.stationName || id).join(', ');
}

function mergedCoverageLabel(labels: string[]): string {
  if (labels.length === 0) return '—';
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, n]) => (n > 1 ? `${name} (${n})` : name))
    .join(' · ');
}

function CopyableValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2 min-w-0 text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/80 transition-colors"
      title={`Copy ${label}`}
    >
      <span className="font-mono text-sm font-medium truncate">{value}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

function UnitCard({
  unit,
  index,
  stations,
}: {
  unit: RouterUnit;
  index: number;
  stations: Station[];
}) {
  const station = stationNameForUnit(unit, stations);
  const mac = unit.macAddress?.trim();
  const serial = unit.serialNumber?.trim();

  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Unit {index + 1}
        </span>
        <span className={softBadgeClass(unitStatusStyle(unit.status))}>
          {unit.status || 'unknown'}
        </span>
      </div>

      <div className="space-y-2.5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
            MAC address
          </p>
          {mac ? (
            <CopyableValue value={mac} label="MAC" />
          ) : (
            <p className="text-sm text-muted-foreground font-mono">Not recorded</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
            Serial number
          </p>
          {serial ? (
            <CopyableValue value={serial} label="Serial" />
          ) : (
            <p className="text-sm text-muted-foreground font-mono">Not recorded</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{station}</span>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
      )}
    >
      {label}
      <span className={cn('ml-1.5 tabular-nums', active ? 'opacity-80' : 'opacity-60')}>
        {count}
      </span>
    </button>
  );
}

export function StockItemDrawer({
  open,
  onOpenChange,
  item,
  stationId,
  stations,
  isAllStations,
  onAddStock,
}: StockItemDrawerProps) {
  const [units, setUnits] = useState<RouterUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');

  const typeId = item ? inferItemTypeFromItem(item) : 'other';
  const typeConfig = getItemTypeConfig(typeId);
  const isSerialized = typeConfig.tracking === 'serialized';
  const isMeter = !!(item?.isCable || item?.unitType === 'm' || item?.unitType === 'meters');
  const TypeIcon = TYPE_ICONS[typeId] || Package;

  useEffect(() => {
    if (!open || !item || !isSerialized) {
      setUnits([]);
      return;
    }
    setUnitFilter('all');
    setLoading(true);
    const params = new URLSearchParams({
      stationId,
      itemName: item.itemName,
    });
    fetch(`/api/isp/routers?${params}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUnits(d.routers || []);
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load units');
        setUnits([]);
      })
      .finally(() => setLoading(false));
  }, [open, item, stationId, isSerialized]);

  const availableUnits = useMemo(
    () => units.filter((u) => u.status === 'available'),
    [units]
  );
  const issuedUnits = useMemo(() => units.filter((u) => u.status === 'issued'), [units]);

  const filteredUnits = useMemo(() => {
    if (unitFilter === 'available') return availableUnits;
    if (unitFilter === 'issued') return issuedUnits;
    return units;
  }, [units, unitFilter, availableUnits, issuedUnits]);

  if (!item) return null;

  const health = stockStatusForItem(item.quantityAvailable, item.minimumLevel);
  const coverage = mergedCoverageLabel(item.stationLabels);
  const qtyLabel = isMeter
    ? `${item.quantityAvailable.toLocaleString()}m`
    : `${item.quantityAvailable} pcs`;
  const minLabel = isMeter ? `${item.minimumLevel}m` : `${item.minimumLevel} pcs`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0 overflow-hidden">
        {/* Hero header */}
        <div className="shrink-0 border-b bg-gradient-to-br from-emerald-50/90 via-background to-background dark:from-emerald-950/30">
          <SheetHeader className="px-5 pt-5 pb-4 space-y-0">
            <div className="flex items-start gap-3.5 pr-8">
              <span className={cn(kpiIconClasses('stock'), 'h-11 w-11 flex items-center justify-center rounded-xl')}>
                <TypeIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-lg leading-tight">{item.itemName}</SheetTitle>
                  <span className={softBadgeClass(stockStatusStyle(health.status))}>
                    {health.label}
                  </span>
                </div>
                <SheetDescription asChild>
                  <div className="space-y-2">
                    {item.itemCode && (
                      <p className="font-mono text-xs text-muted-foreground">{item.itemCode}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {item.category && (
                        <span className={softBadgeClass(categoryBadgeClasses(item.category))}>
                          {item.category}
                        </span>
                      )}
                      <span className={softBadgeClass(unitBadgeClasses(isMeter ? 'm' : 'pcs'))}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* KPI strip */}
          <div className="px-5 pb-4 grid grid-cols-3 gap-2">
            <div className={cn(kpiCardClasses('stock'), 'rounded-xl border p-3')}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Available
              </p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{qtyLabel}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Min level
              </p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{minLabel}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Units
              </p>
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {isSerialized ? units.length || item.quantityAvailable : item.quantityAvailable}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* Coverage & merge info */}
            {(isAllStations || item.mergedCount > 1) && (
              <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  Station coverage
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{coverage}</p>
                {item.mergedCount > 1 && (
                  <p className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400">
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    {item.mergedCount} stock records combined in this view
                  </p>
                )}
              </div>
            )}

            {/* Serialized units */}
            {isSerialized && (
              <section className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Individual units</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      MAC & serial for each tracked device
                    </p>
                  </div>
                  {!loading && units.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <FilterChip
                        active={unitFilter === 'all'}
                        count={units.length}
                        label="All"
                        onClick={() => setUnitFilter('all')}
                      />
                      <FilterChip
                        active={unitFilter === 'available'}
                        count={availableUnits.length}
                        label="Available"
                        onClick={() => setUnitFilter('available')}
                      />
                      <FilterChip
                        active={unitFilter === 'issued'}
                        count={issuedUnits.length}
                        label="Issued"
                        onClick={() => setUnitFilter('issued')}
                      />
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="py-14 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <p className="text-sm">Loading units…</p>
                  </div>
                ) : units.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
                    <Wifi className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-medium">No tracked units yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Add stock with a MAC or serial number to track each device individually.
                    </p>
                  </div>
                ) : filteredUnits.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No {unitFilter} units for this item.
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {filteredUnits.map((u, i) => (
                      <UnitCard key={u.id} unit={u} index={i} stations={stations} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Cable rolls summary */}
            {isMeter && item.rollSummary && (
              <div className={cn(kpiCardClasses('cable'), 'rounded-xl border p-4 space-y-1')}>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Cable className="h-4 w-4" />
                  Cable rolls
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.rollSummary.rollCount} rolls · {item.rollSummary.activeRolls} active ·{' '}
                  {item.rollSummary.finishedRolls} finished
                </p>
                {!isAllStations && (
                  <p className="text-xs text-cyan-700 dark:text-cyan-400 pt-1">
                    Open roll details from the stock row menu.
                  </p>
                )}
              </div>
            )}

            {/* Bulk item */}
            {!isSerialized && !isMeter && (
              <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-center space-y-2">
                <Package className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">Quantity-only item</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  This item is tracked by count only — no per-unit MAC or serial. Use Add stock to
                  increase quantity.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-muted/20 px-5 py-3 space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Last movement · {fmtDateTime(item.lastMovement as string)}
          </p>
          {!isAllStations && onAddStock && !isMeter && (
            <Button className="w-full" onClick={() => onAddStock(item)}>
              <PackagePlus className="h-4 w-4 mr-2" />
              Add stock
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
