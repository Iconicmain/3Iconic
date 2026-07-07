'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Clock,
  MapPin,
  User,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  TicketEquipmentUsageSection,
  buildEquipmentPayload,
  validateEquipmentRows,
  type EquipmentUsageFormRow,
  type IssuedEquipmentOption,
} from './ticket-equipment-usage-section';

interface Ticket {
  _id?: string;
  ticketId: string;
  clientName: string;
  station: string;
  category: string;
  status: 'open' | 'in-progress' | 'closed' | 'pending' | 'resolved';
  dateTimeReported: string;
  technician?: string;
  technicians?: string[];
  createdAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  equipmentUsedEnabled?: boolean;
}

interface TicketEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket | null;
  onSuccess?: () => void;
}

const STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'pending'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  'in-progress': 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
  pending: 'bg-violet-100 text-violet-800 border-violet-200',
};

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: typeof FileText;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      <div className="flex items-start gap-2.5 px-4 py-3 border-b bg-muted/30">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

export function TicketEditDialog({ open, onOpenChange, ticket, onSuccess }: TicketEditDialogProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [equipmentEnabled, setEquipmentEnabled] = useState(false);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentUsageFormRow[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<IssuedEquipmentOption[]>([]);

  const handleOptionsChange = useCallback((opts: IssuedEquipmentOption[]) => {
    setEquipmentOptions(opts);
  }, []);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories?.map((cat: { name: string }) => cat.name) || []);
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

  useEffect(() => {
    if (ticket) {
      let techniciansArray: string[] = [];
      if (ticket.technicians && Array.isArray(ticket.technicians)) {
        techniciansArray = ticket.technicians;
      } else if (ticket.technician) {
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
      setEquipmentEnabled(false);
      setEquipmentRows([]);
      setEquipmentOptions([]);
    }
  }, [ticket]);

  const isResolvedStatus = formData.status === 'resolved';
  const showResolutionFields = formData.status === 'closed' || formData.status === 'resolved';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket?._id) return;

    if (equipmentEnabled && isResolvedStatus && equipmentRows.some((r) => r.optionKey)) {
      const validationError = validateEquipmentRows(equipmentRows, equipmentOptions);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    setLoading(true);

    try {
      const updatePayload: Record<string, unknown> = {};

      if (formData.status !== (ticket.status || 'open')) {
        updatePayload.status = formData.status;
      }
      if (formData.category && formData.category !== (ticket.category || '')) {
        updatePayload.category = formData.category;
      }

      const currentResolvedAt = ticket.resolvedAt
        ? new Date(ticket.resolvedAt).toISOString().slice(0, 16)
        : '';
      if (formData.resolvedAt !== currentResolvedAt) {
        updatePayload.resolvedAt = formData.resolvedAt || undefined;
      }
      if (formData.resolutionNotes !== (ticket.resolutionNotes || '')) {
        updatePayload.resolutionNotes = formData.resolutionNotes || undefined;
      }

      if (isResolvedStatus && equipmentEnabled && equipmentRows.some((r) => r.optionKey)) {
        updatePayload.equipmentUsedEnabled = true;
        updatePayload.equipmentUsed = buildEquipmentPayload(equipmentRows, equipmentOptions);
      }

      if (Object.keys(updatePayload).length === 0) {
        toast.info('No changes to save');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/tickets/${ticket._id}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to update ticket: ${response.status}`);
      }

      toast.success('Ticket updated successfully!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ticket';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const assignedTechnicians =
    formData.technicians.length > 0
      ? formData.technicians
      : ['Unassigned'];

  const setResolvedNow = () => {
    const now = new Date();
    const dateTimeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    handleChange('resolvedAt', dateTimeString);
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0 bg-gradient-to-br from-slate-50 to-background dark:from-slate-900/40">
          <div className="flex flex-wrap items-start justify-between gap-2 pr-6">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                Edit ticket
                <Badge variant="outline" className="font-mono text-xs font-normal">
                  {ticket.ticketId}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {ticket.clientName}
              </DialogDescription>
            </div>
            <Badge
              className={cn(
                'capitalize shrink-0 border',
                STATUS_COLORS[formData.status] || STATUS_COLORS.open
              )}
            >
              {formData.status.replace('-', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{ticket.station}</span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <SectionCard title="Status & assignment" description="Update workflow and technicians" icon={User}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-medium">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-medium">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger id="category" className="h-9">
                      <SelectValue placeholder="Select category" />
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

              <div className="space-y-2">
                <Label className="text-xs font-medium">Assigned technicians</Label>
                <div className="flex flex-wrap gap-1.5">
                  {assignedTechnicians.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="px-2 py-0.5 text-xs font-normal"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            </SectionCard>

            {showResolutionFields && (
              <SectionCard
                title="Resolution"
                description="When and how this ticket was closed out"
                icon={CheckCircle2}
              >
                <div className="space-y-2">
                  <Label htmlFor="resolvedAt" className="text-xs font-medium">
                    Resolved date & time
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="resolvedAt"
                      type="datetime-local"
                      value={formData.resolvedAt}
                      onChange={(e) => handleChange('resolvedAt', e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={setResolvedNow}
                      className="shrink-0 gap-1.5 h-9"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Now
                    </Button>
                  </div>
                </div>

                {isResolvedStatus && (
                  <TicketEquipmentUsageSection
                    enabled={equipmentEnabled}
                    onEnabledChange={setEquipmentEnabled}
                    rows={equipmentRows}
                    onRowsChange={setEquipmentRows}
                    stationName={ticket.station}
                    technicianNames={formData.technicians}
                    ticketId={ticket.ticketId}
                    onOptionsChange={handleOptionsChange}
                  />
                )}

                <div className="space-y-2">
                  <Label htmlFor="resolutionNotes" className="text-xs font-medium">
                    How it was resolved
                  </Label>
                  <Textarea
                    id="resolutionNotes"
                    value={formData.resolutionNotes}
                    onChange={(e) => handleChange('resolutionNotes', e.target.value)}
                    placeholder="Describe the resolution steps and outcome…"
                    rows={4}
                    className="text-sm resize-none min-h-[96px]"
                  />
                </div>
              </SectionCard>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-5 py-3 bg-muted/20 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
