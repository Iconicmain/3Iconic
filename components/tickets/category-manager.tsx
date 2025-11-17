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

interface Category {
  _id?: string;
  name: string;
  createdAt?: string;
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryAdded?: () => void;
}

export function CategoryManager({ open, onOpenChange, onCategoryAdded }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  });

  const fetchCategories = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
      } else {
        throw new Error(data.error || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category');
      }

      toast.success('Category added successfully!');
      setNewCategory('');
      fetchCategories();
      if (onCategoryAdded) {
        onCategoryAdded();
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteDialog.category?._id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/categories/${deleteDialog.category._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }

      toast.success('Category deleted successfully!');
      setDeleteDialog({ open: false, category: null });
      fetchCategories();
      if (onCategoryAdded) {
        onCategoryAdded();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Manage Categories
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add, view, and delete ticket categories
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <Label htmlFor="newCategory" className="text-sm font-medium">
                Add New Category
              </Label>
              <div className="flex gap-2">
                <Input
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="flex-1 h-10 text-sm"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !newCategory.trim()}
                  className="h-10 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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

            {/* Categories List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Existing Categories ({categories.length})
              </h3>
              {fetching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No categories found. Add your first category above.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {categories.map((category) => (
                    <div
                      key={category._id || category.name}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, category })}
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
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, category: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.category?.name}"? This action cannot be undone.
              <br />
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-2 block">
                Note: This will not affect existing tickets with this category.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
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

