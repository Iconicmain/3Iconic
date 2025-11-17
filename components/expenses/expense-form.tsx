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
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ExpenseCategoryManager } from './expense-category-manager';

interface Expense {
  id: string;
  description: string;
  category: string;
  station: string | null;
  amount: number;
  balance?: number;
  date: string;
  status: 'fully-paid' | 'partially-paid';
}

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  expense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, onSuccess, expense }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [fetchingStations, setFetchingStations] = useState(true);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    station: '',
    amount: '',
    balance: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    status: 'partially-paid' as 'fully-paid' | 'partially-paid',
  });

  const fetchCategories = async () => {
    try {
      setFetchingCategories(true);
      const response = await fetch('/api/expense-categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories?.map((cat: { name: string }) => cat.name) || []);
      }
    } catch (error) {
      console.error('Error fetching expense categories:', error);
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
        const fetchedStations = data.stations?.map((station: { name: string }) => station.name) || [];
        setStations(fetchedStations);
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
      // Set form data based on whether we're editing or creating
      if (expense) {
        setFormData({
          description: expense.description,
          category: expense.category,
          station: expense.station || '__general__',
          amount: expense.amount.toString(),
          balance: expense.balance?.toString() || '',
          date: expense.date,
          status: expense.status,
        });
      } else {
        // Reset form when creating new
        setFormData({
          description: '',
          category: '',
          station: '__general__',
          amount: '',
          balance: '',
          date: new Date().toISOString().split('T')[0],
          status: 'partially-paid',
        });
      }
    }
  }, [open, expense]);

  const handleCategoryAdded = () => {
    // Refresh categories when a new one is added
    fetchCategories();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields (station is optional)
      if (!formData.description.trim() || !formData.category || !formData.amount || !formData.date) {
        toast.error('Please fill in all required fields (Description, Category, Amount, Date)');
        setLoading(false);
        return;
      }

      // Validate amount is a positive number
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        setLoading(false);
        return;
      }

      const url = expense ? `/api/expenses/${expense.id}` : '/api/expenses';
      const method = expense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description.trim(),
          category: formData.category,
          station: formData.station && formData.station !== '__general__' ? formData.station : null,
          amount: amount,
          balance: formData.balance && formData.status === 'partially-paid' ? parseFloat(formData.balance) : undefined,
          date: formData.date,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${expense ? 'update' : 'create'} expense`);
      }

      toast.success(`Expense ${expense ? 'updated' : 'created'} successfully!`);
      setFormData({
        description: '',
        category: '',
        station: '__general__',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'partially-paid',
      });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-[95vw] md:w-full mx-1 sm:mx-2 md:mx-0 p-4 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            {expense ? 'Update the expense information' : 'Fill in all the required fields to create a new expense'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Expense Information Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-1 h-4 sm:h-5 bg-blue-500 rounded-full"></div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Expense Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Description */}
              <div className="sm:col-span-2">
                <Label htmlFor="description" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <span className="text-red-500 font-bold text-base">*</span>
                  <span className="font-bold">Description</span>
                  <span className="text-xs text-muted-foreground font-normal">(Required)</span>
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="e.g., Payment of customer care, Equipment purchase..."
                  className="mt-1 h-11 text-sm border-2 border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 shadow-sm bg-blue-50/50 dark:bg-blue-950/20"
                  required
                  disabled={loading}
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <span className="text-red-500 font-bold text-base">*</span>
                  <span className="font-bold">Category</span>
                  <span className="text-xs text-muted-foreground font-normal">(Required)</span>
                </Label>
                {fetchingCategories ? (
                  <div className="mt-1 h-11 flex items-center justify-center border rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1 h-11 text-sm border-2 border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 shadow-sm bg-blue-50/50 dark:bg-blue-950/20 font-medium">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))
                      )}
                      <div className="border-t border-border mt-1 pt-1 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryManagerOpen(true);
                          }}
                          className="flex items-center gap-2 w-full text-left text-sm text-primary font-medium hover:text-primary/80 cursor-pointer py-1.5 px-2 rounded-sm hover:bg-accent"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Category</span>
                        </button>
                      </div>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Station */}
              <div>
                <Label htmlFor="station" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  Station
                  <span className="text-xs text-muted-foreground font-normal">(Optional - for general expenses)</span>
                </Label>
                {fetchingStations ? (
                  <div className="mt-1 h-10 flex items-center justify-center border rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    value={formData.station || '__general__'}
                    onValueChange={(value) => handleChange('station', value === '__general__' ? '' : value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1 h-11 text-sm">
                      <SelectValue placeholder="Select station (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__general__">General (No Station)</SelectItem>
                      {stations.length > 0 && stations.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="amount" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <span className="text-red-500 font-bold">*</span>
                  Amount (Ksh)
                  <span className="text-xs text-muted-foreground font-normal">(Required)</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="mt-1 h-10 text-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-semibold"
                  required
                  disabled={loading}
                />
              </div>

              {/* Balance - Only show for partially paid */}
              {formData.status === 'partially-paid' && (
                <div>
                  <Label htmlFor="balance" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    Balance (Ksh)
                    <span className="text-xs text-muted-foreground font-normal">(Remaining amount)</span>
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.balance}
                    onChange={(e) => handleChange('balance', e.target.value)}
                    placeholder="0.00"
                    className="mt-1 h-10 text-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <Label htmlFor="date" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <span className="text-red-500 font-bold">*</span>
                  Date
                  <span className="text-xs text-muted-foreground font-normal">(Required)</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="mt-1 h-10 text-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={loading}
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status" className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <span className="font-bold">Status</span>
                  <span className="text-xs text-muted-foreground font-normal">(Payment Status)</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value as 'fully-paid' | 'partially-paid')}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1 h-11 text-sm border-2 border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-300 shadow-sm bg-purple-50/50 dark:bg-purple-950/20 font-medium">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partially-paid">Partially Paid</SelectItem>
                    <SelectItem value="fully-paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.description.trim() || !formData.category || !formData.amount || !formData.date}
              className="w-full sm:w-auto h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {expense ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                expense ? 'Update Expense' : 'Create Expense'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Expense Category Manager Dialog */}
      <ExpenseCategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onCategoryAdded={handleCategoryAdded}
      />
    </Dialog>
  );
}

