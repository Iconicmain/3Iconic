'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Search, Filter, ChevronDown, Edit, Trash2, Loader2, Eye, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketForm } from './ticket-form';
import { TicketEditDialog } from './ticket-edit-dialog';
import { TicketViewDialog } from './ticket-view-dialog';
import { TechnicianManager } from './technician-manager';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface Ticket {
  _id?: string;
  ticketId: string;
  clientName: string;
  clientNumber?: string;
  station: string;
  houseNumber?: string;
  category: string;
  status: 'open' | 'in-progress' | 'closed' | 'pending';
  dateTimeReported: string;
  problemDescription?: string;
  technician?: string; // For backward compatibility
  technicians?: string[]; // New field for multiple technicians
  createdAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

const statusColors = {
  open: 'bg-red-100 text-red-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
  pending: 'bg-blue-100 text-blue-800',
};

// Helper function to get technicians display text
const getTechniciansDisplay = (ticket: Ticket): string => {
  if (ticket.technicians && Array.isArray(ticket.technicians) && ticket.technicians.length > 0) {
    return ticket.technicians.join(', ');
  }
  if (ticket.technician) {
    return ticket.technician;
  }
  return 'Unassigned';
};

interface TicketListProps {
  onTicketUpdate?: () => void;
  initialStationFilter?: string | null;
  initialTicketId?: string | null;
}

export function TicketList({ onTicketUpdate, initialStationFilter, initialTicketId }: TicketListProps = {}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [technicianManagerOpen, setTechnicianManagerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [userPermissions, setUserPermissions] = useState<{ add: boolean; edit: boolean; delete: boolean }>({
    add: false,
    edit: false,
    delete: false,
  });

  // Debounce search term for server-side filtering
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
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
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (response.ok && data.stations) {
        // Fetch ALL stations from database
        const fetchedStations = data.stations.map((station: { name: string }) => station.name);
        setStations(fetchedStations);
        console.log(`Loaded ${fetchedStations.length} stations for filtering:`, fetchedStations);
      } else {
        console.error('Failed to fetch stations:', data);
        setStations([]);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setStations([]);
    }
  };

  const seedCategories = async () => {
    try {
      const response = await fetch('/api/categories/seed', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        // Refresh categories after seeding
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error seeding categories:', error);
    }
  };

  const fetchTickets = async (resetPage = false) => {
    try {
      setLoading(true);
      
      // Build query params for server-side filtering
      const params = new URLSearchParams();
      params.set('page', resetPage ? '1' : page.toString());
      params.set('limit', '50'); // Fetch 50 tickets per page
      
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (stationFilter !== 'all') params.set('station', stationFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      // Determine if we should bypass cache (after mutations or when explicitly needed)
      const shouldBypassCache = resetPage === true; // Bypass cache on explicit refresh
      
      const response = await fetch(`/api/tickets?${params.toString()}`, {
        // Bypass cache after mutations, use cache for normal loads
        cache: shouldBypassCache ? 'no-store' : 'force-cache',
        next: shouldBypassCache ? { revalidate: 0 } : { revalidate: 10 }, // Revalidate every 10 seconds
        headers: shouldBypassCache ? { 'Cache-Control': 'no-cache' } : undefined,
      });
      
      const data = await response.json();
      if (response.ok) {
        setTickets(data.tickets || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
          if (resetPage) setPage(1);
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  // Parallel fetch all initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fetch all in parallel for maximum speed
        // Use cache for initial load, but ensure fresh data when needed
        const [ticketsRes, categoriesRes, stationsRes] = await Promise.allSettled([
          fetch('/api/tickets?page=1&limit=50', { 
            cache: 'force-cache', 
            next: { revalidate: 10 },
            // Add timestamp to detect stale cache
            headers: { 'X-Request-Time': Date.now().toString() }
          }),
          fetch('/api/categories', {
            // Categories rarely change, but ensure fresh on initial load
            cache: 'force-cache',
            next: { revalidate: 300 },
          }),
          fetch('/api/stations', {
            // Stations rarely change, but ensure fresh on initial load
            cache: 'force-cache',
            next: { revalidate: 300 },
          }),
        ]);

        // Process tickets
        if (ticketsRes.status === 'fulfilled' && ticketsRes.value.ok) {
          const ticketsData = await ticketsRes.value.json();
          setTickets(ticketsData.tickets || []);
          if (ticketsData.pagination) {
            setTotalPages(ticketsData.pagination.totalPages || 1);
            setTotalCount(ticketsData.pagination.total || 0);
          }
        }

        // Process categories
        if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
          const categoriesData = await categoriesRes.value.json();
          const fetchedCategories = categoriesData.categories?.map((cat: { name: string }) => cat.name) || [];
          setCategories(fetchedCategories);
          if (fetchedCategories.length === 0) {
            // Seed if needed (non-blocking)
            fetch('/api/categories/seed', { method: 'POST' }).then(() => fetchCategories());
          }
        }

        // Process stations
        if (stationsRes.status === 'fulfilled' && stationsRes.value.ok) {
          const stationsData = await stationsRes.value.json();
          const fetchedStations = stationsData.stations?.map((station: { name: string }) => station.name) || [];
          setStations(fetchedStations);
        }

        // Fetch permissions (non-blocking)
        fetchUserPermissions();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Handle initial ticket ID from URL parameter - open edit dialog
  useEffect(() => {
    if (initialTicketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.ticketId === initialTicketId);
      if (ticket) {
        setSelectedTicket(ticket);
        setEditDialogOpen(true);
        // Clear URL parameter after opening
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('ticket');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [initialTicketId, tickets]);

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      const usersResponse = await fetch('/api/users/me');
      const userData = await usersResponse.json();
      
      const currentUser = data.users?.find((u: any) => u.email === userData.email);
      if (currentUser) {
        const ticketsPermission = currentUser.pagePermissions?.find((p: any) => p.pageId === 'tickets');
        setUserPermissions({
          add: currentUser.role === 'superadmin' || ticketsPermission?.permissions.includes('add') || false,
          edit: currentUser.role === 'superadmin' || ticketsPermission?.permissions.includes('edit') || false,
          delete: currentUser.role === 'superadmin' || ticketsPermission?.permissions.includes('delete') || false,
        });
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  // Set initial station filter from URL parameter
  useEffect(() => {
    if (initialStationFilter) {
      console.log('Setting initial station filter:', initialStationFilter);
      setStationFilter(initialStationFilter);
    }
  }, [initialStationFilter]);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatDateTime = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleDelete = async (ticketId: string, ticket_id?: string) => {
    if (!ticket_id) {
      toast.error('Cannot delete ticket: ID not found');
      return;
    }

    if (!confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tickets/${ticket_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete ticket');
      }

      toast.success('Ticket deleted successfully!');
      
      // Refetch tickets with current filters
      const refreshParams = new URLSearchParams();
      refreshParams.set('page', page.toString());
      refreshParams.set('limit', '50');
      if (statusFilter !== 'all') refreshParams.set('status', statusFilter);
      if (categoryFilter !== 'all') refreshParams.set('category', categoryFilter);
      if (stationFilter !== 'all') refreshParams.set('station', stationFilter);
      if (debouncedSearch.trim()) refreshParams.set('search', debouncedSearch.trim());
      
      const refreshResponse = await fetch(`/api/tickets?${refreshParams.toString()}`, {
        cache: 'no-store', // Force fresh data after delete
      });
      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok) {
        setTickets(refreshData.tickets || []);
        if (refreshData.pagination) {
          setTotalPages(refreshData.pagination.totalPages || 1);
          setTotalCount(refreshData.pagination.total || 0);
        }
      }
      if (onTicketUpdate) {
        onTicketUpdate();
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete ticket');
    }
  };

  // Refetch when filters change (server-side filtering)
  useEffect(() => {
    const currentPage = page;
    setPage(1); // Reset to page 1 first
    const fetchTicketsData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (stationFilter !== 'all') params.set('station', stationFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      try {
        const response = await fetch(`/api/tickets?${params.toString()}`, {
          cache: 'force-cache',
          next: { revalidate: 10 },
        });
        const data = await response.json();
        if (response.ok) {
          setTickets(data.tickets || []);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            setTotalCount(data.pagination.total || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTicketsData();
  }, [debouncedSearch, statusFilter, categoryFilter, stationFilter]);

  // Fetch next page when page changes
  useEffect(() => {
    if (page > 1) {
      const fetchPageData = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '50');
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (stationFilter !== 'all') params.set('station', stationFilter);
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

        try {
          const response = await fetch(`/api/tickets?${params.toString()}`, {
            cache: 'force-cache',
            next: { revalidate: 10 },
          });
          const data = await response.json();
          if (response.ok) {
            setTickets(data.tickets || []);
            if (data.pagination) {
              setTotalPages(data.pagination.totalPages || 1);
              setTotalCount(data.pagination.total || 0);
            }
          }
        } catch (error) {
          console.error('Error fetching tickets:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchPageData();
    }
  }, [page, statusFilter, categoryFilter, stationFilter, debouncedSearch]);

  // Use tickets directly since filtering is now server-side
  const filtered = tickets;


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">Tickets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage all support tickets</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            className="gap-2 flex-1 sm:flex-initial shrink-0"
            onClick={() => setTechnicianManagerOpen(true)}
            size="sm"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Technicians</span>
          </Button>
          {userPermissions.add && (
          <Button 
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial shrink-0"
            onClick={() => setFormOpen(true)}
            size="sm"
          >
          <Plus className="w-4 h-4" />
            <span>New Ticket</span>
        </Button>
          )}
        </div>
        <TicketForm 
          open={formOpen} 
          onOpenChange={setFormOpen}
          onSuccess={async () => {
            // Refresh data after successful create
            setPage(1); // Reset to first page
            const refreshParams = new URLSearchParams();
            refreshParams.set('page', '1');
            refreshParams.set('limit', '50');
            if (statusFilter !== 'all') refreshParams.set('status', statusFilter);
            if (categoryFilter !== 'all') refreshParams.set('category', categoryFilter);
            if (stationFilter !== 'all') refreshParams.set('station', stationFilter);
            if (debouncedSearch.trim()) refreshParams.set('search', debouncedSearch.trim());
            
            // Always bypass cache after mutations
            const [ticketsRes, categoriesRes] = await Promise.all([
              fetch(`/api/tickets?${refreshParams.toString()}`, { 
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                },
              }),
              fetch('/api/categories', {
                cache: 'no-store', // Refresh categories too after ticket creation
              }),
            ]);
            
            const ticketsData = await ticketsRes.json();
            if (ticketsRes.ok) {
              setTickets(ticketsData.tickets || []);
              if (ticketsData.pagination) {
                setTotalPages(ticketsData.pagination.totalPages || 1);
                setTotalCount(ticketsData.pagination.total || 0);
              }
            }
            
            const categoriesData = await categoriesRes.json();
            if (categoriesRes.ok) {
              const fetchedCategories = categoriesData.categories?.map((cat: { name: string }) => cat.name) || [];
              setCategories(fetchedCategories);
            }
            
            if (onTicketUpdate) {
              onTicketUpdate();
            }
          }}
        />
        <TicketEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          ticket={selectedTicket}
          onSuccess={async () => {
            // Refresh data after successful edit
            const refreshParams = new URLSearchParams();
            refreshParams.set('page', page.toString());
            refreshParams.set('limit', '50');
            if (statusFilter !== 'all') refreshParams.set('status', statusFilter);
            if (categoryFilter !== 'all') refreshParams.set('category', categoryFilter);
            if (stationFilter !== 'all') refreshParams.set('station', stationFilter);
            if (debouncedSearch.trim()) refreshParams.set('search', debouncedSearch.trim());
            
            // Always bypass cache after mutations
            const refreshResponse = await fetch(`/api/tickets?${refreshParams.toString()}`, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
              },
            });
            const refreshData = await refreshResponse.json();
            if (refreshResponse.ok) {
              setTickets(refreshData.tickets || []);
              if (refreshData.pagination) {
                setTotalPages(refreshData.pagination.totalPages || 1);
                setTotalCount(refreshData.pagination.total || 0);
              }
            }
            if (onTicketUpdate) {
              onTicketUpdate();
            }
          }}
        />
        <TicketViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          ticket={selectedTicket}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={userPermissions.edit}
          canDelete={userPermissions.delete}
        />
        <TechnicianManager
          open={technicianManagerOpen}
          onOpenChange={setTechnicianManagerOpen}
          onTechnicianAdded={() => {
            // Refresh technicians in edit dialog if needed
          }}
        />
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 shadow-md">
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Filters</h3>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 z-10" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full text-sm bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 text-sm bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40 text-sm bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-full sm:w-40 text-sm bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700">
                <SelectValue placeholder={stations.length === 0 ? "Loading stations..." : `Station (${stations.length})`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations ({stations.length})</SelectItem>
                {stations.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No stations available</div>
                ) : (
                  stations.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tickets found</p>
              {totalCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Try adjusting your filters
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && filtered.length > 0 && totalPages > 1 && (
        <Card className="bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, totalCount)} of {totalCount} tickets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table - Responsive Card View on Mobile, Table on Desktop */}
      {!loading && filtered.length > 0 && (
      <div className="space-y-3 sm:space-y-0">
        {/* Mobile Card View */}
        <div className="lg:hidden space-y-2">
          {filtered.map((ticket, index) => (
            <Card 
              key={ticket._id || ticket.ticketId} 
              className={cn(
                "border-2 transition-all hover:shadow-md",
                index % 2 === 0 
                  ? "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-200 dark:border-slate-700" 
                  : "bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800"
              )}
            >
              <CardContent className="pt-3 pb-3 px-3 sm:px-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{ticket.ticketId}</p>
                      <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 truncate">{ticket.clientName}</p>
                    </div>
                    <span className={cn('inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0', statusColors[ticket.status])}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="border-l-2 border-amber-500 pl-2">
                      <p className="text-muted-foreground text-[10px] font-medium">Station</p>
                      <p className="text-foreground font-semibold truncate">{ticket.station}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Category</p>
                      <p className="text-foreground font-medium truncate">{ticket.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Technician{ticket.technicians && ticket.technicians.length > 1 ? 's' : ''}</p>
                      <p className="text-foreground font-medium truncate">{getTechniciansDisplay(ticket)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Created</p>
                      <p className="text-foreground font-medium truncate">
                        {ticket.createdAt ? formatDate(ticket.createdAt) : formatDate(ticket.dateTimeReported)}
                      </p>
                    </div>
                    {ticket.resolvedAt && (
                      <div className="col-span-2 border-l-2 border-green-500 pl-2">
                        <p className="text-muted-foreground text-[10px] font-medium">Resolved</p>
                        <p className="text-foreground font-semibold text-green-600 dark:text-green-400 truncate">{formatDate(ticket.resolvedAt)}</p>
                        {ticket.resolutionNotes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2" title={ticket.resolutionNotes}>
                            {ticket.resolutionNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 h-8 text-xs"
                      onClick={() => handleView(ticket)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 h-8 text-xs"
                      onClick={() => handleEdit(ticket)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 h-8 text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(ticket.ticketId, ticket._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-2 border-slate-200 dark:border-slate-700 overflow-hidden hidden lg:block shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-slate-300 dark:border-slate-600 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800">
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-blue-600 dark:text-blue-400">Client</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hidden xl:table-cell">Station</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-muted-foreground hidden xl:table-cell">Technician</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Created</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-green-600 dark:text-green-400 hidden 2xl:table-cell">Resolved</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-muted-foreground w-36 lg:w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map((ticket, index) => (
                  <tr 
                    key={ticket._id || ticket.ticketId} 
                    className={cn(
                      "transition-colors cursor-pointer",
                      index % 2 === 0 
                        ? "bg-white dark:bg-gray-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50" 
                        : "bg-purple-50/30 dark:bg-purple-950/20 hover:bg-purple-100/40 dark:hover:bg-purple-900/30"
                    )}
                    onClick={() => handleView(ticket)}
                  >
                    <td className="px-3 lg:px-6 py-3 text-xs lg:text-sm font-medium text-foreground">{ticket.ticketId}</td>
                    <td className="px-3 lg:px-6 py-3">
                      <span className="text-xs lg:text-sm font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
                        {ticket.clientName}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-3 hidden xl:table-cell">
                      <span className="text-xs lg:text-sm font-semibold text-foreground truncate border-l-2 border-amber-500 pl-2 inline-block">
                        {ticket.station}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-3 text-xs lg:text-sm text-foreground">{ticket.category}</td>
                    <td className="px-3 lg:px-6 py-3">
                      <span className={cn('inline-block px-2.5 lg:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap', statusColors[ticket.status])}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-3 text-xs lg:text-sm text-foreground hidden xl:table-cell truncate max-w-[100px]" title={getTechniciansDisplay(ticket)}>{getTechniciansDisplay(ticket)}</td>
                    <td className="px-3 lg:px-6 py-3 text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                      {ticket.createdAt ? formatDate(ticket.createdAt) : formatDate(ticket.dateTimeReported)}
                    </td>
                    <td className="px-3 lg:px-6 py-3 hidden 2xl:table-cell">
                      {ticket.resolvedAt ? (
                        <div className="max-w-[150px]">
                          <div className="text-xs lg:text-sm font-semibold text-green-600 dark:text-green-400 truncate border-l-2 border-green-500 pl-2">{formatDate(ticket.resolvedAt)}</div>
                          {ticket.resolutionNotes && (
                            <div className="text-xs truncate mt-1 text-muted-foreground pl-2" title={ticket.resolutionNotes}>
                              {ticket.resolutionNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 lg:px-6 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 lg:gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 h-8 w-8 p-0 lg:h-auto lg:w-auto lg:px-2"
                          onClick={() => handleView(ticket)}
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          <span className="hidden lg:inline">View</span>
                        </Button>
                        {userPermissions.edit && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 h-8 w-8 p-0 lg:h-auto lg:w-auto lg:px-2"
                          onClick={() => handleEdit(ticket)}
                          title="Edit Ticket"
                        >
                          <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          <span className="hidden lg:inline">Edit</span>
                        </Button>
                        )}
                        {userPermissions.delete && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 h-8 w-8 p-0 lg:h-auto lg:w-auto lg:px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(ticket.ticketId, ticket._id)}
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          <span className="hidden lg:inline">Delete</span>
                        </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      )}
    </div>
  );
}
