'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface BatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface EquipmentItem {
  templateId?: string;
  name: string;
  model: string;
  serialNumbers: string[];
  cost: number;
}

export function BatchForm({ open, onOpenChange, onSuccess }: BatchFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [templates, setTemplates] = useState<Array<{ _id: string; name: string; model: string }>>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([
    { name: '', model: '', serialNumbers: [''], cost: 0 }
  ]);
  const [batchFormData, setBatchFormData] = useState({
    batchName: '',
    description: '',
    purchaseDate: '',
    purchaseCost: '',
    supplier: '',
  });

  // Validate serial number format (SN- followed by numbers, or just numbers)
  const validateSerialNumber = (serialNumber: string): boolean => {
    if (!serialNumber.trim()) return false;
    // Allow formats: SN-12345, SN-123, or just numbers like 12345, 123
    const pattern = /^(SN-\d+|\d+)$/;
    return pattern.test(serialNumber.trim());
  };

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      const today = new Date().toISOString().split('T')[0];
      setBatchFormData({
        batchName: '',
        description: '',
        purchaseDate: today,
        purchaseCost: '',
        supplier: '',
      });
      setEquipmentItems([{ name: '', model: '', serialNumbers: [''], cost: 0 }]);
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setFetchingTemplates(true);
      const response = await fetch('/api/equipment-templates');
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setFetchingTemplates(false);
    }
  };

  const addEquipmentItem = () => {
    setEquipmentItems([...equipmentItems, { name: '', model: '', serialNumbers: [''], cost: 0 }]);
  };

  const removeEquipmentItem = (index: number) => {
    if (equipmentItems.length > 1) {
      setEquipmentItems(equipmentItems.filter((_, i) => i !== index));
    }
  };

  const updateEquipmentItem = (index: number, field: keyof EquipmentItem, value: any) => {
    const updated = [...equipmentItems];
    updated[index] = { ...updated[index], [field]: value };
    setEquipmentItems(updated);
  };

  const addSerialNumber = (itemIndex: number) => {
    const updated = [...equipmentItems];
    updated[itemIndex].serialNumbers.push('');
    setEquipmentItems(updated);
  };

  const removeSerialNumber = (itemIndex: number, serialIndex: number) => {
    const updated = [...equipmentItems];
    if (updated[itemIndex].serialNumbers.length > 1) {
      updated[itemIndex].serialNumbers = updated[itemIndex].serialNumbers.filter((_, i) => i !== serialIndex);
      setEquipmentItems(updated);
    }
  };

  const updateSerialNumber = (itemIndex: number, serialIndex: number, value: string) => {
    const updated = [...equipmentItems];
    updated[itemIndex].serialNumbers[serialIndex] = value;
    setEquipmentItems(updated);
  };

  const handleTemplateSelect = (itemIndex: number, templateId: string) => {
    const template = templates.find(t => t._id === templateId);
    if (template) {
      updateEquipmentItem(itemIndex, 'name', template.name);
      updateEquipmentItem(itemIndex, 'model', template.model);
      updateEquipmentItem(itemIndex, 'templateId', templateId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate batch info
      if (!batchFormData.batchName.trim() || !batchFormData.purchaseDate) {
        throw new Error('Batch name and purchase date are required');
      }

      // Validate all equipment items and collect serial numbers with their equipment info
      const allEquipmentData: Array<{ name: string; model: string; serialNumber: string; cost: number }> = [];
      let totalCost = 0;

      for (let i = 0; i < equipmentItems.length; i++) {
        const item = equipmentItems[i];
        
        if (!item.name.trim() || !item.model.trim()) {
          throw new Error(`Equipment item ${i + 1}: Name and model are required`);
        }

        const validSerialNumbers = item.serialNumbers
          .map((sn) => sn.trim())
          .filter((sn) => sn.length > 0);

        if (validSerialNumbers.length === 0) {
          throw new Error(`Equipment item ${i + 1}: Please enter at least one serial number`);
        }

        // Validate serial number formats
        const invalidSerialNumbers: string[] = [];
        validSerialNumbers.forEach((sn) => {
          if (!validateSerialNumber(sn)) {
            invalidSerialNumbers.push(sn);
          }
        });

        if (invalidSerialNumbers.length > 0) {
          throw new Error(
            `Equipment item ${i + 1}: Invalid serial number format: ${invalidSerialNumbers.join(', ')}. ` +
            `Format should be "SN-12345" or just numbers like "12345". Example: SN-88441`
          );
        }

        // Add each serial number as a separate equipment entry
        validSerialNumbers.forEach((sn) => {
          allEquipmentData.push({
            name: item.name.trim(),
            model: item.model.trim(),
            serialNumber: sn,
            cost: item.cost || 0,
          });
          totalCost += item.cost || 0;
        });
      }

      // Create batch with all equipment
      const response = await fetch('/api/equipment-batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: batchFormData.batchName.trim(),
          description: batchFormData.description.trim(),
          equipmentType: equipmentItems.length === 1 
            ? equipmentItems[0].name 
            : `${equipmentItems.length} Different Products`,
          quantity: allEquipmentData.length,
          purchaseDate: batchFormData.purchaseDate,
          purchaseCost: batchFormData.purchaseCost 
            ? Number(batchFormData.purchaseCost) 
            : totalCost,
          supplier: batchFormData.supplier.trim(),
          serialNumbers: allEquipmentData.map(eq => eq.serialNumber),
          equipmentItems: allEquipmentData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      toast.success(`Batch created successfully with ${allEquipmentData.length} equipment items!`);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = equipmentItems.reduce((sum, item) => 
    sum + item.serialNumbers.filter(sn => sn.trim().length > 0).length, 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Equipment Batch</DialogTitle>
          <DialogDescription>
            Create a batch with multiple equipment items. You can add different products in the same batch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Batch Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-semibold">Batch Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchName">Batch Name *</Label>
                <Input
                  id="batchName"
                  value={batchFormData.batchName}
                  onChange={(e) => setBatchFormData({ ...batchFormData, batchName: e.target.value })}
                  placeholder="e.g., January 2024 Purchase"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date *</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={batchFormData.purchaseDate}
                  onChange={(e) => setBatchFormData({ ...batchFormData, purchaseDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseCost">Total Cost (Ksh)</Label>
                <Input
                  id="purchaseCost"
                  type="number"
                  step="0.01"
                  value={batchFormData.purchaseCost}
                  onChange={(e) => setBatchFormData({ ...batchFormData, purchaseCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={batchFormData.supplier}
                  onChange={(e) => setBatchFormData({ ...batchFormData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={batchFormData.description}
                onChange={(e) => setBatchFormData({ ...batchFormData, description: e.target.value })}
                placeholder="Optional description of this batch"
                rows={2}
              />
            </div>
          </div>

          {/* Equipment Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Equipment Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEquipmentItem}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>

            <div className="space-y-6">
              {equipmentItems.map((item, itemIndex) => (
                <div key={itemIndex} className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Product {itemIndex + 1}</h4>
                    {equipmentItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEquipmentItem(itemIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select a template (optional)</Label>
                      <Select
                        value={item.templateId || undefined}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            updateEquipmentItem(itemIndex, 'templateId', undefined);
                            updateEquipmentItem(itemIndex, 'name', '');
                            updateEquipmentItem(itemIndex, 'model', '');
                          } else {
                            handleTemplateSelect(itemIndex, value);
                          }
                        }}
                        disabled={fetchingTemplates}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={fetchingTemplates ? "Loading..." : "Select template (optional)"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template._id} value={template._id}>
                              {template.name} - {template.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Enter equipment name *</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateEquipmentItem(itemIndex, 'name', e.target.value)}
                        placeholder="e.g., Router"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Enter model *</Label>
                      <Input
                        value={item.model}
                        onChange={(e) => updateEquipmentItem(itemIndex, 'model', e.target.value)}
                        placeholder="e.g., TP-Link Archer C7"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cost per item (Ksh)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.cost || ''}
                        onChange={(e) => updateEquipmentItem(itemIndex, 'cost', Number(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Serial Numbers *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSerialNumber(itemIndex)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Another
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {item.serialNumbers.map((serialNumber, serialIndex) => (
                        <div key={serialIndex} className="flex gap-2">
                          <Input
                            value={serialNumber}
                            onChange={(e) => updateSerialNumber(itemIndex, serialIndex, e.target.value)}
                            placeholder="Format: SN-88441 or 88441"
                            className="flex-1"
                          />
                          {item.serialNumbers.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeSerialNumber(itemIndex, serialIndex)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format: SN-88441 or 88441
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Batch ({totalItems} items)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
