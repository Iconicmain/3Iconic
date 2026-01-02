'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Trash2, RefreshCw, DollarSign, AlertCircle, CheckCircle2, Settings, History, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  _id?: string;
  ticketId: string;
  category: string;
  price: number;
  technicians?: string[];
  technicianCount?: number;
  pricePerTechnician?: number;
  createdAt: string;
  clientName: string;
  paid?: boolean;
  paidAt?: string;
}

interface TechnicianBreakdown {
  technician: string;
  count: number;
  total: number;
  percentage?: string;
}

interface PaymentHistory {
  _id?: string;
  paymentDate: string;
  totalAmount: number;
  ticketCount: number;
  tickets: Array<{
    ticketId: string;
    category: string;
    price: number;
    technicians?: string[];
    technicianCount?: number;
    pricePerTechnician?: number;
    clientName: string;
    station?: string;
  }>;
  technicianBreakdown?: TechnicianBreakdown[];
  categoryBreakdown?: TechnicianBreakdown[]; // For backward compatibility
  clearedBy: string;
  clearedByName?: string;
  createdAt: string;
}

export default function TicketCostsClient() {
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketCosts, setTicketCosts] = useState<TicketCost[]>([]);
  const [technicianBreakdown, setTechnicianBreakdown] = useState<TechnicianBreakdown[]>([]);
  const [lastClearedDate, setLastClearedDate] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [exportStatusFilter, setExportStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('all');

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ticket-costs');
      const data = await response.json();
      
      if (response.ok) {
        setTotalCost(data.totalCost || 0);
        setTicketCount(data.ticketCount || 0);
        setTicketCosts(data.ticketCosts || []);
        setTechnicianBreakdown(data.technicianBreakdown || []);
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

  const fetchPaymentHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch('/api/ticket-costs/history');
      const data = await response.json();
      
      if (response.ok) {
        setPaymentHistory(data.paymentHistory || []);
      } else {
        throw new Error(data.error || 'Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCosts();
    fetchPaymentHistory();
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
      fetchPaymentHistory(); // Refresh payment history
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

  const handleExportPayment = (payment: PaymentHistory) => {
    try {
      if (!payment?.tickets || payment.tickets.length === 0) {
        toast.info('No tickets in this paid batch to export.');
        return;
      }

      const headers = ['Ticket ID', 'Client Name', 'Category', 'Technicians', 'Price (Ksh)', 'Price per Technician (Ksh)', 'Station'];
      const csvRows = [
        headers.join(','),
        ...payment.tickets.map(ticket => [
          ticket.ticketId,
          `"${(ticket.clientName || '').replace(/"/g, '""')}"`,
          ticket.category,
          ticket.technicians && ticket.technicians.length > 0 ? `"${ticket.technicians.join(', ')}"` : 'Unassigned',
          ticket.price,
          ticket.pricePerTechnician ? ticket.pricePerTechnician.toFixed(2) : ticket.price,
          ticket.station || 'N/A',
        ].join(','))
      ];

      // Add summary
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Payment Date,${formatDate(payment.paymentDate)}`);
      csvRows.push(`Total Tickets,${payment.ticketCount}`);
      csvRows.push(`Total Amount (Ksh),${payment.totalAmount.toLocaleString()}`);
      csvRows.push(`Cleared By,${payment.clearedByName || payment.clearedBy}`);

      // Technician breakdown
      const breakdown = payment.technicianBreakdown || payment.categoryBreakdown || [];
      if (breakdown.length > 0) {
        csvRows.push('');
        csvRows.push('Technician Breakdown');
        csvRows.push('Note: Individual technicians show their split earnings. "Both" shows the full amount for tickets worked on by multiple technicians.');
        csvRows.push('Technician,Count,Total (Ksh),Notes');
        breakdown
          .sort((a: TechnicianBreakdown, b: TechnicianBreakdown) => {
            // Sort "Both" to the end, then alphabetically
            if (a.technician === 'Both') return 1;
            if (b.technician === 'Both') return -1;
            if (a.technician === 'Unassigned') return 1;
            if (b.technician === 'Unassigned') return -1;
            return a.technician.localeCompare(b.technician);
          })
          .forEach((item: TechnicianBreakdown) => {
            const notes = item.technician === 'Both' 
              ? 'Tickets worked on by multiple technicians (full amount)' 
              : item.technician === 'Unassigned'
              ? 'Tickets with no assigned technicians'
              : 'Individual earnings (split amount)';
            csvRows.push(`${item.technician},${item.count},${item.total.toLocaleString()},"${notes}"`);
          });
      }

      const csvContent = csvRows.join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const filename = buildFilename(`payment-${payment.paymentDate.split('T')[0] || 'batch'}`);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported payment batch: ${filename}`);
    } catch (error) {
      console.error('Error exporting payment:', error);
      toast.error('Failed to export payment batch');
    }
  };

  const buildFilename = (base: string) => {
    const now = new Date();
    return `${base}_${now.toISOString().split('T')[0]}.csv`;
  };

  const handleExportExcel = (status: 'all' | 'paid' | 'unpaid' = 'all', paymentId?: string) => {
    try {
      // If a specific paid batch is requested, export that payment batch
      if (status === 'paid' && paymentId) {
        const payment = paymentHistory.find((p) => p._id === paymentId);
        if (payment) {
          handleExportPayment(payment);
          return;
        }
      }

      // Create CSV content (Excel can open CSV files)
      const headers = ['Ticket ID', 'Client Name', 'Category', 'Technicians', 'Price (Ksh)', 'Price per Technician (Ksh)', 'Status', 'Paid Date', 'Created Date'];
      
      // Filter by status
      const ticketsToExport = ticketCosts.filter((t) => {
        if (status === 'paid') return t.paid;
        if (status === 'unpaid') return !t.paid;
        return true;
      });

      if (ticketsToExport.length === 0) {
        toast.info(
          status === 'paid'
            ? 'No paid tickets to export.'
            : status === 'unpaid'
              ? 'No unpaid tickets to export.'
              : 'No tickets to export.'
        );
        return;
      }

      const csvRows = [
        headers.join(','),
        ...ticketsToExport.map(ticket => [
          ticket.ticketId,
          `"${(ticket.clientName || '').replace(/"/g, '""')}"`,
          ticket.category,
          ticket.technicians && ticket.technicians.length > 0 ? `"${ticket.technicians.join(', ')}"` : 'Unassigned',
          ticket.price,
          ticket.pricePerTechnician ? ticket.pricePerTechnician.toFixed(2) : ticket.price,
          ticket.paid ? 'Paid' : 'Unpaid',
          ticket.paidAt ? new Date(ticket.paidAt).toLocaleDateString('en-US') : 'N/A',
          new Date(ticket.createdAt).toLocaleDateString('en-US'),
        ].join(','))
      ];

      // Add summary rows
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Total Tickets,${ticketCount}`);
      csvRows.push(`Total Cost (Ksh),${totalCost.toLocaleString()}`);
      csvRows.push(`Last Cleared,${lastClearedDate ? formatDate(lastClearedDate) : 'Never'}`);
      
      // Add technician breakdown
      if (technicianBreakdown.length > 0) {
        csvRows.push('');
        csvRows.push('Technician Breakdown');
        csvRows.push('Note: Individual technicians show their split earnings. "Both" shows the full amount for tickets worked on by multiple technicians.');
        csvRows.push('Technician,Count,Total (Ksh),Notes');
        technicianBreakdown
          .sort((a, b) => {
            // Sort "Both" to the end, then alphabetically
            if (a.technician === 'Both') return 1;
            if (b.technician === 'Both') return -1;
            if (a.technician === 'Unassigned') return 1;
            if (b.technician === 'Unassigned') return -1;
            return a.technician.localeCompare(b.technician);
          })
          .forEach(tech => {
            const notes = tech.technician === 'Both' 
              ? 'Tickets worked on by multiple technicians (full amount)' 
              : tech.technician === 'Unassigned'
              ? 'Tickets with no assigned technicians'
              : 'Individual earnings (split amount)';
            csvRows.push(`${tech.technician},${tech.count},${tech.total.toLocaleString()},"${notes}"`);
          });
      }

      const csvContent = csvRows.join('\n');
      
      // Create BOM for UTF-8 Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with current date
      const filename = buildFilename(status === 'all' ? 'ticket-costs' : `ticket-costs-${status}`);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${ticketCosts.length} tickets to ${filename}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    }
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
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setCategoryManagerOpen(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Categories
                </Button>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={exportStatusFilter}
                    onValueChange={(value) => {
                      setExportStatusFilter(value as 'all' | 'paid' | 'unpaid');
                      // Reset batch selection when changing filter
                      setSelectedPaymentId('');
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Export filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>

                  {exportStatusFilter === 'paid' && (
                    <Select
                      value={selectedPaymentId}
                      onValueChange={(value) => setSelectedPaymentId(value)}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select paid batch (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All paid</SelectItem>
                        {paymentHistory
                          .filter((p) => p._id)
                          .map((payment) => (
                            <SelectItem key={payment._id} value={payment._id!}>
                              {formatDate(payment.paymentDate)} — {payment.ticketCount} tickets
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="outline"
                    onClick={() =>
                      handleExportExcel(
                        exportStatusFilter,
                        selectedPaymentId === 'all' ? undefined : selectedPaymentId
                      )
                    }
                    disabled={loading || ticketCosts.length === 0}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel
                  </Button>
                </div>
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

            {/* Technician Breakdown */}
            {technicianBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown by Technician</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {technicianBreakdown
                      .sort((a, b) => {
                        // Sort order: Frank, Jilo, Unassigned, then "Both - Frank", "Both - Jilo", then others alphabetically
                        const order: { [key: string]: number } = {
                          'Frank': 1,
                          'Jilo': 2,
                          'Unassigned': 3,
                          'Both - Frank': 4,
                          'Both - Jilo': 5,
                        };
                        const aOrder = order[a.technician] || 10;
                        const bOrder = order[b.technician] || 10;
                        if (aOrder !== bOrder) return aOrder - bOrder;
                        return a.technician.localeCompare(b.technician);
                      })
                      .map((item) => {
                        const isBothSection = item.technician.startsWith('Both -');
                        return (
                          <div
                            key={item.technician}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isBothSection
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {item.technician === 'Frank' ? 'FRANK' : 
                                 item.technician === 'Jilo' ? 'JILO' : 
                                 item.technician === 'Both - Frank' ? 'FRANK (BOTH)' : 
                                 item.technician === 'Both - Jilo' ? 'JILO (BOTH)' : 
                                 item.technician === 'Unassigned' ? 'UNASSIGNED' : 
                                 item.technician}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.count} ticket{item.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                isBothSection
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                Ksh {item.total.toLocaleString()}
                              </p>
                              {item.percentage && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.percentage}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment History</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowHistory(!showHistory);
                      if (!showHistory && paymentHistory.length === 0) {
                        fetchPaymentHistory();
                      }
                    }}
                    className="gap-2"
                  >
                    {showHistory ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide History
                      </>
                    ) : (
                      <>
                        <History className="w-4 h-4" />
                        Show History
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {showHistory && (
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : paymentHistory.length > 0 ? (
                    <div className="space-y-4">
                      {paymentHistory.map((payment) => (
                        <div
                          key={payment._id}
                          className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div>
                              <p className="font-semibold text-sm">
                                Payment Date: {formatDate(payment.paymentDate)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Cleared by: {payment.clearedByName || payment.clearedBy}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                Ksh {payment.totalAmount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {payment.ticketCount} ticket(s)
                              </p>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => handleExportPayment(payment)}
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                                Export
                              </Button>
                            </div>
                          </div>
                          
                          {/* Technician Breakdown */}
                          {(payment.technicianBreakdown && payment.technicianBreakdown.length > 0) || 
                           (payment.categoryBreakdown && payment.categoryBreakdown.length > 0) ? (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Technician Breakdown:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(payment.technicianBreakdown || payment.categoryBreakdown || [])
                                  .sort((a: TechnicianBreakdown, b: TechnicianBreakdown) => {
                                    // Sort order: Frank, Jilo, Unassigned, then "Both - Frank", "Both - Jilo", then others alphabetically
                                    const order: { [key: string]: number } = {
                                      'Frank': 1,
                                      'Jilo': 2,
                                      'Unassigned': 3,
                                      'Both - Frank': 4,
                                      'Both - Jilo': 5,
                                    };
                                    const aOrder = order[a.technician] || 10;
                                    const bOrder = order[b.technician] || 10;
                                    if (aOrder !== bOrder) return aOrder - bOrder;
                                    return a.technician.localeCompare(b.technician);
                                  })
                                  .map((item: TechnicianBreakdown) => {
                                    const isBothSection = item.technician.startsWith('Both -');
                                    return (
                                      <div
                                        key={item.technician}
                                        className={`flex items-center justify-between text-xs p-2 rounded ${
                                          isBothSection
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                            : 'bg-white dark:bg-slate-800'
                                        }`}
                                      >
                                        <span className={isBothSection ? 'font-semibold text-blue-700 dark:text-blue-300' : ''}>
                                          {item.technician === 'Frank' ? 'FRANK' : 
                                           item.technician === 'Jilo' ? 'JILO' : 
                                           item.technician === 'Both - Frank' ? 'FRANK (BOTH)' : 
                                           item.technician === 'Both - Jilo' ? 'JILO (BOTH)' : 
                                           item.technician === 'Unassigned' ? 'UNASSIGNED' : 
                                           item.technician}
                                        </span>
                                        <div className="text-right">
                                          <span className={`font-medium ${
                                            isBothSection
                                              ? 'text-blue-600 dark:text-blue-400'
                                              : ''
                                          }`}>
                                            {item.count} ticket{item.count !== 1 ? 's' : ''} - Ksh {item.total.toLocaleString()}
                                          </span>
                                          {item.percentage && (
                                            <span className="text-xs text-muted-foreground block mt-0.5">
                                              {item.percentage}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : null}

                          {/* Ticket List */}
                          {payment.tickets && payment.tickets.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                                View Tickets ({payment.tickets.length})
                              </summary>
                              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                {payment.tickets.map((ticket, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs p-2 bg-white dark:bg-slate-800 rounded"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span>
                                        {ticket.ticketId} - {ticket.clientName}
                                        {ticket.station && ` (${ticket.station})`}
                                      </span>
                                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        Ksh {ticket.price.toLocaleString()}
                                      </span>
                                    </div>
                                    {ticket.technicians && ticket.technicians.length > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        Technicians: {ticket.technicians.join(', ')}
                                        {ticket.pricePerTechnician && (
                                          <span className="ml-1">
                                            (Ksh {ticket.pricePerTechnician.toFixed(2)} each)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No payment history found</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

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
                          <TableHead>Technicians</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketCosts.map((ticket, index) => (
                          <TableRow key={ticket._id || `${ticket.ticketId}-${index}`}>
                            <TableCell className="font-medium">{ticket.ticketId}</TableCell>
                            <TableCell>{ticket.clientName}</TableCell>
                            <TableCell>{ticket.category}</TableCell>
                            <TableCell className="text-sm">
                              {ticket.technicians && ticket.technicians.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {ticket.technicians.map((tech, idx) => (
                                    <span key={idx} className="inline-block">
                                      {tech}
                                      {ticket.pricePerTechnician && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          (Ksh {ticket.pricePerTechnician.toFixed(2)})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Ksh {ticket.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(ticket.createdAt)}
                            </TableCell>
                            <TableCell>
                              {ticket.paid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Paid
                                  {ticket.paidAt && (
                                    <span className="text-xs opacity-75">
                                      ({new Date(ticket.paidAt).toLocaleDateString()})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                  <AlertCircle className="w-3 h-3" />
                                  Unpaid
                                </span>
                              )}
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

