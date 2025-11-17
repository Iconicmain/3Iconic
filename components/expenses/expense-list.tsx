'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Download, Filter, Edit, Trash2, ChevronDown, ChevronUp, Settings2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpenseCategoryManager } from './expense-category-manager';
import { ExpenseForm } from './expense-form';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Expense {
  id: string;
  description: string;
  category: string;
  station: string | null;
  amount: number;
  balance?: number; // Remaining balance for partially paid expenses
  date: string;
  status: 'fully-paid' | 'partially-paid';
}

const statusColors = {
  'fully-paid': 'bg-green-600 text-white dark:bg-green-700',
  'partially-paid': 'bg-purple-500 text-white dark:bg-purple-600',
};

const SUMMARY_COLLAPSED_KEY = 'expense_summary_collapsed';

// Helper function to check if a date is in the current month
const isCurrentMonth = (dateString: string): boolean => {
  const expenseDate = new Date(dateString);
  const now = new Date();
  return expenseDate.getMonth() === now.getMonth() && 
         expenseDate.getFullYear() === now.getFullYear();
};

export function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    dateFrom: '',
    dateTo: '',
    month: '',
    status: 'all',
  });
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SUMMARY_COLLAPSED_KEY);
    if (saved === 'true') {
      setIsSummaryCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SUMMARY_COLLAPSED_KEY, String(isSummaryCollapsed));
    }
  }, [isSummaryCollapsed, mounted]);

  // Fetch expenses from API
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      } else {
        console.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Fetch expense categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/expense-categories');
        const data = await response.json();
        if (response.ok) {
          const fetchedCategories = data.categories?.map((cat: { name: string }) => cat.name) || [];
          setCategories(fetchedCategories);
          
          // If no categories exist, seed them
          if (fetchedCategories.length === 0) {
            await seedCategories();
          }
        }
      } catch (error) {
        console.error('Error fetching expense categories:', error);
      }
    };

    const seedCategories = async () => {
      try {
        const response = await fetch('/api/expense-categories/seed', {
          method: 'POST',
        });
        if (response.ok) {
          // Refresh categories after seeding
          await fetchCategories();
        }
      } catch (error) {
        console.error('Error seeding expense categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const toggleSummaryCollapse = () => {
    setIsSummaryCollapsed(!isSummaryCollapsed);
  };

  const handleCategoryAdded = () => {
    // Refresh expense categories when a new one is added
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/expense-categories');
        const data = await response.json();
        if (response.ok) {
          const fetchedCategories = data.categories?.map((cat: { name: string }) => cat.name) || [];
          setCategories(fetchedCategories);
        }
      } catch (error) {
        console.error('Error fetching expense categories:', error);
      }
    };
    fetchCategories();
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseFormOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;

    try {
      const response = await fetch(`/api/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete expense');
      }

      toast.success('Expense deleted successfully!');
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    }
  };

  const handleFormClose = () => {
    setExpenseFormOpen(false);
    setSelectedExpense(null);
  };

  const handleExport = () => {
    // Get all expenses (not just filtered monthly ones)
    let expensesToExport = expenses;

    // Apply filters
    if (exportFilters.status !== 'all') {
      expensesToExport = expensesToExport.filter(exp => exp.status === exportFilters.status);
    }

    // Filter by date range
    if (exportFilters.dateFrom) {
      const fromDate = new Date(exportFilters.dateFrom);
      expensesToExport = expensesToExport.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= fromDate;
      });
    }

    if (exportFilters.dateTo) {
      const toDate = new Date(exportFilters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      expensesToExport = expensesToExport.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate <= toDate;
      });
    }

    // Filter by month
    if (exportFilters.month) {
      const [year, month] = exportFilters.month.split('-');
      expensesToExport = expensesToExport.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === parseInt(year) && 
               expDate.getMonth() === parseInt(month) - 1;
      });
    }

    // Convert to CSV
    const headers = ['ID', 'Description', 'Category', 'Station', 'Amount (Ksh)', 'Date', 'Status'];
    const csvRows = [
      headers.join(','),
      ...expensesToExport.map(exp => [
        exp.id,
        `"${exp.description.replace(/"/g, '""')}"`,
        exp.category,
        exp.station || 'General',
        exp.amount,
        exp.date,
        exp.status === 'fully-paid' ? 'Fully Paid' : 'Partially Paid',
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename
    let filename = 'expenses';
    if (exportFilters.month) {
      const [year, month] = exportFilters.month.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      filename = `expenses_${monthNames[parseInt(month) - 1]}_${year}`;
    } else if (exportFilters.dateFrom && exportFilters.dateTo) {
      filename = `expenses_${exportFilters.dateFrom}_to_${exportFilters.dateTo}`;
    } else if (exportFilters.dateFrom) {
      filename = `expenses_from_${exportFilters.dateFrom}`;
    }
    if (exportFilters.status !== 'all') {
      filename += `_${exportFilters.status}`;
    }
    filename += '.csv';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${expensesToExport.length} expenses to ${filename}`);
    setExportDialogOpen(false);
    // Reset filters
    setExportFilters({
      dateFrom: '',
      dateTo: '',
      month: '',
      status: 'all',
    });
  };

  // Filter expenses by current month first
  const monthlyExpenses = expenses.filter((expense) => isCurrentMonth(expense.date));

  const filtered = monthlyExpenses.filter((expense) => {
    const matchesSearch = expense.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.station && expense.station.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalAmount = filtered.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground mt-1">Track and manage expenses</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 w-full sm:w-auto"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            onClick={() => {
              setSelectedExpense(null);
              setExpenseFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
              >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <div className="border-t border-border mt-1 pt-1 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryManagerOpen(true);
                        // Reset the select value
                        setCategoryFilter('all');
                      }}
                      className="flex items-center gap-2 w-full text-left text-sm text-primary font-medium hover:text-primary/80 cursor-pointer py-1.5 px-2 rounded-sm hover:bg-accent"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Category</span>
                    </button>
                  </div>
              </SelectContent>
            </Select>
              <Button
                variant="outline"
                onClick={() => setCategoryManagerOpen(true)}
                className="shrink-0 gap-2"
                title="Manage Categories"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Manage</span>
              </Button>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="fully-paid">Fully Paid</SelectItem>
                <SelectItem value="partially-paid">Partially Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expense Category Manager Dialog */}
      <ExpenseCategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onCategoryAdded={handleCategoryAdded}
      />

      {/* Expense Form Dialog */}
      <ExpenseForm
        open={expenseFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={() => {
          fetchExpenses();
          handleFormClose();
        }}
        expense={selectedExpense}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete expense "{expenseToDelete?.id}: {expenseToDelete?.description}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Expenses</DialogTitle>
            <DialogDescription>
              Choose filters for exporting expenses to CSV
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="export-status">Status</Label>
              <Select
                value={exportFilters.status}
                onValueChange={(value) => setExportFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="export-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="fully-paid">Fully Paid</SelectItem>
                  <SelectItem value="partially-paid">Partially Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="space-y-2">
              <Label htmlFor="export-month">Month (Optional)</Label>
              <Input
                id="export-month"
                type="month"
                value={exportFilters.month}
                onChange={(e) => {
                  setExportFilters(prev => ({ 
                    ...prev, 
                    month: e.target.value,
                    dateFrom: '', // Clear date range when month is selected
                    dateTo: '',
                  }));
                }}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range (Optional - leave blank if using month)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="export-from" className="text-xs text-muted-foreground">From</Label>
                  <Input
                    id="export-from"
                    type="date"
                    value={exportFilters.dateFrom}
                    onChange={(e) => {
                      setExportFilters(prev => ({ 
                        ...prev, 
                        dateFrom: e.target.value,
                        month: '', // Clear month when date range is selected
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="export-to" className="text-xs text-muted-foreground">To</Label>
                  <Input
                    id="export-to"
                    type="date"
                    value={exportFilters.dateTo}
                    onChange={(e) => {
                      setExportFilters(prev => ({ 
                        ...prev, 
                        dateTo: e.target.value,
                        month: '', // Clear month when date range is selected
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Card - Collapsible */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-6 pt-6 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">Monthly Summary</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Current month expenses overview</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSummaryCollapse}
            className="gap-2 text-gray-600 hover:text-gray-900 shrink-0 self-start sm:self-auto"
          >
            {isSummaryCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Show Summary</span>
                <span className="sm:hidden">Show</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">Hide Summary</span>
                <span className="sm:hidden">Hide</span>
              </>
            )}
          </Button>
        </div>
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isSummaryCollapsed ? "max-h-0 opacity-0" : "max-h-[200px] opacity-100"
        )}>
          <CardContent className="pt-2 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">Ksh {totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-left sm:text-right bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-muted-foreground mb-1">Matching Entries</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{filtered.length}</p>
            </div>
          </div>
        </CardContent>
        </div>
      </Card>

      {/* Table - Responsive Card View on Mobile, Table on Desktop */}
      <div className="space-y-3 sm:space-y-0">
        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {filtered.map((expense) => (
            <Card key={expense.id} className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-md">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-foreground">{expense.id}</p>
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-md inline-block mt-1">
                        {expense.description}
                      </p>
                    </div>
                    <span className={cn('inline-block px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap shadow-sm', statusColors[expense.status])} style={{ color: '#ffffff', backgroundColor: expense.status === 'fully-paid' ? '#16a34a' : '#a855f7' }}>
                      {expense.status === 'fully-paid' ? 'Fully Paid' : 'Partially Paid'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Category</p>
                      <p className="text-foreground font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-md inline-block text-xs">
                        {expense.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Station</p>
                      <p className="text-foreground font-medium">{expense.station || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Amount</p>
                      <div className="flex flex-col">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-md inline-block border-2 border-emerald-300 dark:border-emerald-700">
                          Ksh {expense.amount.toLocaleString()}
                        </p>
                        {expense.status === 'partially-paid' && expense.balance !== undefined && (
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 ml-0.5">
                            Bal: Ksh {expense.balance.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="text-foreground font-medium">{expense.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => handleEdit(expense)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(expense)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <Card className="bg-white overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Station</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{expense.id}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-md inline-block">
                        {expense.description}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-md inline-block">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {expense.station || <span className="text-muted-foreground italic">General</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wide">
                          Ksh {expense.amount.toLocaleString()}
                        </span>
                        {expense.status === 'partially-paid' && expense.balance !== undefined && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                            Bal: Ksh {expense.balance.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-block px-2.5 py-1 rounded-md text-xs font-bold shadow-sm', statusColors[expense.status])} style={{ color: '#ffffff', backgroundColor: expense.status === 'fully-paid' ? '#16a34a' : '#a855f7' }}>
                        {expense.status === 'fully-paid' ? 'Fully Paid' : 'Partially Paid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{expense.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(expense)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
