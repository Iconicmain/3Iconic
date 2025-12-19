'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ticket {
  _id?: string;
  ticketId: string;
  clientName: string;
  clientNumber?: string;
  station: string;
  houseNumber?: string;
  category: string;
  status: 'open' | 'in-progress' | 'closed' | 'pending';
  dateTimeReported: string;
  problemDescription?: string;
  technician?: string; // For backward compatibility
  technicians?: string[]; // New field for multiple technicians
  createdAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

interface TicketViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket | null;
  onEdit?: (ticket: Ticket) => void;
  onDelete?: (ticketId: string, ticket_id?: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const statusColors = {
  open: 'bg-red-100 text-red-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
  pending: 'bg-blue-100 text-blue-800',
};

export function TicketViewDialog({ open, onOpenChange, ticket, onEdit, onDelete, canEdit = false, canDelete = false }: TicketViewDialogProps) {
  if (!ticket) return null;

  const formatDateTime = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl sm:text-2xl truncate">Ticket Details</DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm">
                Complete information for {ticket.ticketId}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={cn(statusColors[ticket.status], 'text-xs')}>
                {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Basic Information */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ticket ID</p>
                <p className="text-sm sm:text-base font-semibold break-all">{ticket.ticketId}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={cn(statusColors[ticket.status], 'mt-1 text-xs')}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </Badge>
              </div>
              <div className="border-l-2 border-blue-500 pl-3">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Client Name</p>
                <p className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 break-words">{ticket.clientName}</p>
              </div>
              {ticket.clientNumber && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Client Number</p>
                  <p className="text-sm sm:text-base break-words">{ticket.clientNumber}</p>
                </div>
              )}
              <div className="border-l-2 border-amber-500 pl-3">
                <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">Station/Location</p>
                <p className="text-sm sm:text-base font-semibold break-words">{ticket.station}</p>
              </div>
              {ticket.houseNumber && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">House Number/Barrack</p>
                  <p className="text-sm sm:text-base break-words">{ticket.houseNumber}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm sm:text-base">{ticket.category}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Assigned Technician{ticket.technicians && ticket.technicians.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm sm:text-base break-words">
                  {ticket.technicians && Array.isArray(ticket.technicians) && ticket.technicians.length > 0
                    ? ticket.technicians.join(', ')
                    : ticket.technician || 'Unassigned'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates & Timeline */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Timeline</h3>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Date & Time Reported</p>
                <p className="text-sm sm:text-base break-words">{formatDateTime(ticket.dateTimeReported)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Created At</p>
                <p className="text-sm sm:text-base break-words">{ticket.createdAt ? formatDateTime(ticket.createdAt) : formatDate(ticket.dateTimeReported)}</p>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Resolved At</p>
                  <p className="text-sm sm:text-base break-words">{formatDateTime(ticket.resolvedAt)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Problem Description */}
          {ticket.problemDescription && (
            <>
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Problem Description</h3>
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{ticket.problemDescription}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Resolution Details */}
          {ticket.resolvedAt && (
            <div className="border-l-2 border-green-500 pl-3 sm:pl-4">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-green-600 dark:text-green-400">Resolution Details</h3>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Resolved Date & Time</p>
                  <p className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400 break-words">{formatDateTime(ticket.resolvedAt)}</p>
                </div>
                {ticket.resolutionNotes && (
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">How It Was Resolved</p>
                    <div className="bg-muted/30 rounded-md p-2 sm:p-3 border border-green-200 dark:border-green-800">
                      <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{ticket.resolutionNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
            {onEdit && canEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(ticket);
                }}
                className="flex-1 sm:flex-initial gap-2"
                size="sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            {onDelete && canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this ticket?')) {
                    onDelete(ticket.ticketId, ticket._id);
                    onOpenChange(false);
                  }
                }}
                className="flex-1 sm:flex-initial gap-2"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto order-1 sm:order-2"
            size="sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

