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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Clock, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  _id?: string;
  ticketId: string;
  clientName: string;
  station: string;
  category: string;
  status: 'open' | 'in-progress' | 'closed' | 'pending';
  dateTimeReported: string;
  technician?: string; // For backward compatibility
  technicians?: string[]; // New field for multiple technicians
  createdAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

interface TicketEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket | null;
  onSuccess?: () => void;
}

const STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'pending'];

export function TicketEditDialog({ open, onOpenChange, ticket, onSuccess }: TicketEditDialogProps) {
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTechnicians();
      fetchCategories();
    }
  }, [open]);

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians');
      const data = await response.json();
      if (response.ok) {
        const technicianNames = data.technicians?.map((tech: { name: string }) => tech.name) || [];
        setTechnicians(technicianNames);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) {
        const categoryNames = data.categories?.map((cat: { name: string }) => cat.name) || [];
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const [formData, setFormData] = useState({
    status: 'open' as Ticket['status'],
    category: '',
    technicians: [] as string[],
    resolvedAt: '',
    resolutionNotes: '',
  });
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);

  useEffect(() => {
    if (ticket) {
      // Handle backward compatibility: if ticket has technician (string), convert to technicians (array)
      let techniciansArray: string[] = [];
      if (ticket.technicians && Array.isArray(ticket.technicians)) {
        techniciansArray = ticket.technicians;
      } else if (ticket.technician) {
        // Convert old single technician to array for backward compatibility
        techniciansArray = [ticket.technician];
      }
      
      setFormData({
        status: ticket.status || 'open',
        category: ticket.category || '',
        technicians: techniciansArray,
        resolvedAt: ticket.resolvedAt 
          ? new Date(ticket.resolvedAt).toISOString().slice(0, 16)
          : '',
        resolutionNotes: ticket.resolutionNotes || '',
      });
    }
  }, [ticket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket?._id) return;

    setLoading(true);

    try {
      // Build update payload with only changed fields
      const updatePayload: any = {};
      
      // Only include fields that are different from the original ticket
      if (formData.status !== (ticket.status || 'open')) {
        updatePayload.status = formData.status;
      }
      if (formData.category && formData.category !== (ticket.category || '')) {
        updatePayload.category = formData.category;
      }
      // Compare technicians array with existing ticket technicians
      const existingTechnicians = ticket.technicians && Array.isArray(ticket.technicians) 
        ? ticket.technicians 
        : (ticket.technician ? [ticket.technician] : []);
      const techniciansChanged = JSON.stringify(formData.technicians.sort()) !== JSON.stringify(existingTechnicians.sort());
      if (techniciansChanged) {
        updatePayload.technicians = formData.technicians.length > 0 ? formData.technicians : undefined;
      }
      // Compare resolvedAt dates more carefully
      const currentResolvedAt = ticket.resolvedAt 
        ? new Date(ticket.resolvedAt).toISOString().slice(0, 16)
        : '';
      if (formData.resolvedAt !== currentResolvedAt) {
        updatePayload.resolvedAt = formData.resolvedAt || undefined;
      }
      if (formData.resolutionNotes !== (ticket.resolutionNotes || '')) {
        updatePayload.resolutionNotes = formData.resolutionNotes || undefined;
      }

      // If no changes, show message and return
      if (Object.keys(updatePayload).length === 0) {
        toast.info('No changes to save');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/tickets/${ticket._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          data: data
        });
        throw new Error(data.error || `Failed to update ticket: ${response.status} ${response.statusText}`);
      }

      toast.success('Ticket updated successfully!');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ticket';
      toast.error(errorMessage);
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

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Edit Ticket - {ticket.ticketId}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update ticket status, assign technician, and add resolution details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status" className="text-sm">
                  <SelectValue />
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

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger id="category" className="text-sm">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Technicians - Multi-select */}
          <div className="space-y-2">
            <Label className="text-sm">Technicians</Label>
            <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-sm"
                  role="combobox"
                >
                  <span className="truncate">
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
                  {technicians.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No technicians available
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
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTechnician(tech)}
                      className="ml-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select one or more technicians who worked on this ticket
            </p>
          </div>

          {/* Resolved Date */}
          {(formData.status === 'closed' || formData.status === 'resolved') && (
            <div className="space-y-2">
              <Label htmlFor="resolvedAt" className="text-sm">Resolved Date & Time</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="resolvedAt"
                  type="datetime-local"
                  value={formData.resolvedAt}
                  onChange={(e) => handleChange('resolvedAt', e.target.value)}
                  className="flex-1 text-sm"
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
                    handleChange('resolvedAt', dateTimeString);
                  }}
                  className="gap-2 shrink-0"
                  title="Set to current date and time"
                  size="sm"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Now</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Date and time when the ticket was resolved
              </p>
            </div>
          )}

          {/* Resolution Notes */}
          {(formData.status === 'closed' || formData.status === 'resolved') && (
            <div className="space-y-2">
              <Label htmlFor="resolutionNotes" className="text-sm">How It Was Resolved</Label>
              <Textarea
                id="resolutionNotes"
                value={formData.resolutionNotes}
                onChange={(e) => handleChange('resolutionNotes', e.target.value)}
                placeholder="Describe how the issue was resolved..."
                rows={4}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Provide details about the resolution steps and outcome
              </p>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

