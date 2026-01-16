'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Package, RefreshCw, ClipboardCheck, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EquipmentRequest {
  _id?: string;
  requestId: string;
  itemName: string;
  itemType: string;
  station?: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  additionalNotes?: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: {
    email: string;
    name: string;
  };
  reviewedBy?: {
    email: string;
    name: string;
  };
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

const statusColors = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
};

export default function ManageRequestsPageClient() {
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EquipmentRequest | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`/api/equipment-requests${statusParam}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests');
      }

      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleAction = (request: EquipmentRequest, type: 'accept' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNotes('');
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const requestId = selectedRequest._id || selectedRequest.requestId;
      const response = await fetch(`/api/equipment-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: actionType === 'accept' ? 'accepted' : 'rejected',
          adminNotes: adminNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      toast({
        title: 'Success',
        description: `Request has been ${actionType === 'accept' ? 'accepted' : 'rejected'} successfully.`,
      });

      setActionDialogOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full md:ml-72 flex-1 min-w-0">
        <Header />
        <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8 max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {/* Modern Header */}
            <div className="mb-5 sm:mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                    <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                      Manage Equipment Requests
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
                      Review and manage equipment requests from workers
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchRequests}
                  disabled={loading}
                  className="gap-2 h-10 sm:h-11 w-full sm:w-auto text-sm font-medium"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Modern Filter Card */}
            <Card className="mb-5 sm:mb-6 shadow-sm border-border/50">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5">
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium mb-2 block">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-10 sm:h-11 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <Card className="shadow-sm">
                <CardContent className="flex items-center justify-center py-16 sm:py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading requests...</p>
                  </div>
                </CardContent>
              </Card>
            ) : requests.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 sm:py-20">
                  <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/40 mb-4" />
                  <p className="text-base sm:text-lg font-medium text-muted-foreground">No requests found</p>
                  <p className="text-sm text-muted-foreground/80 mt-1">Try adjusting your filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-5">
                {requests.map((request) => (
                  <Card 
                    key={request._id || request.requestId}
                    className="shadow-sm hover:shadow-md transition-shadow border-border/50 overflow-hidden"
                  >
                    <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-5 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-800/30 border-b border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold">
                              {request.itemName}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={cn('border font-medium text-xs px-2 py-0.5', statusColors[request.status])}>
                                {request.status}
                              </Badge>
                              <Badge className={cn('font-medium text-xs px-2 py-0.5', priorityColors[request.priority])}>
                                {request.priority}
                              </Badge>
                            </div>
                          </div>
                          <CardDescription className="text-xs sm:text-sm">
                            <span className="font-medium">ID:</span> {request.requestId} • 
                            <span className="font-medium ml-1">Station:</span> {request.station || 'N/A'} • 
                            <span className="font-medium ml-1">Type:</span> {request.itemType} • 
                            <span className="font-medium ml-1">Qty:</span> {request.quantity}
                          </CardDescription>
                        </div>
                        {request.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(request, 'reject')}
                              className="gap-2 h-9 sm:h-10 text-sm font-medium border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(request, 'accept')}
                              className="gap-2 h-9 sm:h-10 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Accept</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Requested By</p>
                            <p className="text-sm font-medium">{request.requestedBy.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 break-all">{request.requestedBy.email}</p>
                          </div>
                          {request.station && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Station</p>
                              <p className="text-sm font-medium">{request.station}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reason</p>
                          <p className="text-sm leading-relaxed bg-muted/30 rounded-md p-3 border border-border/50">{request.reason}</p>
                        </div>
                        {request.additionalNotes && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Additional Notes</p>
                            <p className="text-sm leading-relaxed bg-muted/30 rounded-md p-3 border border-border/50">{request.additionalNotes}</p>
                          </div>
                        )}
                        {request.reviewedBy && (
                          <div className="bg-muted/30 rounded-md p-3 border border-border/50">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                              {request.status === 'accepted' ? 'Accepted' : 'Rejected'} By
                            </p>
                            <p className="text-sm font-medium">{request.reviewedBy.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 break-all">{request.reviewedBy.email}</p>
                            {request.reviewedAt && (
                              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                {formatDate(request.reviewedAt)}
                              </p>
                            )}
                          </div>
                        )}
                        {request.adminNotes && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Admin Notes</p>
                            <p className="text-sm leading-relaxed bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 border border-blue-200 dark:border-blue-800">{request.adminNotes}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
                          <span><span className="font-medium">Created:</span> {formatDate(request.createdAt)}</span>
                          {request.updatedAt !== request.createdAt && (
                            <span><span className="font-medium">Updated:</span> {formatDate(request.updatedAt)}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                    {actionType === 'accept' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    {actionType === 'accept' ? 'Accept' : 'Reject'} Request
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    {actionType === 'accept'
                      ? 'Are you sure you want to accept this equipment request?'
                      : 'Are you sure you want to reject this equipment request?'}
                  </DialogDescription>
                </DialogHeader>
                {selectedRequest && (
                  <div className="space-y-4 py-2">
                    <div className="bg-muted/30 rounded-md p-3 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Request Details</p>
                      <p className="text-sm font-medium">ID: {selectedRequest.requestId}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedRequest.itemName} • Station: {selectedRequest.station || 'N/A'} • Quantity: {selectedRequest.quantity}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminNotes" className="text-sm font-medium">Admin Notes (Optional)</Label>
                      <Textarea
                        id="adminNotes"
                        placeholder="Add any notes about your decision..."
                        rows={4}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActionDialogOpen(false);
                      setAdminNotes('');
                    }}
                    disabled={processing}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmAction}
                    disabled={processing}
                    variant={actionType === 'reject' ? 'destructive' : 'default'}
                    className={cn(
                      "w-full sm:w-auto font-semibold",
                      actionType === 'accept' && "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {actionType === 'accept' ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Accept
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}

