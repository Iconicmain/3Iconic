'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Package, Send } from 'lucide-react';

export default function EquipmentRequestsPageClient() {
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<string[]>([]);
  const [fetchingStations, setFetchingStations] = useState(true);
  const [formData, setFormData] = useState({
    itemName: '',
    itemType: '',
    station: '',
    quantity: '',
    priority: 'medium',
    reason: '',
    additionalNotes: '',
  });

  useEffect(() => {
    fetchStations();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.itemName || !formData.itemType || !formData.station || !formData.quantity || !formData.reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/equipment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      toast({
        title: 'Request Submitted',
        description: `Your equipment request (${data.request.requestId}) has been submitted successfully. Admin will be notified.`,
      });

      // Reset form
      setFormData({
        itemName: '',
        itemType: '',
        station: '',
        quantity: '',
        priority: 'medium',
        reason: '',
        additionalNotes: '',
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full md:ml-72 flex-1 min-w-0">
        <Header />
        <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8 max-w-full overflow-x-hidden">
          <div className="max-w-3xl mx-auto">
            {/* Mobile-optimized Header */}
            <div className="mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 md:mb-3">
                <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                  Equipment Request
                </h1>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground ml-0 sm:ml-11 md:ml-14">
                Submit a request for equipment or other items you need for your work.
              </p>
            </div>

            <Card className="shadow-sm sm:shadow-md">
              <CardHeader className="pb-3 sm:pb-4 md:pb-6 px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6">
                <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl">Request Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Fill in the details below to submit your request. Admins will be notified via SMS.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="itemName" className="text-sm sm:text-base font-medium">
                        Item Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="itemName"
                        placeholder="e.g., Laptop, Router, Tools"
                        value={formData.itemName}
                        onChange={(e) =>
                          setFormData({ ...formData, itemName: e.target.value })
                        }
                        className="h-11 sm:h-12 text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="itemType" className="text-sm sm:text-base font-medium">
                        Item Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.itemType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, itemType: value })
                        }
                        required
                      >
                        <SelectTrigger id="itemType" className="h-11 sm:h-12 text-base">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
                          <SelectItem value="tools">Tools</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="station" className="text-sm sm:text-base font-medium">
                      Station <span className="text-destructive">*</span>
                    </Label>
                    {fetchingStations ? (
                      <div className="h-11 sm:h-12 flex items-center justify-center border rounded-md bg-muted/50">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Select
                        value={formData.station}
                        onValueChange={(value) =>
                          setFormData({ ...formData, station: value })
                        }
                        required
                        disabled={loading}
                      >
                        <SelectTrigger id="station" className="h-11 sm:h-12 text-base">
                          <SelectValue placeholder="Select station" />
                        </SelectTrigger>
                        <SelectContent>
                          {stations.length > 0 ? (
                            stations.map((station) => (
                              <SelectItem key={station} value={station}>
                                {station}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>No stations available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm sm:text-base font-medium">
                        Quantity <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        className="h-11 sm:h-12 text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-sm sm:text-base font-medium">
                        Priority
                      </Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger id="priority" className="h-11 sm:h-12 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-sm sm:text-base font-medium">
                      Reason/Justification <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why you need this item..."
                      rows={5}
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      className="text-base min-h-[120px] resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalNotes" className="text-sm sm:text-base font-medium">
                      Additional Notes <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      id="additionalNotes"
                      placeholder="Any additional information..."
                      rows={4}
                      value={formData.additionalNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, additionalNotes: e.target.value })
                      }
                      className="text-base min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Mobile-optimized Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-2 sm:pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setFormData({
                          itemName: '',
                          itemType: '',
                          station: '',
                          quantity: '',
                          priority: 'medium',
                          reason: '',
                          additionalNotes: '',
                        })
                      }
                      disabled={loading}
                      className="h-11 sm:h-12 w-full sm:w-auto text-base font-medium"
                    >
                      Clear Form
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-11 sm:h-12 w-full sm:w-auto text-base font-semibold"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          <span className="hidden sm:inline">Submitting...</span>
                          <span className="sm:hidden">Submitting</span>
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          <span className="hidden sm:inline">Submit Request</span>
                          <span className="sm:hidden">Submit</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

