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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface Equipment {
  _id?: string;
  equipmentId: string;
  name: string;
  model: string;
  serialNumber: string;
  status: 'available' | 'installed' | 'in-repair' | 'bought';
  cost?: number;
  warranty?: string;
  station?: string;
  client?: string;
  installDate?: string;
  lastService?: string;
  installationType?: 'new-installation' | 'exchange-replacement';
  replacedEquipmentId?: string;
  replacedEquipmentSerialNumber?: string;
}

interface EquipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  onSuccess?: () => void;
}

const STATUSES = ['bought', 'available', 'installed', 'in-repair'] as const;

export function EquipmentForm({ open, onOpenChange, equipment, onSuccess }: EquipmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<string[]>([]);
  const [fetchingStations, setFetchingStations] = useState(false);
  const [equipmentList, setEquipmentList] = useState<Array<{ equipmentId: string; name: string; serialNumber: string }>>([]);
  const [fetchingEquipment, setFetchingEquipment] = useState(false);
  const [templates, setTemplates] = useState<Array<{ _id: string; name: string; model: string }>>([]);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [serialNumberFields, setSerialNumberFields] = useState<string[]>(['']);
  const [serialNumberErrors, setSerialNumberErrors] = useState<boolean[]>([false]);
  const [inputTypes, setInputTypes] = useState<Array<'serial' | 'mac'>>(['serial']);

  // Format MAC address (add colons automatically)
  const formatMacAddress = (value: string): string => {
    // Remove all non-hexadecimal characters
    const cleaned = value.replace(/[^0-9A-Fa-f]/g, '');
    
    // Limit to 12 characters (6 pairs)
    const limited = cleaned.slice(0, 12);
    
    // Add colons every 2 characters
    return limited.split('').reduce((acc, char, index) => {
      if (index > 0 && index % 2 === 0) {
        return acc + ':' + char;
      }
      return acc + char;
    }, '');
  };

  // Validate serial number or MAC address format
  const validateSerialNumber = (serialNumber: string): boolean => {
    if (!serialNumber.trim()) return false;
    const trimmed = serialNumber.trim();
    
    // Check if it's a MAC address format (XX:XX:XX:XX:XX:XX)
    const macPattern = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (macPattern.test(trimmed)) return true;
    
    // Check if it's a serial number format (SN- followed by numbers, or just numbers)
    const serialPattern = /^(SN-\d+|\d+)$/;
    return serialPattern.test(trimmed);
  };
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serialNumber: '',
    status: 'bought' as const,
    cost: 0,
    warranty: '',
    station: '',
    client: '',
    installDate: '',
    lastService: '',
    installationType: 'new-installation' as const,
    replacedEquipmentId: '',
    replacedEquipmentSerialNumber: '',
    boughtDate: '',
  });

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name || '',
        model: equipment.model || '',
        serialNumber: equipment.serialNumber || '',
        status: equipment.status || 'available',
        cost: equipment.cost || 0,
        warranty: equipment.warranty || '',
        station: equipment.station || '',
        client: equipment.client || '',
        installDate: equipment.installDate || '',
        lastService: equipment.lastService || '',
        installationType: equipment.installationType || 'new-installation',
        replacedEquipmentId: equipment.replacedEquipmentId || '',
        replacedEquipmentSerialNumber: '',
      });
      setSerialNumberFields(['']);
      setSerialNumberErrors([false]);
      setInputTypes(['serial']);
    } else {
      // Set bought date to today when creating new equipment
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        name: '',
        model: '',
        serialNumber: '',
        status: 'bought',
        cost: 0,
        warranty: '',
        station: '',
        client: '',
        installDate: '',
        lastService: '',
        installationType: 'new-installation',
        replacedEquipmentId: '',
        replacedEquipmentSerialNumber: '',
        boughtDate: today,
      });
      setSerialNumberFields(['']);
      setSerialNumberErrors([false]);
      setInputTypes(['serial']);
    }
  }, [equipment, open]);

  useEffect(() => {
    if (open) {
      fetchStations();
      fetchTemplates();
      if (formData.status === 'installed' && formData.installationType === 'exchange-replacement') {
        fetchEquipment();
      }
    }
  }, [open, formData.status, formData.installationType]);

  const fetchStations = async () => {
    try {
      setFetchingStations(true);
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (response.ok) {
        const fetchedStations = data.stations?.map((station: { name: string }) => station.name) || [];
        setStations(fetchedStations);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setFetchingStations(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      setFetchingEquipment(true);
      const response = await fetch('/api/equipment');
      const data = await response.json();
      if (response.ok) {
        const fetchedEquipment = data.equipment
          ?.filter((eq: Equipment) => eq.equipmentId !== equipment?.equipmentId) // Exclude current equipment if editing
          .map((eq: Equipment) => ({
            equipmentId: eq.equipmentId,
            name: eq.name,
            serialNumber: eq.serialNumber,
          })) || [];
        setEquipmentList(fetchedEquipment);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setFetchingEquipment(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If editing, use single equipment update
      if (equipment?._id) {
        const url = `/api/equipment/${equipment._id}`;
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            cost: formData.cost || 0,
            replacedEquipmentId: formData.replacedEquipmentId || formData.replacedEquipmentSerialNumber || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update equipment');
        }

        toast.success('Equipment updated successfully!');
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Check if we have multiple serial numbers
      const validSerialNumbers = serialNumberFields
        .map(sn => sn.trim())
        .filter(sn => sn.length > 0);

      if (validSerialNumbers.length === 0) {
        throw new Error('Please enter at least one serial number');
      }

      // Validate serial number formats
      const invalidSerialNumbers: string[] = [];
      validSerialNumbers.forEach((sn, index) => {
        if (!validateSerialNumber(sn)) {
          invalidSerialNumbers.push(sn);
        }
      });

      if (invalidSerialNumbers.length > 0) {
        throw new Error(
          `Invalid serial number/MAC address format: ${invalidSerialNumbers.join(', ')}. ` +
          `Format should be "SN-12345", "12345", or MAC address "AA:BB:CC:DD:EE:FF" (colons added automatically). ` +
          `Format should be "SN-12345" or just numbers like "12345". Example: SN-88441`
        );
      }

      if (!formData.name.trim() || !formData.model.trim()) {
        throw new Error('Equipment name and model are required');
      }

      // If multiple serial numbers, create multiple equipment entries
      if (validSerialNumbers.length > 1) {
        // Create multiple equipment entries
        const createPromises = validSerialNumbers.map(async (serialNumber) => {
          const response = await fetch('/api/equipment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              model: formData.model.trim(),
              serialNumber: serialNumber,
              status: formData.status || 'bought',
              cost: formData.cost || 0,
              warranty: formData.warranty || null,
              station: formData.station || null,
              client: formData.client || null,
              installDate: formData.installDate || null,
              lastService: formData.lastService || null,
              installationType: formData.installationType,
              replacedEquipmentId: formData.replacedEquipmentId || formData.replacedEquipmentSerialNumber || null,
              boughtDate: formData.boughtDate || new Date().toISOString().split('T')[0],
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Failed to create equipment with serial number ${serialNumber}`);
          }
          return data;
        });

        const results = await Promise.all(createPromises);
        toast.success(`Successfully created ${results.length} equipment item(s)!`);
      } else {
        // Single equipment creation
        const response = await fetch('/api/equipment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            serialNumber: validSerialNumbers[0],
            status: formData.status || 'bought',
            cost: formData.cost || 0,
            replacedEquipmentId: formData.replacedEquipmentId || formData.replacedEquipmentSerialNumber || null,
            boughtDate: formData.boughtDate || new Date().toISOString().split('T')[0],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create equipment');
        }

        toast.success('Equipment created successfully!');
      }

      // Reset form
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        name: '',
        model: '',
        serialNumber: '',
        status: 'bought',
        cost: 0,
        warranty: '',
        station: '',
        client: '',
        installDate: '',
        lastService: '',
        installationType: 'new-installation',
        replacedEquipmentId: '',
        replacedEquipmentSerialNumber: '',
        boughtDate: today,
      });
      setSerialNumberFields(['']);
      setSerialNumberErrors([false]);
      setInputTypes(['serial']);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {equipment ? 'Update equipment information' : 'Fill in all the required fields to add new equipment'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300">Basic Information</h3>
            
            {/* Template Selector */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template" className="text-sm font-medium">
                  Quick Select from Templates
                </Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const selectedTemplate = templates.find(t => t._id === value);
                    if (selectedTemplate) {
                      // Auto-fill equipment name and model from template
                      setFormData((prev) => ({
                        ...prev,
                        name: selectedTemplate.name,
                        model: selectedTemplate.model,
                      }));
                    }
                  }}
                  disabled={fetchingTemplates}
                >
                  <SelectTrigger id="template" className="h-11">
                    <SelectValue placeholder={fetchingTemplates ? "Loading templates..." : "Select a template (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template._id} value={template._id}>
                        {template.name} - {template.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
                  Equipment Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter equipment name"
                  required
                  className="h-10 sm:h-11 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="model" className="text-xs sm:text-sm font-medium">
                  Model <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="Enter model"
                  required
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <Label className="text-xs sm:text-sm font-medium">
                    Serial Number(s) / MAC Address(es) <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Select input type for each field
                  </p>
                </div>
                {!equipment && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSerialNumberFields([...serialNumberFields, '']);
                      setSerialNumberErrors([...serialNumberErrors, false]);
                      setInputTypes([...inputTypes, 'serial']);
                    }}
                    className="h-8 gap-1 text-xs shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">Add Another</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {serialNumberFields.map((serialNumber, index) => {
                  const inputType = inputTypes[index] || 'serial';
                  const hasError = serialNumber.trim().length > 0 && !validateSerialNumber(serialNumber);
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex gap-2">
                        <Select
                          value={inputType}
                          onValueChange={(value: 'serial' | 'mac') => {
                            const newTypes = [...inputTypes];
                            newTypes[index] = value;
                            setInputTypes(newTypes);
                            // Clear the field when switching types
                            const newFields = [...serialNumberFields];
                            newFields[index] = '';
                            setSerialNumberFields(newFields);
                            if (index === 0) {
                              handleChange('serialNumber', '');
                            }
                          }}
                        >
                          <SelectTrigger className="w-32 sm:w-36 h-10 sm:h-11 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="serial">Serial #</SelectItem>
                            <SelectItem value="mac">MAC Address</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={serialNumber}
                          onChange={(e) => {
                            let value = e.target.value;
                            
                            // Apply formatting based on selected input type
                            if (inputType === 'mac') {
                              // Format MAC address (auto-add colons)
                              value = formatMacAddress(value);
                            }
                            
                            const newFields = [...serialNumberFields];
                            newFields[index] = value;
                            setSerialNumberFields(newFields);
                            
                            // Update error state
                            const newErrors = [...serialNumberErrors];
                            newErrors[index] = value.trim().length > 0 && !validateSerialNumber(value);
                            setSerialNumberErrors(newErrors);
                            
                            // Also update formData for the first field (for backward compatibility)
                            if (index === 0) {
                              handleChange('serialNumber', value);
                            }
                          }}
                          placeholder={
                            inputType === 'mac' 
                              ? "e.g., AA:BB:CC:DD:EE:FF (colons added automatically)"
                              : index === 0 
                                ? "e.g., SN-88441 or 88441"
                                : `Serial Number ${index + 1} (e.g., SN-88442)`
                          }
                          required={index === 0}
                          className={`h-10 sm:h-11 text-sm flex-1 ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {serialNumberFields.length > 1 && !equipment && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newFields = serialNumberFields.filter((_, i) => i !== index);
                              const newErrors = serialNumberErrors.filter((_, i) => i !== index);
                              const newTypes = inputTypes.filter((_, i) => i !== index);
                              setSerialNumberFields(newFields);
                              setSerialNumberErrors(newErrors);
                              setInputTypes(newTypes);
                            }}
                            className="h-10 sm:h-11 w-10 sm:w-11 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {hasError && (
                        <p className="text-[10px] sm:text-xs text-red-600 flex items-center gap-1">
                          <span>⚠</span>
                          {inputType === 'mac' 
                            ? 'Invalid MAC address format. Use "AA:BB:CC:DD:EE:FF" format (colons added automatically)'
                            : 'Invalid format. Use "SN-12345" or "12345". Example: SN-88441'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {!equipment && serialNumberFields.length > 1 && (
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                  <p className="font-medium">Quick Add Mode:</p>
                  <p>Will create {serialNumberFields.filter(sn => sn.trim().length > 0).length} equipment item(s) with the same name and model</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="status" className="text-xs sm:text-sm font-medium">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value as typeof formData.status)}
                required
              >
                <SelectTrigger id="status" className="h-10 sm:h-11 text-sm">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Installation Information */}
          {formData.status === 'installed' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-l-4 border-emerald-500">
              <h3 className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300">Installation Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="station" className="text-xs sm:text-sm font-medium">
                    Station
                  </Label>
                  <Select
                    value={formData.station}
                    onValueChange={(value) => handleChange('station', value)}
                    disabled={fetchingStations}
                  >
                    <SelectTrigger id="station" className="h-10 sm:h-11 text-sm">
                      <SelectValue placeholder={fetchingStations ? "Loading..." : "Select Station"} />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="installationType" className="text-xs sm:text-sm font-medium">
                    Installation Type
                  </Label>
                  <Select
                    value={formData.installationType}
                    onValueChange={(value) => {
                      handleChange('installationType', value);
                      if (value === 'new-installation') {
                        handleChange('replacedEquipmentId', '');
                        handleChange('replacedEquipmentSerialNumber', '');
                      } else {
                        fetchEquipment();
                      }
                    }}
                  >
                    <SelectTrigger id="installationType" className="h-10 sm:h-11 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new-installation">New Installation</SelectItem>
                      <SelectItem value="exchange-replacement">Exchange/Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.installationType === 'exchange-replacement' && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="replacedEquipment" className="text-xs sm:text-sm font-medium">
                      Replaced Equipment
                    </Label>
                    <Select
                      value={formData.replacedEquipmentId}
                      onValueChange={(value) => handleChange('replacedEquipmentId', value)}
                      disabled={fetchingEquipment}
                    >
                      <SelectTrigger id="replacedEquipment" className="h-10 sm:h-11 text-sm">
                        <SelectValue placeholder={fetchingEquipment ? "Loading..." : "Select from list"} />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentList.map((eq) => (
                          <SelectItem key={eq.equipmentId} value={eq.equipmentId}>
                            {eq.equipmentId} - {eq.name} ({eq.serialNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="replacedEquipmentSerialNumber"
                      value={formData.replacedEquipmentSerialNumber || ''}
                      onChange={(e) => handleChange('replacedEquipmentSerialNumber', e.target.value)}
                      placeholder="Or type serial number if not in list"
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="installDate" className="text-xs sm:text-sm font-medium">
                    Install Date
                  </Label>
                  <Input
                    id="installDate"
                    type="date"
                    value={formData.installDate}
                    onChange={(e) => handleChange('installDate', e.target.value)}
                    className="h-10 sm:h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="lastService" className="text-xs sm:text-sm font-medium">
                    Last Service Date
                  </Label>
                  <Input
                    id="lastService"
                    type="date"
                    value={formData.lastService}
                    onChange={(e) => handleChange('lastService', e.target.value)}
                    className="h-10 sm:h-11 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto h-10 sm:h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-xs sm:text-sm">{equipment ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <span className="text-xs sm:text-sm">{equipment ? 'Update Equipment' : 'Create Equipment'}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

