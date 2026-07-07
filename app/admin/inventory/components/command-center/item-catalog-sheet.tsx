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
import {
  BookMarked,
  Loader2,
  Plus,
  Trash2,
  Search,
  Wifi,
  Cable,
  Plug,
  Box,
  GitBranch,
  Package,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  INVENTORY_ITEM_TYPES,
  SPLITTER_PRESETS,
  getItemTypeConfig,
  type InventoryItemTypeId,
} from './inventory-item-types';
import { cn } from '@/lib/utils';

export interface ItemTemplate {
  id: string;
  itemName: string;
  itemCode?: string | null;
  itemTypeId: string;
  category?: string | null;
  splitterPreset?: string | null;
  defaultMinimumLevel?: number;
}

interface ItemCatalogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
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

function TypeIcon({ typeId, className }: { typeId: string; className?: string }) {
  const Icon = TYPE_ICONS[typeId as InventoryItemTypeId] || Package;
  return <Icon className={className} />;
}

export function ItemCatalogSheet({ open, onOpenChange, onUpdated }: ItemCatalogSheetProps) {
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<InventoryItemTypeId | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    itemTypeId: 'router' as InventoryItemTypeId,
    itemName: '',
    itemCode: '',
    splitterPreset: '1x8',
  });

  const loadTemplates = () => {
    setLoading(true);
    fetch('/api/isp/item-templates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSearch('');
      setFilterType('all');
      setShowAdd(false);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setForm({ itemTypeId: 'router', itemName: '', itemCode: '', splitterPreset: '1x8' });
  };

  const applySplitterToForm = (presetId: string) => {
    const preset = SPLITTER_PRESETS.find((p) => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setForm((f) => ({
        ...f,
        splitterPreset: presetId,
        itemName: preset.itemName,
        itemCode: preset.itemCode,
      }));
    } else {
      setForm((f) => ({ ...f, splitterPreset: presetId, itemName: '', itemCode: '' }));
    }
  };

  const handleTypeChange = (typeId: InventoryItemTypeId) => {
    setForm((f) => ({ ...f, itemTypeId: typeId, itemName: '', itemCode: '', splitterPreset: '1x8' }));
    if (typeId === 'splitter') applySplitterToForm('1x8');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (filterType !== 'all' && t.itemTypeId !== filterType) return false;
      if (!q) return true;
      return (
        t.itemName.toLowerCase().includes(q) ||
        (t.itemCode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [templates, search, filterType]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const t of templates) {
      counts[t.itemTypeId] = (counts[t.itemTypeId] || 0) + 1;
    }
    return counts;
  }, [templates]);

  const handleSave = async () => {
    const cfg = getItemTypeConfig(form.itemTypeId);
    let itemName = form.itemName.trim();
    let itemCode = form.itemCode.trim();

    if (form.itemTypeId === 'splitter' && form.splitterPreset !== 'custom') {
      const preset = SPLITTER_PRESETS.find((p) => p.id === form.splitterPreset);
      if (preset) {
        itemName = preset.itemName;
        itemCode = preset.itemCode;
      }
    }

    if (!itemName) return toast.error('Item name is required');

    setSaving(true);
    try {
      const res = await fetch('/api/isp/item-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName,
          itemCode: itemCode || undefined,
          itemTypeId: form.itemTypeId,
          category: cfg.category,
          splitterPreset: form.itemTypeId === 'splitter' ? form.splitterPreset : undefined,
          defaultMinimumLevel: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success(`"${itemName}" saved`);
      resetForm();
      setShowAdd(false);
      loadTemplates();
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from catalog?`)) return;
    try {
      const res = await fetch(`/api/isp/item-templates?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Removed');
      loadTemplates();
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const showNameFields = form.itemTypeId !== 'splitter' || form.splitterPreset === 'custom';
  const typeConfig = getItemTypeConfig(form.itemTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 max-h-[min(90vh,100dvh)] h-auto flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0 space-y-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3 min-w-0">
              {showAdd ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 -ml-1"
                  onClick={() => {
                    setShowAdd(false);
                    resetForm();
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookMarked className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="text-base leading-tight truncate">
                  {showAdd ? 'New catalog item' : 'Item Catalog'}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {showAdd
                    ? 'Choose type and enter name'
                    : 'Saved names for quick stock entry'}
                </DialogDescription>
              </div>
            </div>
            {!showAdd && (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {templates.length} saved
              </Badge>
            )}
          </div>
        </DialogHeader>

        {showAdd ? (
          <>
            {/* Add form — full body, scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Type</Label>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
                  {INVENTORY_ITEM_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t.id] || Package;
                    const selected = form.itemTypeId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTypeChange(t.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                            : 'border-border hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.itemTypeId === 'splitter' && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Splitter size</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPLITTER_PRESETS.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        size="sm"
                        variant={form.splitterPreset === p.id ? 'default' : 'outline'}
                        className="h-7 text-xs px-2.5"
                        onClick={() => applySplitterToForm(p.id)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {showNameFields ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={form.itemName}
                      onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                      placeholder={typeConfig.namePlaceholder}
                      className="h-9"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Code <span className="text-muted-foreground font-normal">optional</span>
                    </Label>
                    <Input
                      value={form.itemCode}
                      onChange={(e) => setForm({ ...form, itemCode: e.target.value.toUpperCase() })}
                      placeholder={`${typeConfig.codePrefix}-001`}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                  Saving as <strong>{form.itemName}</strong>
                  {form.itemCode && (
                    <span className="text-muted-foreground font-mono text-xs ml-2">{form.itemCode}</span>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer — always visible */}
            <div className="shrink-0 border-t bg-background px-5 py-3 flex gap-2 safe-area-pb">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Search + filters */}
            <div className="px-5 py-3 border-b space-y-2.5 shrink-0 bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="h-9 pl-8 text-sm bg-background"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filterType === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border text-muted-foreground hover:text-foreground'
                  )}
                >
                  All {typeCounts.all > 0 && `(${typeCounts.all})`}
                </button>
                {INVENTORY_ITEM_TYPES.filter((t) => typeCounts[t.id]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterType(t.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      filterType === t.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.label} ({typeCounts[t.id]})
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Package className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">
                    {templates.length === 0 ? 'No saved items yet' : 'No matches'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    {templates.length === 0
                      ? 'Save routers, cables, splitters and more for one-click add stock'
                      : 'Try a different search or filter'}
                  </p>
                  {templates.length === 0 && (
                    <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add first item
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((tpl) => {
                    const typeLabel = getItemTypeConfig(tpl.itemTypeId as InventoryItemTypeId).label;
                    return (
                      <li
                        key={tpl.id}
                        className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <TypeIcon typeId={tpl.itemTypeId} className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tpl.itemName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">{typeLabel}</span>
                            {tpl.itemCode && (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-[11px] font-mono text-muted-foreground truncate">
                                  {tpl.itemCode}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={() => handleDelete(tpl.id, tpl.itemName)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t px-5 py-3 bg-muted/20">
              <Button className="w-full" variant="outline" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add to catalog
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
