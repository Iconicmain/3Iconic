'use client';

import { useState, useEffect } from 'react';
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
import { Package, CheckCircle2, AlertCircle, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export function BatchTracking() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchBatches = async () => {
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
  };

  useEffect(() => {
    if (mounted) {
      fetchBatches();
    }
  }, [mounted]);

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
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="active" className="space-y-4">
                  <BatchTable
                    batches={batches.filter((b) => !b.stats.finished && b.stats.remaining > 0)}
                    onView={viewBatchDetails}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="finished" className="space-y-4">
                  <BatchTable
                    batches={batches.filter((b) => b.stats.finished)}
                    onView={viewBatchDetails}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
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
    </>
  );
}

function BatchTable({
  batches,
  onView,
  formatDate,
  formatCurrency,
}: {
  batches: Batch[];
  onView: (batchId: string) => void;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(batch._id)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

