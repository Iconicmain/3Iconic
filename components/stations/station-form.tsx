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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Station {
  _id?: string;
  stationId: string;
  name: string;
  location: string;
  region: string;
  status: 'active' | 'maintenance' | 'inactive';
  technicians: number;
  equipment: number;
  ticketsThisMonth: number;
  performanceScore: number;
}

interface StationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station?: Station | null;
  onSuccess?: () => void;
}

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const STATUSES = ['active', 'maintenance', 'inactive'] as const;

export function StationForm({ open, onOpenChange, station, onSuccess }: StationFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    region: '',
    status: 'active' as const,
    technicians: 0,
    equipment: 0,
    ticketsThisMonth: 0,
    performanceScore: 0,
  });

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || '',
        location: station.location || '',
        region: station.region || '',
        status: station.status || 'active',
        technicians: station.technicians || 0,
        equipment: station.equipment || 0,
        ticketsThisMonth: station.ticketsThisMonth || 0,
        performanceScore: station.performanceScore || 0,
      });
    } else {
      setFormData({
        name: '',
        location: '',
        region: '',
        status: 'active',
        technicians: 0,
        equipment: 0,
        ticketsThisMonth: 0,
        performanceScore: 0,
      });
    }
  }, [station, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = station?._id ? `/api/stations/${station._id}` : '/api/stations';
      const method = station?._id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save station');
      }

      toast.success(station ? 'Station updated successfully!' : 'Station created successfully!');
      setFormData({
        name: '',
        location: '',
        region: '',
        status: 'active',
        technicians: 0,
        equipment: 0,
        ticketsThisMonth: 0,
        performanceScore: 0,
      });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving station:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save station');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {station ? 'Edit Station' : 'Add New Station'}
          </DialogTitle>
          <DialogDescription>
            {station ? 'Update station information' : 'Fill in all the required fields to create a new station'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
            <h3 className="font-semibold text-blue-700 dark:text-blue-300">Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Station Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter station name"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium">
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Enter location"
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region" className="text-sm font-medium">
                  Region <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => handleChange('region', value)}
                  required
                >
                  <SelectTrigger id="region" className="h-11">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value as typeof formData.status)}
                  required
                >
                  <SelectTrigger id="status" className="h-11">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-l-4 border-purple-500">
            <h3 className="font-semibold text-purple-700 dark:text-purple-300">Resources</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technicians" className="text-sm font-medium">
                  Technicians
                </Label>
                <Input
                  id="technicians"
                  type="number"
                  min="0"
                  value={formData.technicians}
                  onChange={(e) => handleChange('technicians', parseInt(e.target.value) || 0)}
                  placeholder="Number of technicians"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment" className="text-sm font-medium">
                  Equipment
                </Label>
                <Input
                  id="equipment"
                  type="number"
                  min="0"
                  value={formData.equipment}
                  onChange={(e) => handleChange('equipment', parseInt(e.target.value) || 0)}
                  placeholder="Number of equipment"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-l-4 border-emerald-500">
            <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">Performance Metrics</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticketsThisMonth" className="text-sm font-medium">
                  Tickets This Month
                </Label>
                <Input
                  id="ticketsThisMonth"
                  type="number"
                  min="0"
                  value={formData.ticketsThisMonth}
                  onChange={(e) => handleChange('ticketsThisMonth', parseInt(e.target.value) || 0)}
                  placeholder="Number of tickets"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="performanceScore" className="text-sm font-medium">
                  Performance Score (%)
                </Label>
                <Input
                  id="performanceScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.performanceScore}
                  onChange={(e) => handleChange('performanceScore', parseInt(e.target.value) || 0)}
                  placeholder="Performance score (0-100)"
                  className="h-11"
                />
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
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {station ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                station ? 'Update Station' : 'Create Station'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

