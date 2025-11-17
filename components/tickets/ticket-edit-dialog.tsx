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
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  _id?: string;
  ticketId: string;
  clientName: string;
  station: string;
  category: string;
  status: 'open' | 'in-progress' | 'closed' | 'pending';
  dateTimeReported: string;
  technician?: string;
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

const STATUSES = ['open', 'in-progress', 'closed', 'pending'];

export function TicketEditDialog({ open, onOpenChange, ticket, onSuccess }: TicketEditDialogProps) {
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTechnicians();
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
  const [formData, setFormData] = useState({
    status: 'open' as Ticket['status'],
    technician: '',
    resolvedAt: '',
    resolutionNotes: '',
  });

  useEffect(() => {
    if (ticket) {
      setFormData({
        status: ticket.status || 'open',
        technician: ticket.technician || '',
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
      const response = await fetch(`/api/tickets/${ticket._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: formData.status,
          technician: formData.technician || undefined,
          resolvedAt: formData.resolvedAt || undefined,
          resolutionNotes: formData.resolutionNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ticket');
      }

      toast.success('Ticket updated successfully!');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle>Edit Ticket - {ticket.ticketId}</DialogTitle>
          <DialogDescription>
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

            {/* Technician */}
            <div className="space-y-2">
              <Label htmlFor="technician" className="text-sm">Technician</Label>
              <Select
                value={formData.technician || 'unassigned'}
                onValueChange={(value) => handleChange('technician', value === 'unassigned' ? '' : value)}
              >
                <SelectTrigger id="technician" className="text-sm">
                  <SelectValue placeholder="Select Technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resolved Date */}
          {formData.status === 'closed' && (
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
          {formData.status === 'closed' && (
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

