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

interface EquipmentTemplate {
  _id?: string;
  name: string;
  model: string;
  createdAt?: string;
}

interface EquipmentTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateAdded?: () => void;
}

export function EquipmentTemplateManager({ open, onOpenChange, onTemplateAdded }: EquipmentTemplateManagerProps) {
  const [templates, setTemplates] = useState<EquipmentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newTemplate, setNewTemplate] = useState({ name: '', model: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: EquipmentTemplate | null }>({
    open: false,
    template: null,
  });

  const fetchTemplates = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/equipment-templates');
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      } else {
        throw new Error(data.error || 'Failed to fetch equipment templates');
      }
    } catch (error) {
      console.error('Error fetching equipment templates:', error);
      toast.error('Failed to fetch equipment templates');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) {
      toast.error('Equipment name is required');
      return;
    }
    if (!newTemplate.model.trim()) {
      toast.error('Equipment model is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/equipment-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTemplate.name.trim(),
          model: newTemplate.model.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create equipment template');
      }

      toast.success('Equipment template added successfully!');
      setNewTemplate({ name: '', model: '' });
      fetchTemplates();
      if (onTemplateAdded) {
        onTemplateAdded();
      }
    } catch (error) {
      console.error('Error creating equipment template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create equipment template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteDialog.template?._id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/equipment-templates/${deleteDialog.template._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete equipment template');
      }

      toast.success('Equipment template deleted successfully!');
      setDeleteDialog({ open: false, template: null });
      fetchTemplates();
      if (onTemplateAdded) {
        onTemplateAdded();
      }
    } catch (error) {
      console.error('Error deleting equipment template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete equipment template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Manage Equipment Templates
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add common equipment names and models for quick selection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add Template Form */}
            <form onSubmit={handleAddTemplate} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <Label className="text-sm font-medium">Add New Template</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Equipment Name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="h-10 text-sm"
                  disabled={loading}
                  required
                />
                <Input
                  placeholder="Model"
                  value={newTemplate.model}
                  onChange={(e) => setNewTemplate({ ...newTemplate, model: e.target.value })}
                  className="h-10 text-sm"
                  disabled={loading}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !newTemplate.name.trim() || !newTemplate.model.trim()}
                className="w-full sm:w-auto h-10 gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Add Template</span>
              </Button>
            </form>

            {/* Templates List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Existing Templates ({templates.length})
              </h3>
              {fetching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No templates found. Add your first template above.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template._id || `${template.name}-${template.model}`}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.model}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, template })}
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
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, template: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.template?.name} - {deleteDialog.template?.model}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
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

