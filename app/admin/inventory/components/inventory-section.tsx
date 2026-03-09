'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Package, History, Wifi } from 'lucide-react';
import { toast } from 'sonner';

interface Station {
  id: string;
  stationName: string;
  code: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  itemCode: string;
  category: string;
  unitType: string;
  quantityAvailable: number;
  minimumLevel: number;
  isCable?: boolean;
}

interface InventorySectionProps {
  stationId: string;
  stations: Station[];
  searchQuery: string;
  filterCategory: string;
  filterLowStock: boolean;
  onRefresh: () => void;
}

export function InventorySection({
  stationId,
  stations,
  searchQuery,
  filterCategory,
  filterLowStock,
  onRefresh,
}: InventorySectionProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [routers, setRouters] = useState<{ id: string; itemName: string; serialNumber?: string; macAddress?: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [routersOpen, setRoutersOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([stationId]);
  const [newItem, setNewItem] = useState({
    itemName: '',
    itemCode: '',
    category: 'Equipment',
    unitType: 'pcs',
    quantityAvailable: 0,
    minimumLevel: 0,
  });
  const [routerForm, setRouterForm] = useState({
    itemName: '',
    unitsText: '',
    idType: 'serial' as 'serial' | 'mac',
  });
  const [transactions, setTransactions] = useState<unknown[]>([]);

  const fetchItems = () => {
    setLoading(true);
    let url = `/api/isp/inventory?stationId=${stationId}`;
    if (filterCategory !== 'all') url += `&category=${filterCategory}`;
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
  }, [stationId, filterCategory, filterLowStock]);

  const fetchRouters = () => {
    fetch(`/api/isp/routers?stationId=${stationId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setRouters(d.routers || []))
      .catch(() => setRouters([]));
  };

  useEffect(() => {
    fetchRouters();
  }, [stationId]);

  const filteredItems = items.filter(
    (i) =>
      !searchQuery ||
      i.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.itemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddStock = () => {
    if (!selectedItem || !addQty || parseFloat(addQty) <= 0) {
      toast.error('Enter valid quantity');
      return;
    }
    fetch('/api/isp/inventory/add-stock', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: selectedItem.id,
        quantity: parseFloat(addQty),
        notes: addNotes,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Stock added successfully');
        setAddOpen(false);
        setAddQty('');
        setAddNotes('');
        setSelectedItem(null);
        fetchItems();
        onRefresh();
      })
      .catch((e) => toast.error(e.message));
  };

  const handleAdjust = () => {
    if (!selectedItem || adjustReason.trim().length === 0) {
      toast.error('Reason is required');
      return;
    }
    const qty = parseFloat(adjustQty);
    if (isNaN(qty)) {
      toast.error('Enter valid quantity');
      return;
    }
    fetch('/api/isp/inventory/adjust', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: selectedItem.id,
        quantity: qty,
        reason: adjustReason,
        notes: addNotes,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Stock adjusted');
        setAdjustOpen(false);
        setAdjustQty('');
        setAdjustReason('');
        setSelectedItem(null);
        fetchItems();
        onRefresh();
      })
      .catch((e) => toast.error(e.message));
  };

  const handleCreateItem = () => {
    if (!newItem.itemName || !newItem.itemCode || !newItem.category || !newItem.unitType) {
      toast.error('Fill required fields');
      return;
    }
    if (selectedStationIds.length === 0) {
      toast.error('Select at least one station');
      return;
    }
    fetch('/api/isp/inventory', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationIds: selectedStationIds,
        ...newItem,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Item created');
        setAddOpen(false);
        setNewItem({
          itemName: '',
          itemCode: '',
          category: 'Equipment',
          unitType: 'pcs',
          quantityAvailable: 0,
          minimumLevel: 0,
        });
        setSelectedStationIds([stationId]);
        fetchItems();
        onRefresh();
      })
      .catch((e) => toast.error(e.message));
  };

  const handleAddRouters = () => {
    if (!routerForm.itemName.trim()) {
      toast.error('Router model name is required');
      return;
    }
    const lines = routerForm.unitsText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const units = lines.map((line) => {
      const val = line.trim();
      return routerForm.idType === 'serial' ? { serialNumber: val } : { macAddress: val };
    });
    if (units.length === 0) {
      toast.error('Enter at least one serial number or MAC address (one per line)');
      return;
    }
    if (selectedStationIds.length === 0) {
      toast.error('Select at least one station');
      return;
    }
    fetch('/api/isp/routers/bulk', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationIds: selectedStationIds,
        itemName: routerForm.itemName.trim(),
        units,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success(`Added ${d.added} router(s)`);
        setRoutersOpen(false);
        setRouterForm({ itemName: '', unitsText: '', idType: 'serial' });
        setSelectedStationIds([stationId]);
        fetchRouters();
        onRefresh();
      })
      .catch((e) => toast.error(e.message));
  };

  const toggleStation = (sid: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const openAdd = (item: InventoryItem) => {
    setSelectedItem(item);
    setAddQty('');
    setAddNotes('');
    setAddOpen(true);
  };

  const openAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQty('');
    setAdjustReason('');
    setAdjustOpen(true);
  };

  const openHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setHistoryOpen(true);
    fetch(`/api/isp/inventory/${item.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => setTransactions([]));
  };

  const getStatusBadge = (item: InventoryItem) => {
    if (item.quantityAvailable <= 0)
      return <Badge variant="destructive">Out of Stock</Badge>;
    if (item.quantityAvailable <= item.minimumLevel)
      return <Badge className="bg-amber-500">Low Stock</Badge>;
    return <Badge variant="secondary">In Stock</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Package className="h-5 w-5 shrink-0" />
            Inventory
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={() => { setSelectedStationIds([stationId]); setRouterForm({ itemName: '', unitsText: '', idType: 'serial' }); setRoutersOpen(true); }} className="flex-1 sm:flex-initial h-9 text-sm">
              <Wifi className="h-4 w-4 sm:mr-1 shrink-0" />
              Add Routers
            </Button>
            <Button size="sm" onClick={() => { setSelectedItem(null); setSelectedStationIds([stationId]); setAddOpen(true); }} className="flex-1 sm:flex-initial h-9 text-sm">
              <Plus className="h-4 w-4 sm:mr-1 shrink-0" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No items match your filters
            </div>
          ) : (
            <>
              {/* Mobile: card layout */}
              <div className="md:hidden space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">{item.itemCode} · {item.category}</p>
                      </div>
                      {getStatusBadge(item)}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.quantityAvailable}</span> {item.unitType}
                        <span className="ml-1">· min {item.minimumLevel}</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAdd(item)} className="h-9 min-h-[36px] text-xs flex-1 sm:flex-initial">
                          Add
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openAdjust(item)} className="h-9 min-h-[36px] text-xs flex-1 sm:flex-initial">
                          Adjust
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openHistory(item)} className="h-9 min-h-[36px] px-3 shrink-0">
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table layout */}
              <div className="hidden md:block overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{item.quantityAvailable}</span>
                          <span className="text-muted-foreground text-xs ml-1">{item.unitType}</span>
                        </TableCell>
                        <TableCell>{item.minimumLevel}</TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openAdd(item)}>Add</Button>
                            <Button variant="ghost" size="sm" onClick={() => openAdjust(item)}>Adjust</Button>
                            <Button variant="ghost" size="sm" onClick={() => openHistory(item)}>
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {routers.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Routers ({routers.length})
              </p>
              <div className="md:hidden space-y-2">
                {routers.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{r.itemName}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{r.serialNumber || r.macAddress || '-'}</p>
                    <Badge variant={r.status === 'available' ? 'default' : 'secondary'} className="mt-2">{r.status}</Badge>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>MAC</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routers.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.itemName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.serialNumber || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.macAddress || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'available' ? 'default' : 'secondary'}>{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add stock dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Add Stock' : 'Create New Item'}</DialogTitle>
          </DialogHeader>
          {selectedItem ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedItem.itemName}</p>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Stations (select all that share this product)</Label>
                <div className="flex flex-wrap gap-3 mt-2 p-3 rounded-lg border bg-muted/30">
                  {stations.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedStationIds.includes(s.id)}
                        onCheckedChange={() => toggleStation(s.id)}
                      />
                      <span className="text-sm">{s.stationName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Item Name</Label>
                <Input
                  value={newItem.itemName}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))}
                  placeholder="e.g. ONT Device"
                />
              </div>
              <div>
                <Label>Item Code</Label>
                <Input
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemCode: e.target.value }))}
                  placeholder="e.g. ONT-001"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(v) => setNewItem((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Drop Cable">Drop Cable</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit Type</Label>
                <Select
                  value={newItem.unitType}
                  onValueChange={(v) => setNewItem((p) => ({ ...p, unitType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="rolls">Rolls</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Initial Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.quantityAvailable || ''}
                    onChange={(e) =>
                      setNewItem((p) => ({
                        ...p,
                        quantityAvailable: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Minimum Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.minimumLevel || ''}
                    onChange={(e) =>
                      setNewItem((p) => ({
                        ...p,
                        minimumLevel: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={selectedItem ? handleAddStock : handleCreateItem}
            >
              {selectedItem ? 'Add Stock' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <p className="text-sm">{selectedItem.itemName} — Current: {selectedItem.quantityAvailable}</p>
              <div>
                <Label>Adjustment (+ or -)</Label>
                <Input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. -5 or +10"
                />
              </div>
              <div>
                <Label>Reason (required)</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Damage, count correction"
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjust}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Routers dialog */}
      <Dialog open={routersOpen} onOpenChange={setRoutersOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Routers (by Serial or MAC)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Stations (select all that share these routers)</Label>
              <div className="flex flex-wrap gap-3 mt-2 p-3 rounded-lg border bg-muted/30">
                {stations.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedStationIds.includes(s.id)}
                      onCheckedChange={() => toggleStation(s.id)}
                    />
                    <span className="text-sm">{s.stationName}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Router Model Name</Label>
              <Input
                value={routerForm.itemName}
                onChange={(e) => setRouterForm((p) => ({ ...p, itemName: e.target.value }))}
                placeholder="e.g. MikroTik hAP ac2"
              />
            </div>
            <div>
              <Label>Add by</Label>
              <Select
                value={routerForm.idType}
                onValueChange={(v: 'serial' | 'mac') => setRouterForm((p) => ({ ...p, idType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serial">Serial Number</SelectItem>
                  <SelectItem value="mac">MAC Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{routerForm.idType === 'serial' ? 'Serial Numbers' : 'MAC Addresses'} (one per line)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={routerForm.unitsText}
                onChange={(e) => setRouterForm((p) => ({ ...p, unitsText: e.target.value }))}
                placeholder={routerForm.idType === 'serial' ? 'SN001\nSN002\nSN003' : 'AA:BB:CC:DD:EE:FF\n11:22:33:44:55:66'}
              />
              <p className="text-xs text-muted-foreground mt-1">Comma or newline separated</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutersOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRouters}>Add Routers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Movement History — {selectedItem?.itemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              transactions.map((tx: { id: string; transactionType: string; quantity: number; balanceAfter: number; createdAt: string }) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center py-2 border-b text-sm"
                >
                  <span className="font-medium">{tx.transactionType}</span>
                  <span>{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}</span>
                  <span className="text-muted-foreground">→ {tx.balanceAfter}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
