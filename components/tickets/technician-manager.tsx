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
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Technician {
  _id?: string;
  name: string;
  createdAt?: string;
}

interface TechnicianManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTechnicianAdded?: () => void;
}

export function TechnicianManager({ open, onOpenChange, onTechnicianAdded }: TechnicianManagerProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newTechnician, setNewTechnician] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; technician: Technician | null }>({
    open: false,
    technician: null,
  });

  const fetchTechnicians = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/technicians');
      const data = await response.json();
      if (response.ok) {
        setTechnicians(data.technicians || []);
      } else {
        throw new Error(data.error || 'Failed to fetch technicians');
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to fetch technicians');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTechnicians();
    }
  }, [open]);

  const handleAddTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechnician.trim()) {
      toast.error('Technician name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/technicians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTechnician.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create technician');
      }

      toast.success('Technician added successfully!');
      setNewTechnician('');
      fetchTechnicians();
      if (onTechnicianAdded) {
        onTechnicianAdded();
      }
    } catch (error) {
      console.error('Error creating technician:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create technician');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTechnician = async () => {
    if (!deleteDialog.technician?._id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/technicians/${deleteDialog.technician._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete technician');
      }

      toast.success('Technician deleted successfully!');
      setDeleteDialog({ open: false, technician: null });
      fetchTechnicians();
      if (onTechnicianAdded) {
        onTechnicianAdded();
      }
    } catch (error) {
      console.error('Error deleting technician:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete technician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Manage Technicians
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add, view, and delete technicians
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add Technician Form */}
            <form onSubmit={handleAddTechnician} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <Label htmlFor="newTechnician" className="text-sm font-medium">
                Add New Technician
              </Label>
              <div className="flex gap-2">
                <Input
                  id="newTechnician"
                  value={newTechnician}
                  onChange={(e) => setNewTechnician(e.target.value)}
                  placeholder="Enter technician name"
                  className="flex-1 h-10 text-sm"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !newTechnician.trim()}
                  className="h-10 gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
            </form>

            {/* Technicians List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Existing Technicians ({technicians.length})
              </h3>
              {fetching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : technicians.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No technicians found. Add your first technician above.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {technicians.map((technician) => (
                    <div
                      key={technician._id || technician.name}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">{technician.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, technician })}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, technician: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technician</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.technician?.name}"? This action cannot be undone.
              <br />
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-2 block">
                Note: This will not affect existing tickets assigned to this technician.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTechnician}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

