'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Loader2, History, PackagePlus, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import { AddStockModal } from './add-stock-modal';
import { CableRollDrawer } from './cable-roll-drawer';
import { ItemCatalogSheet, type ItemTemplate } from './item-catalog-sheet';

interface Station {
  id: string;
  stationName: string;
}

interface RollSummary {
  rollCount: number;
  activeRolls: number;
  finishedRolls: number;
  damagedRolls: number;
}

export interface StockItem {
  id: string;
  itemName: string;
  itemCode?: string;
  category?: string;
  unitType?: string;
  quantityAvailable: number;
  minimumLevel: number;
  isCable?: boolean;
  stationId?: string;
  stationIds?: string[];
  rollSummary?: RollSummary | null;
  lastMovement?: string | null;
  updatedAt?: string;
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isMeterItem(item: StockItem): boolean {
  return !!(item.isCable || item.unitType === 'meters' || item.unitType === 'm');
}

function displayUnit(item: StockItem): string {
  return isMeterItem(item) ? 'm' : 'pcs';
}

function stockStatus(item: StockItem): { label: string; variant: 'destructive' | 'default' | 'secondary' } {
  if (item.quantityAvailable <= 0) return { label: 'Out of Stock', variant: 'destructive' };
  if (item.quantityAvailable <= item.minimumLevel) return { label: 'Low Stock', variant: 'default' };
  return { label: 'Healthy', variant: 'secondary' };
}

function coverageLabel(item: StockItem, stations: Station[]): string {
  if (item.stationIds && item.stationIds.length > 1) return `${item.stationIds.length} stations`;
  if (item.stationIds?.length === 1) {
    const s = stations.find((st) => st.id === item.stationIds![0]);
    return s?.stationName || '1 station';
  }
  if (item.stationId) {
    const s = stations.find((st) => st.id === item.stationId);
    return s?.stationName || 'Station';
  }
  return 'All stations';
}

interface StockTabProps {
  stationId: string;
  stations: Station[];
  isAllStations: boolean;
  searchQuery: string;
  filterCategory: string;
  filterUnit: string;
  filterLowStock: boolean;
  refreshKey: number;
  onRefresh: () => void;
  onAddStock?: () => void;
}

export function StockTab({
  stationId,
  stations,
  isAllStations,
  searchQuery,
  filterCategory,
  filterUnit,
  filterLowStock,
  refreshKey,
  onRefresh,
}: StockTabProps) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [cableItem, setCableItem] = useState<StockItem | null>(null);
  const [addToItem, setAddToItem] = useState<StockItem | null>(null);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);

  const fetchTemplates = () => {
    fetch('/api/isp/item-templates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  };

  useEffect(() => {
    if (!isAllStations) fetchTemplates();
  }, [isAllStations, refreshKey]);

  const fetchItems = () => {
    setLoading(true);
    let url = `/api/isp/inventory?stationId=${stationId}`;
    if (filterCategory !== 'all') url += `&category=${encodeURIComponent(filterCategory)}`;
    if (filterUnit !== 'all') url += `&unitType=${filterUnit}`;
    if (filterLowStock) url += '&lowStock=true';
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setItems(d.items || []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, [stationId, filterCategory, filterUnit, filterLowStock, refreshKey]);

  const filtered = items.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.itemName.toLowerCase().includes(q) ||
      (i.itemCode || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  });

  const handleRowClick = (item: StockItem) => {
    if (isMeterItem(item) && !isAllStations) setCableItem(item);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          {isAllStations && ' · Select a station to add stock or manage rolls'}
        </p>
        {!isAllStations && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)}>
              <BookMarked className="h-4 w-4 mr-1.5" />
              Item Catalog
            </Button>
            <Button size="sm" onClick={() => { setAddToItem(null); setAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Stock
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 text-sm">
              No inventory items found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="hidden lg:table-cell">Min Level</TableHead>
                    <TableHead className="hidden md:table-cell">Coverage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden xl:table-cell">Last Movement</TableHead>
                    {!isAllStations && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const status = stockStatus(item);
                    const meter = isMeterItem(item);
                    return (
                      <TableRow
                        key={item.id}
                        className={meter && !isAllStations ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => handleRowClick(item)}
                      >
                        <TableCell>
                          <p className="font-medium">{item.itemName}</p>
                          {item.itemCode && (
                            <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                          )}
                          {meter && item.rollSummary && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Rolls: {item.rollSummary.rollCount} · Active: {item.rollSummary.activeRolls} · Finished: {item.rollSummary.finishedRolls}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.category || '-'}</TableCell>
                        <TableCell>{displayUnit(item)}</TableCell>
                        <TableCell className="font-medium">
                          {meter
                            ? `${item.quantityAvailable.toLocaleString()}m`
                            : `${item.quantityAvailable} pcs`}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {meter ? `${item.minimumLevel}m` : `${item.minimumLevel} pcs`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {coverageLabel(item, stations)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant === 'default' ? 'outline' : status.variant} className={status.label === 'Low Stock' ? 'bg-amber-500 text-white border-0' : ''}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                          {fmtDateTime(item.lastMovement as string)}
                        </TableCell>
                        {!isAllStations && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {meter ? (
                                  <DropdownMenuItem onClick={() => setCableItem(item)}>
                                    View rolls
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => { setAddToItem(item); setAddOpen(true); }}>
                                    <PackagePlus className="h-4 w-4 mr-2" />
                                    Add quantity
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem disabled>
                                  <History className="h-4 w-4 mr-2" />
                                  History
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isAllStations && (
        <>
          <AddStockModal
            open={addOpen}
            onOpenChange={setAddOpen}
            stationId={stationId}
            stations={stations}
            existingItem={addToItem}
            templates={templates}
            onSuccess={() => {
              fetchItems();
              onRefresh();
            }}
          />
          <ItemCatalogSheet
            open={catalogOpen}
            onOpenChange={setCatalogOpen}
            onUpdated={fetchTemplates}
          />
          <CableRollDrawer
            open={!!cableItem}
            onOpenChange={(o) => !o && setCableItem(null)}
            item={cableItem}
            stationId={stationId}
            onRefresh={() => {
              fetchItems();
              onRefresh();
            }}
          />
        </>
      )}
    </>
  );
}
