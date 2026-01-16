'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Calendar, AlertCircle, Loader2, Edit, Trash2, Link, Eye, CheckSquare, Square, Package } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EquipmentForm } from './equipment-form';
import { AttachClientDialog } from './attach-client-dialog';
import { EquipmentViewDialog } from './equipment-view-dialog';
import { EquipmentTemplateManager } from './equipment-template-manager';
import { BatchForm } from './batch-form';
import { BatchTracking } from './batch-tracking';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Equipment {
  _id?: string;
  equipmentId: string;
  name: string;
  model: string;
  serialNumber: string;
  status: 'available' | 'installed' | 'in-repair' | 'bought';
  station?: string;
  warranty?: string;
  cost?: number;
  client?: string;
  clientName?: string;
  clientNumber?: string;
  installDate?: string;
  lastService?: string;
  installationType?: 'new-installation' | 'exchange-replacement';
  batchId?: string;
  batch?: {
    _id: string;
    batchNumber: string;
    name: string;
  };
}

function EquipmentTable({ 
  equipment, 
  actions, 
  tabType,
  onEdit,
  onDelete,
  onAttach,
  onView,
  selectedItems,
  onSelectionChange,
  showCheckboxes
}: { 
  equipment: Equipment[], 
  actions?: boolean, 
  tabType: 'bought' | 'available' | 'installed',
  onEdit?: (equipment: Equipment) => void,
  onDelete?: (equipment: Equipment) => void,
  onAttach?: (equipment: Equipment) => void,
  onView?: (equipment: Equipment) => void,
  selectedItems?: string[],
  onSelectionChange?: (selectedIds: string[]) => void,
  showCheckboxes?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const isSelected = (itemId: string) => {
    return selectedItems?.includes(itemId) || false;
  };
  
  const canSelect = (item: Equipment) => {
    // Only allow selection of items that don't already belong to a batch
    return !item.batchId;
  };
  
  const toggleSelection = (itemId: string, item: Equipment, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!onSelectionChange || !selectedItems || !canSelect(item)) return;
    
    const newSelection = isSelected(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    onSelectionChange(newSelection);
  };
  
  const toggleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange || !selectedItems) return;
    
    const selectableItems = filtered.filter(item => canSelect(item));
    const allSelected = selectableItems.length > 0 && selectableItems.every(item => isSelected(item._id || ''));
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(selectableItems.map(item => item._id || '').filter(Boolean));
    }
  };

  const filtered = equipment.filter((item) =>
    item.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search equipment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 text-sm w-full"
        />
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-2">
        {filtered.map((item, index) => (
          <Card 
            key={item._id || item.equipmentId} 
            className={cn(
              "border-2 transition-all hover:shadow-md cursor-pointer",
              index % 2 === 0 
                ? "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-200 dark:border-slate-700" 
                : "bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800"
            )}
            onClick={() => tabType === 'installed' && onView?.(item)}
          >
            <CardContent className="pt-3 pb-3 px-3 sm:px-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  {showCheckboxes && (
                    <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                      <Checkbox
                        checked={isSelected(item._id || '')}
                        disabled={!canSelect(item)}
                        onCheckedChange={() => toggleSelection(item._id || '', item)}
                        title={item.batchId ? 'Equipment already belongs to a batch' : ''}
                        className="w-5 h-5"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-purple-700 truncate">{item.equipmentId}</p>
                    <p className="font-semibold text-sm text-purple-700 truncate">{item.name}</p>
                  </div>
                  {tabType === 'installed' && item.installationType && (
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0",
                      item.installationType === 'exchange-replacement'
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-green-100 text-green-700 border border-green-200"
                    )}>
                      {item.installationType === 'exchange-replacement' ? 'Exchange' : 'New'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <p className="text-muted-foreground text-[10px] font-medium">Model</p>
                    <p className="text-foreground font-medium truncate">{item.model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-medium">Serial</p>
                    <p className="text-foreground font-mono text-[10px] truncate">{item.serialNumber}</p>
                  </div>
                  {tabType === 'available' && item.batch?.name && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-[10px] font-medium">Batch</p>
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Package className="w-2.5 h-2.5" />
                        {item.batch.name}
                      </Badge>
                    </div>
                  )}
                  {tabType === 'bought' && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-[10px] font-medium">Cost</p>
                        <p className="text-foreground font-semibold truncate">Ksh {item.cost?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] font-medium">Warranty</p>
                        <p className="text-foreground font-medium truncate">{formatDate(item.warranty)}</p>
                      </div>
                    </>
                  )}
                  {tabType === 'installed' && (
                    <>
                      <div className="border-l-2 border-blue-500 pl-2">
                        <p className="text-muted-foreground text-[10px] font-medium text-blue-600">Station</p>
                        <p className="text-foreground font-semibold text-blue-700 truncate">{item.station || 'N/A'}</p>
                      </div>
                      <div className="border-l-2 border-indigo-500 pl-2">
                        <p className="text-muted-foreground text-[10px] font-medium text-indigo-600">Client</p>
                        <p className="text-foreground font-semibold text-indigo-700 truncate">{item.clientName || item.client || 'N/A'}</p>
                        {item.clientNumber && (
                          <p className="text-[10px] text-indigo-500 truncate">({item.clientNumber})</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {actions && (
                  <div className="flex gap-1.5 pt-1.5" onClick={(e) => e.stopPropagation()}>
                    {tabType === 'installed' && onView && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1 h-8 text-xs"
                        onClick={() => onView(item)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                    )}
                    {tabType === 'available' && onAttach && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1 h-8 text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => onAttach(item)}
                      >
                        <Link className="w-3.5 h-3.5" />
                        Attach
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 h-8 text-xs"
                      onClick={() => onEdit?.(item)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 h-8 text-xs text-red-600 hover:text-red-700"
                      onClick={() => onDelete?.(item)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block w-full max-w-full overflow-x-hidden">
        <table className="w-full min-w-0 table-auto">
          <thead>
            <tr className="border-b border-border">
              {showCheckboxes && (
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-purple-600 bg-purple-50 w-12">
                  <div className="flex items-center">
                    <Checkbox
                      checked={filtered.filter(item => canSelect(item)).length > 0 && filtered.filter(item => canSelect(item)).every(item => isSelected(item._id || ''))}
                      onCheckedChange={(checked) => {
                        const selectableItems = filtered.filter(item => canSelect(item));
                        if (checked) {
                          onSelectionChange?.(selectableItems.map(item => item._id || '').filter(Boolean));
                        } else {
                          onSelectionChange?.([]);
                        }
                      }}
                      onClick={toggleSelectAll}
                      className="w-5 h-5"
                    />
                  </div>
                </th>
              )}
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-purple-600 bg-purple-50">ID</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-purple-600 bg-purple-50">Name</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Model</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Serial Number</th>
              {tabType === 'available' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Batch</th>}
              {tabType === 'bought' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Cost</th>}
              {tabType === 'bought' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Warranty</th>}
              {tabType === 'installed' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-blue-600 bg-blue-50">Station</th>}
              {tabType === 'installed' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-indigo-600 bg-indigo-50">Client</th>}
              {tabType === 'installed' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-emerald-600 bg-emerald-50">Installation Type</th>}
              {tabType === 'installed' && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Last Service</th>}
              {actions && <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((item) => (
              <tr 
                key={item._id || item.equipmentId} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => tabType === 'installed' && onView?.(item)}
              >
                {showCheckboxes && (
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center">
                      <Checkbox
                        checked={isSelected(item._id || '')}
                        disabled={!canSelect(item)}
                        onCheckedChange={() => toggleSelection(item._id || '', item)}
                        title={item.batchId ? 'Equipment already belongs to a batch' : ''}
                        className="w-5 h-5"
                      />
                    </div>
                  </td>
                )}
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full hidden sm:block"></div>
                    <span className="font-bold text-purple-700">{item.equipmentId}</span>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full hidden sm:block"></div>
                    <span className="font-semibold text-purple-700">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-foreground">{item.model}</td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground font-mono text-xs">{item.serialNumber}</td>
                {tabType === 'available' && (
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                    {item.batch?.name ? (
                      <Badge variant="secondary" className="gap-1">
                        <Package className="w-3 h-3" />
                        {item.batch.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                )}
                {tabType === 'bought' && (
                  <>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground">Ksh {item.cost?.toLocaleString() || '0'}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
                        <span className="text-xs sm:text-sm">{item.warranty || 'N/A'}</span>
                      </div>
                    </td>
                  </>
                )}
                {tabType === 'installed' && (
                  <>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full hidden sm:block"></div>
                        <span className="font-semibold text-blue-700">{item.station || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-indigo-500 rounded-full hidden sm:block"></div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-indigo-700 truncate">{item.clientName || item.client || 'N/A'}</span>
                          {item.clientNumber && (
                            <span className="text-xs text-indigo-500 truncate">({item.clientNumber})</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-emerald-500 rounded-full hidden sm:block"></div>
                        {item.installationType === 'exchange-replacement' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            Exchange
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground">{item.lastService || 'N/A'}</td>
                  </>
                )}
                {actions && (
                  <td className="px-4 sm:px-6 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      {tabType === 'installed' && onView && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onView(item)}
                          className="gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      )}
                      {tabType === 'available' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onAttach?.(item)}
                          className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Attach</span>
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit?.(item)}
                        className="gap-1 h-8 text-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDelete?.(item)}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EquipmentTabsProps {
  onEquipmentUpdate?: () => void;
}

export function EquipmentTabs({ onEquipmentUpdate }: EquipmentTabsProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [createBatchFromSelectedOpen, setCreateBatchFromSelectedOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('installed');
  const [mainView, setMainView] = useState<'equipment' | 'batches'>('equipment');
  const [mounted, setMounted] = useState(false);
  const refreshBatchesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/equipment');
      const data = await response.json();
      if (response.ok) {
        setEquipment(data.equipment || []);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const getFilteredEquipment = (status: 'bought' | 'available' | 'installed' | 'in-repair') => {
    return equipment.filter((item) => item.status === status);
  };

  const boughtEquipment = getFilteredEquipment('bought');
  // Available tab shows both "available" and "bought" equipment (bought means it's available)
  // Only show equipment that doesn't already belong to a batch for selection
  const availableEquipment = equipment.filter((item) => 
    (item.status === 'available' || item.status === 'bought')
  );
  const installedEquipment = getFilteredEquipment('installed');
  
  // Get selected equipment objects
  const selectedEquipmentItems = equipment.filter(item => 
    selectedEquipmentIds.includes(item._id || '')
  );
  
  const handleCreateBatchFromSelected = async (batchData: {
    name: string;
    description: string;
    purchaseDate: string;
    purchaseCost?: string;
    supplier?: string;
  }) => {
    try {
      const response = await fetch('/api/equipment-batches/create-from-selected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...batchData,
          equipmentIds: selectedEquipmentIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      toast.success(`Batch created successfully with ${selectedEquipmentIds.length} equipment items`);
      setCreateBatchFromSelectedOpen(false);
      setSelectedEquipmentIds([]);
      fetchEquipment();
      if (onEquipmentUpdate) {
        onEquipmentUpdate();
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create batch';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setFormOpen(true);
  };

  const handleAttach = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setAttachDialogOpen(true);
  };

  const handleView = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setViewDialogOpen(true);
  };

  const handleDelete = async (equipment: Equipment) => {
    if (!equipment._id) {
      toast.error('Cannot delete equipment: Invalid ID');
      return;
    }

    // Determine message based on whether equipment has a batch
    const hasBatch = equipment.batchId && equipment.batchId.trim() !== '';
    const confirmMessage = hasBatch
      ? `Are you sure you want to return ${equipment.name} to batch? This will remove it from the client and make it available again.`
      : `Are you sure you want to permanently delete ${equipment.name}? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/equipment/${equipment._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete equipment');
      }

      const successMessage = hasBatch
        ? 'Equipment returned to batch successfully!'
        : 'Equipment deleted successfully!';
      toast.success(successMessage);
      fetchEquipment();
      // Refresh batches list to update remaining counts
      if (refreshBatchesRef.current && typeof refreshBatchesRef.current === 'function') {
        refreshBatchesRef.current();
      }
      if (onEquipmentUpdate) {
        onEquipmentUpdate();
      }
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete equipment');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center w-full">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Equipment</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage equipment inventory</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            className="gap-2 flex-1 sm:flex-initial shrink-0"
            onClick={() => setTemplateManagerOpen(true)}
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>Templates</span>
          </Button>
          <Button 
            variant="outline"
            className="gap-2 flex-1 sm:flex-initial shrink-0"
            onClick={() => setBatchFormOpen(true)}
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Batch</span>
          </Button>
          <Button 
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial shrink-0"
            onClick={() => {
              setSelectedEquipment(null);
              setFormOpen(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Equipment</span>
          </Button>
        </div>
      </div>

      {/* Tabs for Equipment and Batch Tracking */}
      {mounted && (
      <Tabs value={mainView} onValueChange={(value) => setMainView(value as 'equipment' | 'batches')} className="w-full">
        <TabsList>
          <TabsTrigger value="equipment">Equipment List</TabsTrigger>
          <TabsTrigger value="batches">Batch Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="installed" className="w-full max-w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-auto max-w-full">
            <TabsTrigger value="bought" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              <span className="hidden sm:inline">Equipment Bought</span>
              <span className="sm:hidden">Bought</span>
              <span className="ml-1">({boughtEquipment.length})</span>
            </TabsTrigger>
            <TabsTrigger value="available" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              Available ({availableEquipment.length})
            </TabsTrigger>
            <TabsTrigger value="installed" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              Installed ({installedEquipment.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bought" className="mt-4 sm:mt-6 w-full max-w-full overflow-x-hidden">
            <Card className="bg-white w-full max-w-full overflow-x-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Purchased Equipment</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
                {boughtEquipment.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-sm sm:text-base text-muted-foreground">No purchased equipment found</p>
                  </div>
                ) : (
                  <EquipmentTable 
                    equipment={boughtEquipment} 
                    actions={true} 
                    tabType="bought"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available" className="mt-4 sm:mt-6 w-full max-w-full overflow-x-hidden">
            <Card className="bg-white w-full max-w-full overflow-x-hidden">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Available Equipment</CardTitle>
                  {selectedEquipmentIds.length > 0 && (
                    <Button
                      onClick={() => setCreateBatchFromSelectedOpen(true)}
                      className="gap-2"
                      variant="default"
                    >
                      <Package className="w-4 h-4" />
                      Create Batch ({selectedEquipmentIds.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
                {availableEquipment.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-sm sm:text-base text-muted-foreground">No available equipment found</p>
                  </div>
                ) : (
                  <EquipmentTable 
                    equipment={availableEquipment} 
                    actions={true} 
                    tabType="available"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAttach={handleAttach}
                    selectedItems={selectedEquipmentIds}
                    onSelectionChange={setSelectedEquipmentIds}
                    showCheckboxes={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installed" className="mt-4 sm:mt-6 w-full max-w-full overflow-x-hidden">
            <Card className="bg-white w-full max-w-full overflow-x-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Installed Equipment</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
                {installedEquipment.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-sm sm:text-base text-muted-foreground">No installed equipment found</p>
                  </div>
                ) : (
                  <EquipmentTable 
                    equipment={installedEquipment} 
                    actions={true} 
                    tabType="installed"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          )}
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <BatchTracking onBatchesUpdate={(fn) => { refreshBatchesRef.current = fn; }} />
        </TabsContent>
      </Tabs>
      )}
      
      {!mounted && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <EquipmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        equipment={selectedEquipment}
        onSuccess={() => {
          fetchEquipment();
          setSelectedEquipment(null);
          if (onEquipmentUpdate) {
            onEquipmentUpdate();
          }
        }}
      />

      <AttachClientDialog
        open={attachDialogOpen}
        onOpenChange={setAttachDialogOpen}
        equipment={selectedEquipment}
        onSuccess={() => {
          fetchEquipment();
          // Refresh batches list to update remaining counts after attachment
          if (refreshBatchesRef.current && typeof refreshBatchesRef.current === 'function') {
            refreshBatchesRef.current();
          }
          setSelectedEquipment(null);
          if (onEquipmentUpdate) {
            onEquipmentUpdate();
          }
        }}
      />

      <EquipmentViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        equipment={selectedEquipment}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <EquipmentTemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
      />

      <BatchForm
        open={batchFormOpen}
        onOpenChange={setBatchFormOpen}
        onSuccess={() => {
          fetchEquipment();
          // Refresh batches list in real-time
          if (refreshBatchesRef.current && typeof refreshBatchesRef.current === 'function') {
            refreshBatchesRef.current();
          }
        }}
      />

      {/* Create Batch from Selected Equipment Dialog */}
      <CreateBatchFromSelectedDialog
        open={createBatchFromSelectedOpen}
        onOpenChange={setCreateBatchFromSelectedOpen}
        selectedEquipment={selectedEquipmentItems}
        onCreateBatch={handleCreateBatchFromSelected}
      />
    </div>
  );
}

// Create Batch from Selected Equipment Dialog Component
function CreateBatchFromSelectedDialog({
  open,
  onOpenChange,
  selectedEquipment,
  onCreateBatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEquipment: Equipment[];
  onCreateBatch: (data: {
    name: string;
    description: string;
    purchaseDate: string;
    purchaseCost?: string;
    supplier?: string;
  }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    supplier: '',
  });

  useEffect(() => {
    if (open) {
      // Calculate total cost from selected equipment
      const totalCost = selectedEquipment.reduce((sum, item) => {
        return sum + (Number(item.cost) || 0);
      }, 0);

      // Auto-generate name from equipment types
      const uniqueNames = [...new Set(selectedEquipment.map(item => item.name))];
      const autoName = uniqueNames.length === 1 
        ? `${uniqueNames[0]} Batch`
        : `Mixed Equipment Batch`;

      setFormData({
        name: autoName,
        description: `Batch containing ${selectedEquipment.length} equipment items`,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: totalCost > 0 ? totalCost.toString() : '',
        supplier: '',
      });
    }
  }, [open, selectedEquipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.purchaseDate) {
      toast.error('Name and purchase date are required');
      return;
    }

    setLoading(true);
    try {
      await onCreateBatch(formData);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = selectedEquipment.reduce((sum, item) => {
    return sum + (Number(item.cost) || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Batch from Selected Equipment</DialogTitle>
          <DialogDescription>
            Create a new batch from {selectedEquipment.length} selected equipment {selectedEquipment.length === 1 ? 'item' : 'items'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Batch Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter batch name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter batch description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseCost">Purchase Cost (Ksh)</Label>
              <Input
                id="purchaseCost"
                type="number"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                placeholder="Auto-calculated from equipment"
              />
              {totalCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total cost from equipment: Ksh {totalCost.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Enter supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label>Selected Equipment ({selectedEquipment.length} items)</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/50">
              <div className="space-y-1">
                {selectedEquipment.map((item) => (
                  <div key={item._id} className="text-sm flex items-center justify-between">
                    <span className="font-medium">{item.equipmentId} - {item.name}</span>
                    <span className="text-muted-foreground">Ksh {item.cost?.toLocaleString() || '0'}</span>
                  </div>
                ))}
              </div>
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
              Create Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
