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
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Clock, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';

interface TicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TicketForm({ open, onOpenChange, onSuccess }: TicketFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [fetchingStations, setFetchingStations] = useState(true);
  const [fetchingTechnicians, setFetchingTechnicians] = useState(true);
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientNumber: '',
    station: '',
    houseNumber: '',
    category: '',
    dateTimeReported: '',
    problemDescription: '',
    technicians: [] as string[],
  });

  const fetchCategories = async () => {
    try {
      setFetchingCategories(true);
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories?.map((cat: { name: string }) => cat.name) || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setFetchingCategories(false);
    }
  };

  const fetchStations = async () => {
    try {
      setFetchingStations(true);
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (response.ok) {
        // Fetch ALL stations from database
        const fetchedStations = data.stations?.map((station: { name: string }) => station.name) || [];
        setStations(fetchedStations);
        console.log(`Loaded ${fetchedStations.length} stations for ticket form`);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setFetchingStations(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      setFetchingTechnicians(true);
      const response = await fetch('/api/technicians');
      const data = await response.json();
      console.log('[Ticket Form] Technicians API response:', { ok: response.ok, data });
      if (response.ok) {
        const technicianNames = data.technicians?.map((tech: { name: string }) => tech.name) || [];
        console.log('[Ticket Form] Mapped technician names:', technicianNames);
        setTechnicians(technicianNames);
      } else {
        console.error('[Ticket Form] Failed to fetch technicians:', data.error);
        toast.error('Failed to load technicians');
      }
    } catch (error) {
      console.error('[Ticket Form] Error fetching technicians:', error);
      toast.error('Failed to load technicians');
    } finally {
      setFetchingTechnicians(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchStations();
      fetchTechnicians();
    }
  }, [open]);

  const normalizePhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return phoneNumber;
    
    // Remove any spaces or dashes
    let cleaned = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    
    // If it already starts with +254, return as is
    if (cleaned.startsWith('+254')) {
      return cleaned;
    }
    
    // If it starts with 254 (without +), add +
    if (cleaned.startsWith('254')) {
      return '+' + cleaned;
    }
    
    // If it starts with 0 (local format), replace 0 with +254
    if (cleaned.startsWith('0')) {
      return '+254' + cleaned.substring(1);
    }
    
    // Otherwise, prepend +254
    return '+254' + cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalize client number before submitting
      const normalizedClientNumber = normalizePhoneNumber(formData.clientNumber);
      
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          clientNumber: normalizedClientNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      toast.success('Ticket created successfully!');
      setFormData({
        clientName: '',
        clientNumber: '',
        station: '',
        houseNumber: '',
        category: '',
        dateTimeReported: '',
        problemDescription: '',
        technicians: [],
      });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTechnicianToggle = (technicianName: string) => {
    setFormData((prev) => {
      const currentTechnicians = prev.technicians || [];
      const isSelected = currentTechnicians.includes(technicianName);
      const newTechnicians = isSelected
        ? currentTechnicians.filter((t) => t !== technicianName)
        : [...currentTechnicians, technicianName];
      return { ...prev, technicians: newTechnicians };
    });
  };

  const handleRemoveTechnician = (technicianName: string) => {
    setFormData((prev) => ({
      ...prev,
      technicians: (prev.technicians || []).filter((t) => t !== technicianName),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-[95vw] md:w-full mx-1 sm:mx-2 md:mx-0 p-4 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Add New Ticket
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Fill in all the required fields to create a new support ticket
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Client Information Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-1 h-4 sm:h-5 bg-blue-500 rounded-full"></div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Client Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="clientName" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  Client Name
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  required
                  className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="clientNumber" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  Client Number
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <Input
                  id="clientNumber"
                  type="tel"
                  value={formData.clientNumber}
                  onChange={(e) => handleChange('clientNumber', e.target.value)}
                  placeholder="e.g., 0712345678 or +254712345678"
                  required
                  className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Will automatically add +254 prefix if not provided
                </p>
              </div>
            </div>
          </div>

          {/* Location Information Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-1 h-4 sm:h-5 bg-amber-500 rounded-full"></div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Location Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="station" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  Station/Location
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <Select
                  value={formData.station}
                  onValueChange={(value) => handleChange('station', value)}
                  required
                  disabled={fetchingStations}
                >
                  <SelectTrigger id="station" className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500">
                    <SelectValue placeholder={fetchingStations ? "Loading..." : "Select Station"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fetchingStations ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading stations...</div>
                    ) : stations.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No stations available</div>
                    ) : (
                      stations.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="houseNumber" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  House Number/Barrack
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <Input
                  id="houseNumber"
                  value={formData.houseNumber}
                  onChange={(e) => handleChange('houseNumber', e.target.value)}
                  placeholder="Enter house number or barrack name"
                  required
                  className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Ticket Details Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-1 h-4 sm:h-5 bg-purple-500 rounded-full"></div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="category" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  Category
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                  required
                  disabled={fetchingCategories}
                >
                  <SelectTrigger id="category" className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500">
                    <SelectValue placeholder={fetchingCategories ? "Loading..." : "Select Category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 && !fetchingCategories ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No categories available</div>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="dateTimeReported" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  Date & Time Reported
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="dateTimeReported"
                    type="datetime-local"
                    value={formData.dateTimeReported}
                    onChange={(e) => handleChange('dateTimeReported', e.target.value)}
                    required
                    className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const now = new Date();
                      // Format as YYYY-MM-DDTHH:mm for datetime-local input
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                      handleChange('dateTimeReported', dateTimeString);
                    }}
                    className="gap-2 shrink-0 h-10 sm:h-11 text-sm border-slate-300 hover:bg-slate-50"
                    title="Set to current date and time"
                  >
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Now</span>
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Select both date and time when the problem was reported
                </p>
              </div>
            </div>
          </div>

          {/* Problem Description Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-1 h-4 sm:h-5 bg-green-500 rounded-full"></div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Problem Description</h3>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="problemDescription" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                Describe the Problem
                <span className="text-red-500 text-xs">*</span>
              </Label>
              <Textarea
                id="problemDescription"
                value={formData.problemDescription}
                onChange={(e) => handleChange('problemDescription', e.target.value)}
                placeholder="Please provide a detailed description of the problem..."
                rows={4}
                required
                className="resize-none border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-sm leading-relaxed min-h-[100px] sm:min-h-[120px]"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Be as specific as possible to help us resolve your issue quickly
              </p>
            </div>
          </div>

          {/* Technician Assignment Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-1 h-4 sm:h-5 bg-indigo-500 rounded-full"></div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Assign Technicians (Optional)</h3>
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Technicians</Label>
              <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500"
                    disabled={loading}
                  >
                    <span className="truncate text-left">
                      {formData.technicians.length === 0
                        ? 'Select technicians...'
                        : formData.technicians.length === 1
                        ? formData.technicians[0]
                        : `${formData.technicians.length} technicians selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {fetchingTechnicians ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading technicians...
                      </div>
                    ) : technicians.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No technicians available. Please add technicians first.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {technicians.map((tech) => {
                          const isSelected = formData.technicians.includes(tech);
                          return (
                            <div
                              key={tech}
                              className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                              onClick={() => handleTechnicianToggle(tech)}
                            >
                              <Checkbox
                                id={`tech-${tech}`}
                                checked={isSelected}
                                onCheckedChange={() => handleTechnicianToggle(tech)}
                              />
                              <label
                                htmlFor={`tech-${tech}`}
                                className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {tech}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {formData.technicians.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technicians.map((tech) => (
                    <div
                      key={tech}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTechnician(tech)}
                        className="ml-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Optionally assign technicians to this ticket. They will be notified via SMS.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700 mt-4 sm:mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto order-2 sm:order-1 h-10 sm:h-11 text-sm border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full sm:w-auto order-1 sm:order-2 h-10 sm:h-11 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

