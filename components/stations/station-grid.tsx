'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Package, TrendingUp, ChevronRight, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { StationForm } from './station-form';
import { toast } from 'sonner';

interface Station {
  _id?: string;
  stationId: string;
  name: string;
  location: string;
  region: string;
  status: 'active' | 'maintenance' | 'inactive';
  technicians: number;
  equipment: number;
  ticketsThisMonth: number;
  performanceScore: number;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-red-100 text-red-800',
};

export function StationGrid() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (response.ok) {
        setStations(data.stations || []);
        
        // If no stations exist, seed them
        if (data.stations.length === 0) {
          await seedStations();
        }
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedStations = async () => {
    try {
      const response = await fetch('/api/stations/seed', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        // Refresh stations after seeding
        await fetchStations();
      }
    } catch (error) {
      console.error('Error seeding stations:', error);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleEdit = (station: Station) => {
    setSelectedStation(station);
    setFormOpen(true);
  };

  const handleDelete = async (station: Station) => {
    if (!station._id) {
      toast.error('Cannot delete station: ID not found');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${station.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/stations/${station._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete station');
      }

      toast.success('Station deleted successfully!');
      fetchStations();
    } catch (error) {
      console.error('Error deleting station:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete station');
    }
  };
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Stations</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage all service stations</p>
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            New Station
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Stations</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage all service stations</p>
        </div>
        <Button 
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            setSelectedStation(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New Station
        </Button>
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No stations found</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station, index) => {
          // Alternating gradient backgrounds
          const bgColors = [
            'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
            'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30',
            'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
            'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
            'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30',
          ];
          const bgColor = bgColors[index % bgColors.length];
          
          return (
          <Card key={station._id || station.stationId} className={`${bgColor} hover:shadow-lg transition-shadow cursor-pointer border-2`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{station.name}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-4 h-4" />
                    {station.location}
                  </div>
                </div>
                <Badge className={statusColors[station.status]}>
                  {station.status.charAt(0).toUpperCase() + station.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{station.technicians}</p>
                  <p className="text-xs text-muted-foreground">Technicians</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">{station.equipment}</p>
                  <p className="text-xs text-muted-foreground">Equipment</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{station.performanceScore}%</p>
                  <p className="text-xs text-muted-foreground">Performance</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Tickets This Month</p>
                <div className="flex items-center justify-between mb-3">
                  <p 
                    className="text-2xl font-bold text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                    onClick={() => {
                      router.push(`/tickets?station=${encodeURIComponent(station.name)}`);
                    }}
                    title="Click to view tickets for this station"
                  >
                    {station.ticketsThisMonth}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      router.push(`/tickets?station=${encodeURIComponent(station.name)}`);
                    }}
                  >
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(station);
                    }}
                    className="flex-1"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(station);
                    }}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          );
          })}
      </div>
      )}
      
      <StationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        station={selectedStation}
        onSuccess={() => {
          fetchStations();
          setSelectedStation(null);
        }}
      />
    </div>
  );
}
