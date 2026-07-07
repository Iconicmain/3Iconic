'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getItemTypeConfig,
  type InventoryItemTypeId,
} from './inventory-item-types';
import { categoryBadgeClasses, softBadgeClass } from './inventory-colors';

export interface ConsolidatedPickItem {
  id: string;
  itemName: string;
  unitType: string;
  quantityAvailable: number;
  category?: string;
  typeId: InventoryItemTypeId;
  itemKey: string;
}

export interface RouterUnitOption {
  id: string;
  itemName?: string;
  serialNumber?: string | null;
  macAddress?: string | null;
}

export interface ItemSelection {
  quantityTaken: number;
  routerUnitIds: string[];
}

type PickerLevel = 'types' | 'items' | 'units';

const TYPE_ICONS: Partial<Record<InventoryItemTypeId, typeof Package>> = {
  router: Wifi,
  access_point: Wifi,
  bridge: Wifi,
  onu: Package,
  patch_cord: Package,
  splitter: Package,
  socket: Package,
};

function unitDisplayParts(u: RouterUnitOption) {
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

interface TypeGroup {
  config: ReturnType<typeof getItemTypeConfig>;
  items: ConsolidatedPickItem[];
  stockUnits: number;
  selectedInType: number;
  pickedUnits: number;
}

interface IssuePickerStepProps {
  sourceName?: string;
  loading: boolean;
  itemSearch: string;
  onItemSearchChange: (v: string) => void;
  selectedCount: { lines: number; units: number };
  pickerLevel: PickerLevel;
  typeGroups: TypeGroup[];
  activeTypeConfig: ReturnType<typeof getItemTypeConfig> | null;
  filteredItems: ConsolidatedPickItem[];
  activeItem: ConsolidatedPickItem | null;
  unitsByItemName: Map<string, RouterUnitOption[]>;
  selections: Record<string, ItemSelection>;
  macSearch: Record<string, string>;
  onMacSearchChange: (itemId: string, v: string) => void;
  onBack: () => void;
  onOpenType: (typeId: InventoryItemTypeId) => void;
  onOpenItemUnits: (item: ConsolidatedPickItem) => void;
  getSelection: (itemId: string) => ItemSelection;
  adjustBulkQty: (item: ConsolidatedPickItem, delta: number) => void;
  setBulkQty: (item: ConsolidatedPickItem, qty: number) => void;
  toggleMacUnit: (itemId: string, unitId: string, checked: boolean) => void;
  selectAllMacs: (item: ConsolidatedPickItem) => void;
  clearItemSelection: (itemId: string) => void;
  isSerializedItem: (
    item: Pick<ConsolidatedPickItem, 'itemName' | 'category' | 'unitType'>,
    units: RouterUnitOption[]
  ) => boolean;
  getUnitsForItem: (
    item: Pick<ConsolidatedPickItem, 'itemName'>,
    map: Map<string, RouterUnitOption[]>
  ) => RouterUnitOption[];
  hasStock: boolean;
}

export function IssuePickerStep(props: IssuePickerStepProps) {
  const {
    sourceName,
    loading,
    itemSearch,
    onItemSearchChange,
    selectedCount,
    pickerLevel,
    typeGroups,
    activeTypeConfig,
    filteredItems,
    activeItem,
    unitsByItemName,
    selections,
    macSearch,
    onMacSearchChange,
    onBack,
    onOpenType,
    onOpenItemUnits,
    getSelection,
    adjustBulkQty,
    setBulkQty,
    toggleMacUnit,
    selectAllMacs,
    clearItemSelection,
    isSerializedItem,
    getUnitsForItem,
    hasStock,
  } = props;

  const renderMacPicker = (item: ConsolidatedPickItem) => {
    const macUnits = getUnitsForItem(item, unitsByItemName);
    const sel = getSelection(item.id);
    const macFilter = (macSearch[item.id] || '').toLowerCase();
    const visibleMacs = macFilter
      ? macUnits.filter((u) => unitLabel(u).toLowerCase().includes(macFilter))
      : macUnits;
    const isActive = sel.routerUnitIds.length > 0;

    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-violet-50/50 dark:bg-violet-950/20 px-3 py-2">
          <p className="text-sm font-semibold">{item.itemName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Match the MAC or serial on the physical device before issuing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={macSearch[item.id] || ''}
            onChange={(e) => onMacSearchChange(item.id, e.target.value)}
            placeholder="Search MAC or serial…"
            className="h-9 flex-1 min-w-[160px] text-xs font-mono"
          />
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => selectAllMacs(item)}>
            Select all ({visibleMacs.length})
          </Button>
          {isActive && (
            <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={() => clearItemSelection(item.id)}>
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 max-h-[min(38vh,320px)] overflow-y-auto">
          {visibleMacs.map((u) => {
            const checked = sel.routerUnitIds.includes(u.id);
            const parts = unitDisplayParts(u);
            return (
              <label
                key={u.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors',
                  checked
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                    : 'bg-background hover:bg-muted/50'
                )}
              >
                <Checkbox
                  checked={checked}
                  className="mt-0.5"
                  onCheckedChange={(c) => toggleMacUnit(item.id, u.id, !!c)}
                />
                <div className="min-w-0 flex-1 font-mono text-xs space-y-0.5">
                  {parts.serial && (
                    <p>
                      <span className="text-muted-foreground font-sans text-[10px] uppercase mr-1.5">Serial</span>
                      <span className="font-semibold">{parts.serial}</span>
                    </p>
                  )}
                  {parts.mac && (
                    <p>
                      <span className="text-muted-foreground font-sans text-[10px] uppercase mr-1.5">MAC</span>
                      <span className="font-semibold">{parts.mac}</span>
                    </p>
                  )}
                  {!parts.serial && !parts.mac && <p className="font-semibold">{parts.fallback}</p>}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {pickerLevel !== 'types' && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {pickerLevel === 'units'
            ? `Back to ${activeTypeConfig?.label || 'items'}`
            : 'Back to categories'}
        </button>
      )}

      {pickerLevel === 'items' && activeTypeConfig && (
        <p className="text-sm font-semibold">{activeTypeConfig.label}</p>
      )}
      {pickerLevel === 'units' && activeTypeConfig && activeItem && (
        <p className="text-xs text-muted-foreground">
          {activeTypeConfig.label} · {activeItem.itemName}
        </p>
      )}

      {pickerLevel !== 'units' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={itemSearch}
              onChange={(e) => onItemSearchChange(e.target.value)}
              placeholder={
                pickerLevel === 'types'
                  ? 'Search categories or item names…'
                  : `Search ${activeTypeConfig?.label.toLowerCase() || 'items'}…`
              }
              className="pl-9 h-9"
            />
          </div>
          {selectedCount.lines > 0 && (
            <Badge className="self-start sm:self-center bg-primary/10 text-primary border-primary/20 shrink-0">
              {selectedCount.lines} type{selectedCount.lines !== 1 ? 's' : ''} · {selectedCount.units} unit
              {selectedCount.units !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading stock & serial units…</p>
        </div>
      ) : !hasStock && pickerLevel === 'types' ? (
        <div className="rounded-xl border border-dashed py-10 px-4 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No items in stock</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nothing available at {sourceName || 'this station'} — add stock first
          </p>
        </div>
      ) : pickerLevel === 'types' ? (
        <div className="grid sm:grid-cols-2 gap-2 max-h-[min(44vh,380px)] overflow-y-auto pr-0.5">
          {typeGroups.map((group) => {
            const Icon = TYPE_ICONS[group.config.id] || Package;
            return (
              <button
                key={group.config.id}
                type="button"
                onClick={() => onOpenType(group.config.id)}
                className="flex items-center gap-3 rounded-xl border p-3.5 text-left hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{group.config.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.items.length} model{group.items.length !== 1 ? 's' : ''} · {group.stockUnits}{' '}
                    {group.config.unitType} in stock
                  </p>
                  {group.selectedInType > 0 && (
                    <p className="text-[11px] text-primary font-medium mt-1">
                      {group.selectedInType} selected · {group.pickedUnits} unit{group.pickedUnits !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      ) : pickerLevel === 'items' ? (
        filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No matching items in this category</p>
        ) : (
          <div className="space-y-2 max-h-[min(44vh,380px)] overflow-y-auto pr-0.5">
            {filteredItems.map((item) => {
              const macUnits = getUnitsForItem(item, unitsByItemName);
              const serialized = isSerializedItem(item, macUnits);
              const sel = getSelection(item.id);
              const isActive = serialized ? sel.routerUnitIds.length > 0 : sel.quantityTaken > 0;

              if (serialized && macUnits.length > 0) {
                return (
                  <button
                    key={item.itemKey}
                    type="button"
                    onClick={() => onOpenItemUnits(item)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      isActive
                        ? 'border-primary/40 bg-primary/[0.03]'
                        : 'hover:border-muted-foreground/30 hover:bg-muted/30'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold">{item.itemName}</p>
                        <span className={softBadgeClass('bg-violet-100 text-violet-800 border-violet-200 text-[10px]')}>
                          MAC / Serial
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {macUnits.length} unit{macUnits.length !== 1 ? 's' : ''} — tap to pick by MAC or serial
                      </p>
                      {isActive && (
                        <p className="text-[11px] font-mono text-primary mt-1">
                          Selected: {sel.routerUnitIds
                            .map((id) => macUnits.find((u) => u.id === id))
                            .filter(Boolean)
                            .map((u) => unitLabel(u!))
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive && (
                        <Badge variant="secondary">{sel.routerUnitIds.length} picked</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={item.itemKey}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-3',
                    isActive ? 'border-primary/40 bg-primary/[0.03]' : 'bg-background'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.quantityAvailable} {item.unitType} available
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={sel.quantityTaken <= 0}
                      onClick={() => adjustBulkQty(item, -1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantityAvailable}
                      className="h-8 w-14 text-center px-1 tabular-nums"
                      value={sel.quantityTaken || ''}
                      placeholder="0"
                      onChange={(e) => setBulkQty(item, parseInt(e.target.value, 10) || 0)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={sel.quantityTaken >= item.quantityAvailable}
                      onClick={() => adjustBulkQty(item, 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2 text-[11px] hidden sm:inline-flex"
                      disabled={sel.quantityTaken + 5 > item.quantityAvailable}
                      onClick={() => adjustBulkQty(item, 5)}
                    >
                      +5
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeItem ? (
        renderMacPicker(activeItem)
      ) : null}
    </div>
  );
}
