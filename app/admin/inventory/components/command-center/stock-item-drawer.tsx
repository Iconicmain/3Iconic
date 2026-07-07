'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, PackagePlus, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import type { MergedStockItem } from './stock-tab';
import {
  inferItemTypeFromItem,
  getItemTypeConfig,
} from './inventory-item-types';
import {
  categoryBadgeClasses,
  softBadgeClass,
  stockStatusStyle,
  unitBadgeClasses,
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

function unitStatusBadge(status?: string) {
  switch (status) {
    case 'available':
      return softBadgeClass('bg-emerald-100 text-emerald-800 border-emerald-200');
    case 'issued':
      return softBadgeClass('bg-blue-100 text-blue-800 border-blue-200');
    case 'damaged':
      return softBadgeClass('bg-red-100 text-red-800 border-red-200');
    default:
      return softBadgeClass('bg-slate-100 text-slate-700 border-slate-200');
  }
}

function stationNameForUnit(unit: RouterUnit, stations: Station[]): string {
  const ids = unit.stationIds?.length ? unit.stationIds : unit.stationId ? [unit.stationId] : [];
  if (ids.length === 0) return '—';
  const names = ids.map((id) => stations.find((s) => s.id === id)?.stationName || id);
  return names.join(', ');
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

  const typeId = item ? inferItemTypeFromItem(item) : 'other';
  const typeConfig = getItemTypeConfig(typeId);
  const isSerialized = typeConfig.tracking === 'serialized';
  const isMeter = !!(item?.isCable || item?.unitType === 'm' || item?.unitType === 'meters');

  useEffect(() => {
    if (!open || !item || !isSerialized) {
      setUnits([]);
      return;
    }
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

  if (!item) return null;

  const availableUnits = units.filter((u) => u.status === 'available');
  const issuedUnits = units.filter((u) => u.status === 'issued');
  const otherUnits = units.filter((u) => u.status !== 'available' && u.status !== 'issued');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start gap-3 pr-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Wifi className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">{item.itemName}</SheetTitle>
              <SheetDescription className="text-xs mt-1 space-y-1">
                {item.itemCode && (
                  <span className="font-mono block">{item.itemCode}</span>
                )}
                <span className="flex flex-wrap gap-1.5 mt-1.5">
                  {item.category && (
                    <span className={softBadgeClass(categoryBadgeClasses(item.category))}>
                      {item.category}
                    </span>
                  )}
                  <span className={softBadgeClass(unitBadgeClasses(isMeter ? 'm' : 'pcs'))}>
                    {typeConfig.label}
                  </span>
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="font-semibold tabular-nums mt-0.5">
                {isMeter
                  ? `${item.quantityAvailable.toLocaleString()}m`
                  : `${item.quantityAvailable} pcs`}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Min level</p>
              <p className="font-semibold tabular-nums mt-0.5">
                {isMeter ? `${item.minimumLevel}m` : `${item.minimumLevel} pcs`}
              </p>
            </div>
            {item.mergedCount > 1 && (
              <div className="rounded-lg border p-3 col-span-2 bg-blue-50/50 dark:bg-blue-950/20">
                <p className="text-xs text-muted-foreground">Stock records</p>
                <p className="text-sm font-medium mt-0.5">
                  {item.mergedCount} entries merged in this view
                </p>
              </div>
            )}
          </div>

          {isSerialized && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Units — MAC & serial</p>
                {!loading && (
                  <span className="text-xs text-muted-foreground">
                    {availableUnits.length} avail · {issuedUnits.length} issued
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-10 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : units.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                  No serialized units found for this item. Add stock with serial or MAC to track
                  individual units.
                </p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>MAC</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Station</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">
                            {u.serialNumber || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {u.macAddress || '—'}
                          </TableCell>
                          <TableCell>
                            <span className={unitStatusBadge(u.status)}>
                              {u.status || 'unknown'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                            {stationNameForUnit(u, stations)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {otherUnits.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Includes {otherUnits.length} damaged or inactive unit
                  {otherUnits.length !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}

          {isMeter && item.rollSummary && (
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <p className="font-semibold">Cable rolls</p>
              <p className="text-muted-foreground text-xs">
                {item.rollSummary.rollCount} rolls · {item.rollSummary.activeRolls} active ·{' '}
                {item.rollSummary.finishedRolls} finished
              </p>
              {!isAllStations && (
                <p className="text-xs text-cyan-700">Open rolls from the stock row menu.</p>
              )}
            </div>
          )}

          {!isSerialized && !isMeter && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Bulk item</p>
              Tracked by quantity only — no per-unit MAC or serial. Use{' '}
              <strong>Add quantity</strong> to increase stock.
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Last movement: {fmtDateTime(item.lastMovement as string)}
          </div>
        </div>

        {!isAllStations && onAddStock && !isMeter && (
          <div className="shrink-0 border-t px-5 py-3">
            <Button className="w-full" onClick={() => onAddStock(item)}>
              <PackagePlus className="h-4 w-4 mr-2" />
              Add quantity
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
