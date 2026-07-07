'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookMarked, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  INVENTORY_ITEM_TYPES,
  SPLITTER_PRESETS,
  getItemTypeConfig,
  type InventoryItemTypeId,
} from './inventory-item-types';

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

export function ItemCatalogSheet({ open, onOpenChange, onUpdated }: ItemCatalogSheetProps) {
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    itemTypeId: 'router' as InventoryItemTypeId,
    itemName: '',
    itemCode: '',
    splitterPreset: '1x8',
    minimumLevel: '0',
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
    if (open) loadTemplates();
  }, [open]);

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
    setForm((f) => ({
      ...f,
      itemTypeId: typeId,
      itemName: '',
      itemCode: '',
      splitterPreset: '1x8',
    }));
    if (typeId === 'splitter') applySplitterToForm('1x8');
  };

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
          defaultMinimumLevel: parseInt(form.minimumLevel, 10) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success(`Added "${itemName}" to catalog`);
      setForm({ itemTypeId: 'router', itemName: '', itemCode: '', splitterPreset: '1x8', minimumLevel: '0' });
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
      toast.success('Removed from catalog');
      loadTemplates();
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const grouped = INVENTORY_ITEM_TYPES.map((t) => ({
    type: t,
    items: templates.filter((tpl) => tpl.itemTypeId === t.id),
  })).filter((g) => g.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Common Item Names
          </SheetTitle>
        </SheetHeader>

        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Save items you add often. They appear as quick picks when adding stock.
        </p>

        <div className="rounded-lg border p-3 space-y-3 mb-5">
          <p className="text-sm font-medium">Add to catalog</p>
          <div className="space-y-2">
            <Label>Item type</Label>
            <Select value={form.itemTypeId} onValueChange={(v) => handleTypeChange(v as InventoryItemTypeId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVENTORY_ITEM_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.itemTypeId === 'splitter' && (
            <div className="flex flex-wrap gap-1.5">
              {SPLITTER_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={form.splitterPreset === p.id ? 'default' : 'outline'}
                  className="h-7 text-xs px-2"
                  onClick={() => applySplitterToForm(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}

          {(form.itemTypeId !== 'splitter' || form.splitterPreset === 'custom') && (
            <>
              <div className="space-y-2">
                <Label>Item name</Label>
                <Input
                  value={form.itemName}
                  onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                  placeholder={getItemTypeConfig(form.itemTypeId).namePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>Item code (optional)</Label>
                <Input
                  value={form.itemCode}
                  onChange={(e) => setForm({ ...form, itemCode: e.target.value.toUpperCase() })}
                />
              </div>
            </>
          )}

          {form.itemTypeId === 'splitter' && form.splitterPreset !== 'custom' && form.itemName && (
            <p className="text-sm bg-muted/50 rounded px-2 py-1.5">
              Will save as <strong>{form.itemName}</strong>
            </p>
          )}

          <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add to Catalog
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Saved items ({templates.length})</p>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No saved names yet. Add routers, splitters, cables, etc. above.
            </p>
          ) : (
            grouped.map(({ type, items }) => (
              <div key={type.id}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  {type.label}
                </p>
                <ul className="space-y-1">
                  {items.map((tpl) => (
                    <li
                      key={tpl.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tpl.itemName}</p>
                        {tpl.itemCode && (
                          <p className="text-xs text-muted-foreground font-mono">{tpl.itemCode}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(tpl.id, tpl.itemName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
