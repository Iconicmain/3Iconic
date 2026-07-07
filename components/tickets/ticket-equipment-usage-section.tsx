'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, Plus, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EQUIPMENT_USAGE_TYPES,
  type EquipmentUsageType,
  type IssuedEquipmentOption,
  type TicketEquipmentUsageRecord,
} from '@/lib/tickets/equipment-usage-types';

export interface EquipmentUsageFormRow {
  clientId: string;
  optionKey: string;
  kind: 'item' | 'cable';
  technicianId: string;
  technicianName: string;
  sourceIssueId: string;
  issueItemId?: string;
  usageLogId?: string;
  itemId?: string;
  itemName: string;
  rollId?: string;
  rollCode?: string;
  unit: 'pcs' | 'm';
  outstanding: number;
  isSerialized: boolean;
  usageType: EquipmentUsageType;
  quantityUsed: number;
  selectedUnitId: string;
  metersUsed: number;
  metersReturned: number;
  wasteMeters: number;
  notes: string;
}

interface TicketEquipmentUsageSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  rows: EquipmentUsageFormRow[];
  onRowsChange: (rows: EquipmentUsageFormRow[]) => void;
  stationName: string;
  technicianNames: string[];
  ticketId: string;
  onOptionsChange?: (options: IssuedEquipmentOption[]) => void;
}

function newRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(): EquipmentUsageFormRow {
  return {
    clientId: newRowId(),
    optionKey: '',
    kind: 'item',
    technicianId: '',
    technicianName: '',
    sourceIssueId: '',
    itemName: '',
    unit: 'pcs',
    outstanding: 0,
    isSerialized: false,
    usageType: 'installed',
    quantityUsed: 1,
    selectedUnitId: '',
    metersUsed: 0,
    metersReturned: 0,
    wasteMeters: 0,
    notes: '',
  };
}

function rowFromOption(opt: IssuedEquipmentOption): EquipmentUsageFormRow {
  return {
    clientId: newRowId(),
    optionKey: opt.optionKey,
    kind: opt.kind,
    technicianId: opt.technicianId,
    technicianName: opt.technicianName,
    sourceIssueId: opt.sourceIssueId,
    issueItemId: opt.issueItemId,
    usageLogId: opt.usageLogId,
    itemId: opt.itemId,
    itemName: opt.itemName,
    rollId: opt.rollId,
    rollCode: opt.rollCode,
    unit: opt.unit,
    outstanding: opt.outstanding,
    isSerialized: opt.isSerialized,
    usageType: 'installed',
    quantityUsed: opt.kind === 'item' && !opt.isSerialized ? 1 : 1,
    selectedUnitId: '',
    metersUsed: 0,
    metersReturned: 0,
    wasteMeters: 0,
    notes: '',
  };
}

export function buildEquipmentPayload(
  rows: EquipmentUsageFormRow[],
  options: IssuedEquipmentOption[]
): TicketEquipmentUsageRecord[] {
  return rows
    .filter((r) => r.optionKey)
    .map((row) => {
      const opt = options.find((o) => o.optionKey === row.optionKey);
      const base = {
        kind: row.kind,
        technicianId: row.technicianId,
        technicianName: row.technicianName,
        sourceIssueId: row.sourceIssueId,
        usageType: row.usageType,
        notes: row.notes || undefined,
        itemName: row.itemName,
        unit: row.unit,
      };

      if (row.kind === 'cable') {
        return {
          ...base,
          usageLogId: row.usageLogId,
          rollId: row.rollId,
          rollCode: row.rollCode,
          metersUsed: row.metersUsed || 0,
          metersReturned: row.metersReturned || 0,
          wasteMeters: row.wasteMeters || 0,
        };
      }

      const unit = opt?.serializedUnits?.find((u) => u.id === row.selectedUnitId);
      const routerUnitIds = row.isSerialized && row.selectedUnitId ? [row.selectedUnitId] : undefined;
      return {
        ...base,
        issueItemId: row.issueItemId,
        itemId: row.itemId,
        quantityUsed: routerUnitIds?.length || row.quantityUsed,
        routerUnitIds,
        serialNumber: unit?.serialNumber || null,
        macAddress: unit?.macAddress || null,
      };
    });
}

export function validateEquipmentRows(
  rows: EquipmentUsageFormRow[],
  options: IssuedEquipmentOption[]
): string | null {
  const active = rows.filter((r) => r.optionKey);
  if (active.length === 0) return null;

  for (const row of active) {
    const opt = options.find((o) => o.optionKey === row.optionKey);
    if (!opt) return 'Invalid equipment selection — refresh and try again.';

    if (row.kind === 'item') {
      if (row.usageType === 'still_with_technician') continue;
      if (row.isSerialized) {
        if (!row.selectedUnitId) return `Select serial/MAC for ${row.itemName}`;
      } else {
        if (row.quantityUsed <= 0) return `Enter quantity used for ${row.itemName}`;
        if (row.quantityUsed > row.outstanding) {
          return `Cannot use more than ${row.outstanding} of ${row.itemName}`;
        }
      }
    } else {
      if (row.usageType === 'still_with_technician') continue;
      const total = row.metersUsed + row.metersReturned + row.wasteMeters;
      if (total <= 0) return `Enter cable meters for ${row.itemName}`;
      if (total > row.outstanding) {
        return `Cable total cannot exceed ${row.outstanding}m on ${row.rollCode || row.rollId}`;
      }
    }
  }
  return null;
}

export function TicketEquipmentUsageSection({
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
  stationName,
  technicianNames,
  ticketId,
  onOptionsChange,
}: TicketEquipmentUsageSectionProps) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<IssuedEquipmentOption[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const fetchOptions = useCallback(async () => {
    if (!enabled || technicianNames.length === 0) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        stationName,
        technicians: technicianNames.join(','),
        ticketId,
      });
      const res = await fetch(`/api/tickets/issued-equipment?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load issued equipment');
      setOptions(data.options || []);
      setWarnings(data.warnings || []);
      onOptionsChange?.(data.options || []);
    } catch (e) {
      setOptions([]);
      setWarnings([e instanceof Error ? e.message : 'Failed to load issued equipment']);
    } finally {
      setLoading(false);
    }
  }, [enabled, stationName, technicianNames, ticketId, onOptionsChange]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const usedOptionKeys = useMemo(
    () => new Set(rows.filter((r) => r.optionKey).map((r) => r.optionKey)),
    [rows]
  );

  const availableOptions = useMemo(
    () => options.filter((o) => !usedOptionKeys.has(o.optionKey)),
    [options, usedOptionKeys]
  );

  const updateRow = (clientId: string, patch: Partial<EquipmentUsageFormRow>) => {
    onRowsChange(rows.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  };

  const selectOption = (clientId: string, optionKey: string) => {
    const opt = options.find((o) => o.optionKey === optionKey);
    if (!opt) return;
    onRowsChange(
      rows.map((r) => (r.clientId === clientId ? rowFromOption(opt) : r))
    );
  };

  const addRow = () => {
    onRowsChange([...rows, emptyRow()]);
  };

  const removeRow = (clientId: string) => {
    onRowsChange(rows.filter((r) => r.clientId !== clientId));
  };

  return (
    <div className="rounded-xl border bg-muted/20 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-background/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Package className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Equipment used</p>
            <p className="text-xs text-muted-foreground truncate">
              Optional — only from issued inventory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="equipment-used-toggle" className="text-xs text-muted-foreground sr-only">
            Equipment was used
          </Label>
          <Switch
            id="equipment-used-toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>

      {enabled && (
        <div className="p-4 space-y-3">
          {technicianNames.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Select at least one technician on this ticket to load their issued equipment.
              </AlertDescription>
            </Alert>
          )}

          {warnings.map((w) => (
            <Alert key={w} variant="default" className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">{w}</AlertDescription>
            </Alert>
          ))}

          {loading ? (
            <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-xs">Loading issued equipment…</p>
            </div>
          ) : (
            <>
              {rows.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No equipment rows yet. Add a row to record items used on this ticket.
                </p>
              )}

              <div className="space-y-3">
                {rows.map((row, index) => {
                  const opt = options.find((o) => o.optionKey === row.optionKey);
                  const issuedUnits = opt?.serializedUnits || [];

                  return (
                    <div
                      key={row.clientId}
                      className="rounded-lg border bg-background p-3 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Item {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.clientId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Issued equipment</Label>
                          <Select
                            value={row.optionKey || undefined}
                            onValueChange={(v) => selectOption(row.clientId, v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select issued item or cable…" />
                            </SelectTrigger>
                            <SelectContent>
                              {row.optionKey && opt && (
                                <SelectItem value={row.optionKey}>
                                  {opt.kind === 'cable'
                                    ? `${opt.itemName} · ${opt.rollCode} (${opt.outstanding}m out)`
                                    : `${opt.itemName} (${opt.outstanding} ${opt.unit} out)`}
                                </SelectItem>
                              )}
                              {availableOptions.map((o) => (
                                <SelectItem key={o.optionKey} value={o.optionKey}>
                                  {o.kind === 'cable'
                                    ? `${o.technicianName} · ${o.itemName} ${o.rollCode} · ${o.outstanding}m`
                                    : `${o.technicianName} · ${o.itemName} · ${o.outstanding} pcs`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {row.optionKey && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Technician</Label>
                              <Input
                                value={row.technicianName}
                                readOnly
                                className="h-9 text-sm bg-muted/50"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Usage type</Label>
                              <Select
                                value={row.usageType}
                                onValueChange={(v) =>
                                  updateRow(row.clientId, { usageType: v as EquipmentUsageType })
                                }
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EQUIPMENT_USAGE_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {row.kind === 'item' && row.usageType !== 'still_with_technician' && (
                              <>
                                {row.isSerialized ? (
                                  <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-xs">Serial / MAC (issued only)</Label>
                                    <Select
                                      value={row.selectedUnitId || undefined}
                                      onValueChange={(v) =>
                                        updateRow(row.clientId, { selectedUnitId: v, quantityUsed: 1 })
                                      }
                                    >
                                      <SelectTrigger className="h-9 text-sm font-mono">
                                        <SelectValue placeholder="Select unit…" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {issuedUnits.map((u) => (
                                          <SelectItem key={u.id} value={u.id}>
                                            {u.macAddress || u.serialNumber || u.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">
                                      Used ({row.outstanding} max)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={row.outstanding}
                                      value={row.quantityUsed}
                                      onChange={(e) =>
                                        updateRow(row.clientId, {
                                          quantityUsed: Number(e.target.value) || 0,
                                        })
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Unit</Label>
                                  <Input value="pcs" readOnly className="h-9 text-sm bg-muted/50" />
                                </div>
                              </>
                            )}

                            {row.kind === 'cable' && row.usageType !== 'still_with_technician' && (
                              <>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Roll</Label>
                                  <Input
                                    value={row.rollCode || row.rollId || '—'}
                                    readOnly
                                    className="h-9 text-sm bg-muted/50 font-mono"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Outstanding</Label>
                                  <Input
                                    value={`${row.outstanding}m`}
                                    readOnly
                                    className="h-9 text-sm bg-muted/50"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Meters used</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={row.outstanding}
                                    value={row.metersUsed || ''}
                                    onChange={(e) =>
                                      updateRow(row.clientId, {
                                        metersUsed: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Returned unused (m)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={row.metersReturned || ''}
                                    onChange={(e) =>
                                      updateRow(row.clientId, {
                                        metersReturned: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Damaged / waste (m)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={row.wasteMeters || ''}
                                    onChange={(e) =>
                                      updateRow(row.clientId, {
                                        wasteMeters: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                              </>
                            )}

                            <div className="space-y-1.5 sm:col-span-2">
                              <Label className="text-xs">Notes</Label>
                              <Textarea
                                value={row.notes}
                                onChange={(e) => updateRow(row.clientId, { notes: e.target.value })}
                                rows={2}
                                className="text-sm resize-none min-h-[52px]"
                                placeholder="Optional notes…"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addRow}
                disabled={availableOptions.length === 0 && rows.every((r) => r.optionKey)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add used equipment
              </Button>

              <p className={cn('text-[10px] text-muted-foreground text-center')}>
                Warehouse stock is not shown — only items currently issued to the selected
                technicians.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Export options for parent validation on submit
export type { IssuedEquipmentOption };
