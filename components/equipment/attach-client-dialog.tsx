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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Equipment {
  _id?: string;
  equipmentId: string;
  name: string;
  model: string;
  serialNumber: string;
}

interface AttachClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onSuccess?: () => void;
}

export function AttachClientDialog({ open, onOpenChange, equipment, onSuccess }: AttachClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Array<{ name: string; number: string }>>([]);
  const [fetchingClients, setFetchingClients] = useState(false);
  const [stations, setStations] = useState<string[]>([]);
  const [fetchingStations, setFetchingStations] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [station, setStation] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [installationType, setInstallationType] = useState<'new-installation' | 'exchange-replacement'>('new-installation');
  const [replacedEquipmentSerialNumber, setReplacedEquipmentSerialNumber] = useState('');

  useEffect(() => {
    if (open && equipment) {
      fetchClients();
      fetchStations();
      setClientName('');
      setClientNumber('');
      setStation('');
      setInstallDate(new Date().toISOString().split('T')[0]);
      setInstallationType('new-installation');
      setReplacedEquipmentSerialNumber('');
    }
  }, [open, equipment]);

  const fetchClients = async () => {
    try {
      setFetchingClients(true);
      const response = await fetch('/api/tickets');
      const data = await response.json();
      if (response.ok) {
        const clientMap = new Map<string, { name: string; number: string }>();
        data.tickets?.forEach((ticket: { clientName: string; clientNumber: string }) => {
          if (ticket.clientName && ticket.clientNumber) {
            const key = `${ticket.clientName}-${ticket.clientNumber}`;
            if (!clientMap.has(key)) {
              clientMap.set(key, { name: ticket.clientName, number: ticket.clientNumber });
            }
          }
        });
        setClients(Array.from(clientMap.values()));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setFetchingClients(false);
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

  const handleClientSelect = (value: string) => {
    const selectedClient = clients.find(c => c.name === value);
    setClientName(selectedClient?.name || value);
    if (selectedClient?.number) {
      setClientNumber(selectedClient.number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    if (!equipment?._id) {
      toast.error('Equipment ID is missing. Please refresh and try again.');
      console.error('Equipment missing _id:', equipment);
      return;
    }

    setLoading(true);

    try {
      console.log('Attaching equipment:', {
        equipmentId: equipment._id,
        equipment: equipment,
      });

      const equipmentId = equipment._id.toString();
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'installed',
          client: clientName.trim(),
          clientName: clientName.trim(),
          clientNumber: clientNumber.trim() || null,
          station: station || null,
          installDate: installDate || null,
          installationType: installationType,
          replacedEquipmentId: replacedEquipmentSerialNumber.trim() || null,
        }),
      });

      const data = await response.json();
      console.log('Response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to attach equipment to client');
      }

      toast.success('Equipment attached to client successfully!');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error attaching equipment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to attach equipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Attach Equipment to Client
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Attach {equipment?.equipmentId} - {equipment?.name} to a client
          </DialogDescription>
        </DialogHeader>

               <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                   <div className="space-y-1.5 sm:space-y-2">
                     <Label htmlFor="clientName" className="text-xs sm:text-sm font-medium">
                       Client Name <span className="text-red-500">*</span>
                     </Label>
                     <Input
                       id="clientName"
                       type="text"
                       value={clientName}
                       onChange={(e) => setClientName(e.target.value)}
                       placeholder="Enter client name"
                       className="h-10 sm:h-11 text-sm"
                       required
                       autoComplete="off"
                     />
              {clients.length > 0 && (
                <Select
                  value=""
                  onValueChange={handleClientSelect}
                  disabled={fetchingClients}
                >
                  <SelectTrigger className="h-11 mt-2">
                    <SelectValue placeholder={fetchingClients ? "Loading..." : "Or select from list"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={`${client.name}-${client.number}`} value={client.name}>
                        {client.name} ({client.number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

                   <div className="space-y-1.5 sm:space-y-2">
                     <Label htmlFor="clientNumber" className="text-xs sm:text-sm font-medium">
                       Client Number
                     </Label>
                     <Input
                       id="clientNumber"
                       type="text"
                       value={clientNumber}
                       onChange={(e) => setClientNumber(e.target.value)}
                       placeholder="Enter client number"
                       className="h-10 sm:h-11 text-sm"
                       autoComplete="off"
                     />
                   </div>
                 </div>

                 <div className="space-y-1.5 sm:space-y-2">
                   <Label htmlFor="station" className="text-xs sm:text-sm font-medium">
                     Station
                   </Label>
                   <Select
                     value={station}
                     onValueChange={setStation}
                     disabled={fetchingStations}
                   >
                     <SelectTrigger id="station" className="h-10 sm:h-11 text-sm">
                       <SelectValue placeholder={fetchingStations ? "Loading..." : "Select Station"} />
                     </SelectTrigger>
              <SelectContent>
                {stations.map((stationName) => (
                  <SelectItem key={stationName} value={stationName}>
                    {stationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                   <div className="space-y-1.5 sm:space-y-2">
                     <Label htmlFor="installationType" className="text-xs sm:text-sm font-medium">
                       Installation Type
                     </Label>
                     <Select
                       value={installationType}
                       onValueChange={(value) => {
                         setInstallationType(value as 'new-installation' | 'exchange-replacement');
                         if (value === 'new-installation') {
                           setReplacedEquipmentSerialNumber('');
                         }
                       }}
                     >
                       <SelectTrigger id="installationType" className="h-10 sm:h-11 text-sm">
                         <SelectValue placeholder="Select type" />
                       </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new-installation">New Installation</SelectItem>
                  <SelectItem value="exchange-replacement">Exchange/Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>

                   <div className="space-y-1.5 sm:space-y-2">
                     <Label htmlFor="installDate" className="text-xs sm:text-sm font-medium">
                       Install Date
                     </Label>
                     <Input
                       id="installDate"
                       type="date"
                       value={installDate}
                       onChange={(e) => setInstallDate(e.target.value)}
                       className="h-10 sm:h-11 text-sm"
                     />
                   </div>
                 </div>

                 {installationType === 'exchange-replacement' && (
                   <div className="space-y-1.5 sm:space-y-2">
                     <Label htmlFor="replacedEquipmentSerialNumber" className="text-xs sm:text-sm font-medium">
                       Replaced Equipment Serial Number
                     </Label>
                     <Input
                       id="replacedEquipmentSerialNumber"
                       type="text"
                       value={replacedEquipmentSerialNumber}
                       onChange={(e) => setReplacedEquipmentSerialNumber(e.target.value)}
                       placeholder="Enter serial number of equipment being replaced"
                       className="h-10 sm:h-11 text-sm"
                       autoComplete="off"
                     />
                   </div>
                 )}

                 <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                     disabled={loading}
                     className="w-full sm:w-auto h-10 sm:h-11 text-sm"
                   >
                     Cancel
                   </Button>
                   <Button
                     type="submit"
                     disabled={loading || !clientName.trim()}
                     className="w-full sm:w-auto h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm"
                   >
                     {loading ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         Attaching...
                       </>
                     ) : (
                       'Attach to Client'
                     )}
                   </Button>
                 </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
