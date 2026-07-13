'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Equipment',
  'Materials',
  'Drop Cable',
  'Fiber Cable',
  'Accessories',
  'Other',
];

interface EditStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  mergedIds?: string[];
  mergedCount?: number;
  onSuccess?: () => void;
}

export function EditStockDialog({
  open,
  onOpenChange,
  itemId,
  mergedIds = [],
  mergedCount = 1,
  onSuccess,
}: EditStockDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [quantityAvailable, setQuantityAvailable] = useState(0);
  const [unitType, setUnitType] = useState('pcs');
  const [form, setForm] = useState({
    itemName: '',
    itemCode: '',
    category: 'Equipment',
    minimumLevel: '0',
    reorderLevel: '0',
    notes: '',
    adjustDelta: '',
    adjustReason: '',
  });

  const activeId = selectedId || itemId;

  useEffect(() => {
    if (!open || !itemId) return;

    const initialId =
      mergedIds.length > 0 && mergedCount > 1 ? mergedIds[0] : itemId;
    setSelectedId(initialId);
  }, [open, itemId, mergedIds, mergedCount]);

  useEffect(() => {
    if (!open || !activeId) return;

    setLoading(true);
    fetch(`/api/isp/inventory/${activeId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        const item = d.item;
        setQuantityAvailable(item.quantityAvailable ?? 0);
        setUnitType(item.unitType || 'pcs');
        setForm({
          itemName: item.itemName || '',
          itemCode: item.itemCode || '',
          category: item.category || 'Equipment',
          minimumLevel: String(item.minimumLevel ?? 0),
          reorderLevel: String(item.reorderLevel ?? item.minimumLevel ?? 0),
          notes: item.notes || '',
          adjustDelta: '',
          adjustReason: '',
        });
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to load item');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, activeId, onOpenChange]);

  const handleSave = async () => {
    if (!activeId) return;

    if (!form.itemName.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!form.itemCode.trim()) {
      toast.error('Item code is required');
      return;
    }

    const minimumLevel = parseFloat(form.minimumLevel);
    const reorderLevel = parseFloat(form.reorderLevel);
    if (Number.isNaN(minimumLevel) || minimumLevel < 0) {
      toast.error('Enter a valid minimum level');
      return;
    }
    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      toast.error('Enter a valid reorder level');
      return;
    }

    const adjustDelta = form.adjustDelta.trim() ? parseFloat(form.adjustDelta) : 0;
    if (form.adjustDelta.trim() && Number.isNaN(adjustDelta)) {
      toast.error('Enter a valid quantity adjustment');
      return;
    }
    if (adjustDelta !== 0 && !form.adjustReason.trim()) {
      toast.error('Reason is required when adjusting quantity');
      return;
    }
    if (adjustDelta !== 0 && quantityAvailable + adjustDelta < 0) {
      toast.error('Adjustment would result in negative stock');
      return;
    }

    setSaving(true);
    try {
      const patchRes = await fetch(`/api/isp/inventory/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: form.itemName.trim(),
          itemCode: form.itemCode.trim(),
          category: form.category,
          minimumLevel,
          reorderLevel,
          notes: form.notes.trim() || null,
        }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || 'Failed to update item');

      if (adjustDelta !== 0) {
        const adjustRes = await fetch('/api/isp/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: activeId,
            quantity: adjustDelta,
            reason: form.adjustReason.trim(),
            notes: form.notes.trim() || undefined,
          }),
        });
        const adjustData = await adjustRes.json();
        if (!adjustRes.ok) throw new Error(adjustData.error || 'Failed to adjust quantity');
      }

      toast.success(adjustDelta !== 0 ? 'Inventory updated and quantity adjusted' : 'Inventory updated');
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const unitLabel = unitType === 'm' || unitType === 'meters' ? 'm' : 'pcs';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit inventory</DialogTitle>
          <DialogDescription>
            Update item details, minimum levels, and optionally adjust on-hand quantity.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {mergedCount > 1 && mergedIds.length > 1 && (
              <div className="space-y-2">
                <Label>Stock record</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select record to edit" />
                  </SelectTrigger>
                  <SelectContent>
                    {mergedIds.map((id, index) => (
                      <SelectItem key={id} value={id}>
                        Record {index + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Multiple stock records are merged in this view. Pick which one to edit.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Item name *</Label>
              <Input
                id="edit-item-name"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-item-code">Item code *</Label>
                <Input
                  id="edit-item-code"
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((f) => ({ ...f, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-min-level">Minimum level ({unitLabel})</Label>
                <Input
                  id="edit-min-level"
                  type="number"
                  min="0"
                  step="any"
                  value={form.minimumLevel}
                  onChange={(e) => setForm((f) => ({ ...f, minimumLevel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reorder-level">Reorder level ({unitLabel})</Label>
                <Input
                  id="edit-reorder-level"
                  type="number"
                  min="0"
                  step="any"
                  value={form.reorderLevel}
                  onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes about this item"
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div>
                <p className="text-sm font-medium">Adjust quantity (optional)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current on hand: <strong>{quantityAvailable.toLocaleString()} {unitLabel}</strong>.
                  Use a negative number to reduce stock.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-adjust-delta">Change by ({unitLabel})</Label>
                  <Input
                    id="edit-adjust-delta"
                    type="number"
                    step="any"
                    placeholder="e.g. -2 or 5"
                    value={form.adjustDelta}
                    onChange={(e) => setForm((f) => ({ ...f, adjustDelta: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-adjust-reason">Reason for adjustment</Label>
                  <Input
                    id="edit-adjust-reason"
                    placeholder="Required if changing quantity"
                    value={form.adjustReason}
                    onChange={(e) => setForm((f) => ({ ...f, adjustReason: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
