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
import { Loader2, Plus, Clock } from 'lucide-react';
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
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [fetchingStations, setFetchingStations] = useState(true);
  const [formData, setFormData] = useState({
    clientName: '',
    clientNumber: '',
    station: '',
    houseNumber: '',
    category: '',
    dateTimeReported: '',
    problemDescription: '',
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

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchStations();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
                  value={formData.clientNumber}
                  onChange={(e) => handleChange('clientNumber', e.target.value)}
                  placeholder="Enter client number"
                  required
                  className="h-10 sm:h-11 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
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

