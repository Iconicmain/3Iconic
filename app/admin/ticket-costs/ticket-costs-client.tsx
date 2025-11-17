'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Trash2, RefreshCw, DollarSign, AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import { CategoryManager } from '@/components/tickets/category-manager';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TicketCost {
  ticketId: string;
  category: string;
  price: number;
  createdAt: string;
  clientName: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  total: number;
}

export default function TicketCostsClient() {
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketCosts, setTicketCosts] = useState<TicketCost[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [lastClearedDate, setLastClearedDate] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ticket-costs');
      const data = await response.json();
      
      if (response.ok) {
        setTotalCost(data.totalCost || 0);
        setTicketCount(data.ticketCount || 0);
        setTicketCosts(data.ticketCosts || []);
        setCategoryBreakdown(data.categoryBreakdown || []);
        setLastClearedDate(data.lastClearedDate || null);
      } else {
        throw new Error(data.error || 'Failed to fetch costs');
      }
    } catch (error) {
      console.error('Error fetching costs:', error);
      toast.error('Failed to load ticket costs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/ticket-costs', {
        method: 'POST',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to clear costs';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      toast.success('Ticket costs cleared successfully!');
      setClearDialogOpen(false);
      fetchCosts();
    } catch (error) {
      console.error('Error clearing costs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear costs';
      toast.error(errorMessage);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  Ticket Cost Calculator
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Calculate and track ticket costs by category
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCategoryManagerOpen(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Categories
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchCosts}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setClearDialogOpen(true)}
                  disabled={loading || ticketCount === 0}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Costs
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                        Total Tickets
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {ticketCount}
                      </p>
                    </div>
                    <Calculator className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Total Cost
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                        Ksh {totalCost.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                        Last Cleared
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100">
                        {lastClearedDate ? formatDate(lastClearedDate) : 'Never'}
                      </p>
                    </div>
                    {lastClearedDate ? (
                      <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryBreakdown.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.category}</p>
                          <p className="text-xs text-muted-foreground">{item.count} ticket(s)</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          Ksh {item.total.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ticket Details Table */}
            {ticketCosts.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket ID</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketCosts.map((ticket) => (
                          <TableRow key={ticket.ticketId}>
                            <TableCell className="font-medium">{ticket.ticketId}</TableCell>
                            <TableCell>{ticket.clientName}</TableCell>
                            <TableCell>{ticket.category}</TableCell>
                            <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Ksh {ticket.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(ticket.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              !loading && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Calculator className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No tickets found. Costs will appear here when tickets are created.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Ticket Costs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all ticket costs? This will mark all current tickets as paid
              and reset the calculation for new tickets.
              <br />
              <br />
              <span className="font-semibold text-foreground">
                Total to be cleared: Ksh {totalCost.toLocaleString()} ({ticketCount} tickets)
              </span>
              <br />
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-2 block">
                This action cannot be undone. All tickets created after clearing will be tracked separately.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              disabled={clearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {clearing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear Costs'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Manager */}
      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onCategoryAdded={() => {
          fetchCosts(); // Refresh costs when category is added/updated
        }}
      />
    </div>
  );
}

