'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, CheckCircle2, AlertCircle, Eye, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface Batch {
  _id: string;
  batchNumber: string;
  name: string;
  description: string;
  equipmentType: string;
  quantity: number;
  purchaseDate: string;
  purchaseCost: number;
  supplier: string;
  stats: {
    total: number;
    available: number;
    installed: number;
    remaining: number;
    finished: boolean;
  };
  clients: Array<{
    equipmentId: string;
    client: string;
    clientNumber?: string;
    installDate?: string;
  }>;
}

interface BatchDetails {
  batch: Batch;
  equipment: any[];
  stats: any;
  clients: any[];
}

interface BatchTrackingProps {
  onBatchesUpdate?: (refreshFn: () => void) => void;
}

export function BatchTracking({ onBatchesUpdate }: BatchTrackingProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string; equipmentCount: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setIsSuperAdmin(data.role === 'superadmin');
      }
    } catch (error) {
      console.error('Error fetching current user role:', error);
    }
  };

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/equipment-batches');
      const data = await response.json();
      if (response.ok) {
        setBatches(data.batches || []);
      } else {
        throw new Error(data.error || 'Failed to fetch batches');
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchBatches();
    }
  }, [mounted]);

  // Expose fetchBatches function to parent component (defer to avoid render warnings)
  useEffect(() => {
    if (onBatchesUpdate && mounted && typeof fetchBatches === 'function') {
      // Use setTimeout to defer state update to next tick, avoiding render warnings
      const timeoutId = setTimeout(() => {
        if (typeof fetchBatches === 'function') {
          onBatchesUpdate(fetchBatches);
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted, onBatchesUpdate, fetchBatches]);

  const viewBatchDetails = async (batchId: string) => {
    try {
      const response = await fetch(`/api/equipment-batches/${batchId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedBatch(data);
        setViewDialogOpen(true);
      } else {
        throw new Error(data.error || 'Failed to fetch batch details');
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
      toast.error('Failed to load batch details');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toLocaleString()}`;
  };

  const handleDeleteBatch = (batchId: string) => {
    // Find the batch to show details in confirmation
    const batch = batches.find(b => b._id === batchId);
    const batchName = batch?.name || 'this batch';
    const equipmentCount = batch?.stats.total || 0;
    
    setBatchToDelete({
      id: batchId,
      name: batchName,
      equipmentCount: equipmentCount,
    });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;

    try {
      const response = await fetch(`/api/equipment-batches/${batchToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete batch');
      }

      const deletedCount = data.deletedEquipmentCount || 0;
      toast.success(
        `Batch deleted successfully! ${deletedCount} equipment item(s) were also deleted.`,
        { duration: 5000 }
      );
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
      fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete batch');
    }
  };

  if (!mounted || loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Equipment Batch Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No batches found. Create a batch to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Batches</TabsTrigger>
                  <TabsTrigger value="active">Active (Has Remaining)</TabsTrigger>
                  <TabsTrigger value="finished">Finished (All Installed)</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  <BatchTable
                    batches={batches}
                    onView={viewBatchDetails}
                    onDelete={handleDeleteBatch}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    isSuperAdmin={isSuperAdmin}
                  />
                </TabsContent>

                <TabsContent value="active" className="space-y-4">
                  <BatchTable
                    batches={batches.filter((b) => !b.stats.finished && b.stats.remaining > 0)}
                    onView={viewBatchDetails}
                    onDelete={handleDeleteBatch}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    isSuperAdmin={isSuperAdmin}
                  />
                </TabsContent>

                <TabsContent value="finished" className="space-y-4">
                  <BatchTable
                    batches={batches.filter((b) => b.stats.finished)}
                    onView={viewBatchDetails}
                    onDelete={handleDeleteBatch}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    isSuperAdmin={isSuperAdmin}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      {selectedBatch && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedBatch.batch.name}</DialogTitle>
              <DialogDescription>
                Batch {selectedBatch.batch.batchNumber} - {selectedBatch.batch.equipmentType}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Batch Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  <p className="text-lg font-semibold">{selectedBatch.stats.total}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-lg font-semibold text-blue-600">{selectedBatch.stats.available}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Installed</p>
                  <p className="text-lg font-semibold text-green-600">{selectedBatch.stats.installed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Purchase Cost</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedBatch.batch.purchaseCost)}</p>
                </div>
              </div>

              {/* Clients List */}
              {selectedBatch.clients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Clients Who Received Equipment</h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment ID</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Install Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.clients.map((client: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{client.equipmentId}</TableCell>
                            <TableCell>{client.client}</TableCell>
                            <TableCell>{client.clientNumber || 'N/A'}</TableCell>
                            <TableCell>{formatDate(client.installDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Equipment List */}
              <div>
                <h3 className="text-sm font-semibold mb-3">All Equipment in Batch</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment ID</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Client</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.equipment.map((eq: any) => (
                        <TableRow key={eq._id}>
                          <TableCell className="font-medium">{eq.equipmentId}</TableCell>
                          <TableCell>{eq.serialNumber}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                eq.status === 'installed'
                                  ? 'default'
                                  : eq.status === 'available'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {eq.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{eq.client || eq.clientName || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  Are you sure you want to delete <strong>&quot;{batchToDelete?.name}&quot;</strong>?
                </div>
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    This will PERMANENTLY DELETE:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-200 text-sm">
                    <li>The batch itself</li>
                    <li>ALL {batchToDelete?.equipmentCount || 0} equipment item(s) in this batch</li>
                  </ul>
                </div>
                <div className="text-red-600 dark:text-red-400 font-semibold mt-3">
                  This action cannot be undone!
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBatchToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBatch}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BatchTable({
  batches,
  onView,
  onDelete,
  formatDate,
  formatCurrency,
  isSuperAdmin,
}: {
  batches: Batch[];
  onView: (batchId: string) => void;
  onDelete: (batchId: string) => void;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
  isSuperAdmin: boolean;
}) {
  if (batches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No batches found in this category.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch Number</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Purchase Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch._id}>
              <TableCell className="font-medium">{batch.batchNumber}</TableCell>
              <TableCell>{batch.name}</TableCell>
              <TableCell>{batch.equipmentType}</TableCell>
              <TableCell>{batch.stats.total}</TableCell>
              <TableCell>
                <span className={batch.stats.remaining > 0 ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}>
                  {batch.stats.remaining}
                </span>
              </TableCell>
              <TableCell>
                {batch.stats.finished ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Finished
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Active
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatDate(batch.purchaseDate)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(batch._id)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(batch._id)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

