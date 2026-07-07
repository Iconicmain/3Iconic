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
import { Edit, Trash2, Calendar, MapPin, User, Wrench, Package, Clock, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  clientName?: string;
  clientNumber?: string;
  installDate?: string;
  lastService?: string;
  installationType?: 'new-installation' | 'exchange-replacement';
  replacedEquipmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EquipmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onEdit?: (equipment: Equipment) => void;
  onDelete?: (equipment: Equipment) => void;
}

const statusColors = {
  available: 'bg-blue-100 text-blue-800',
  installed: 'bg-green-100 text-green-800',
  'in-repair': 'bg-yellow-100 text-yellow-800',
  bought: 'bg-purple-100 text-purple-800',
};

export function EquipmentViewDialog({ open, onOpenChange, equipment, onEdit, onDelete }: EquipmentViewDialogProps) {
  if (!equipment) return null;

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

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Equipment Details
              </DialogTitle>
              <DialogDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                Complete information for {equipment.equipmentId}
              </DialogDescription>
            </div>
            <Badge className={cn('text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 shrink-0', statusColors[equipment.status])}>
              {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1).replace('-', ' ')}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Equipment Information */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              Equipment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pl-5 sm:pl-7">
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Equipment ID</p>
                <p className="text-xs sm:text-sm font-bold text-purple-700 break-all">{equipment.equipmentId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Name</p>
                <p className="text-xs sm:text-sm font-semibold text-foreground break-words">{equipment.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Model</p>
                <p className="text-xs sm:text-sm text-foreground break-words">{equipment.model}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Serial Number</p>
                <p className="text-xs sm:text-sm font-mono text-foreground break-all">{equipment.serialNumber}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Installation Information (for installed equipment) */}
          {equipment.status === 'installed' && (
            <>
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Installation Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pl-5 sm:pl-7">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Station
                    </p>
                    <p className="text-sm font-semibold text-blue-700 border-l-2 border-blue-500 pl-2">
                      {equipment.station || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      Client
                    </p>
                    <div className="border-l-2 border-indigo-500 pl-2">
                      <p className="text-sm font-semibold text-indigo-700">
                        {equipment.clientName || equipment.client || 'N/A'}
                      </p>
                      {equipment.clientNumber && (
                        <p className="text-xs text-indigo-500">({equipment.clientNumber})</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Install Date
                    </p>
                    <p className="text-sm text-foreground">{formatDate(equipment.installDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Last Service
                    </p>
                    <p className="text-sm text-foreground">{formatDate(equipment.lastService)}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                      Installation Type
                    </p>
                    <div className="mt-1">
                      {equipment.installationType === 'exchange-replacement' ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-200">
                            Exchange/Replacement
                          </Badge>
                          {equipment.replacedEquipmentId && (
                            <span className="text-xs text-muted-foreground">
                              Replaced: {equipment.replacedEquipmentId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border border-green-200">
                          New Installation
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Timestamps */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              Timestamps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pl-5 sm:pl-7">
              {equipment.createdAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Created At</p>
                  <p className="text-sm text-foreground">{formatDateTime(equipment.createdAt)}</p>
                </div>
              )}
              {equipment.updatedAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Last Updated</p>
                  <p className="text-sm text-foreground">{formatDateTime(equipment.updatedAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-10 sm:h-11 text-sm"
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onEdit(equipment);
                onOpenChange(false);
              }}
              className="w-full sm:w-auto h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this equipment?')) {
                  onDelete(equipment);
                  onOpenChange(false);
                }
              }}
              className="w-full sm:w-auto h-10 sm:h-11 text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

