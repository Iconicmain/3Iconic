'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Pencil, Trash2, Loader2, Wifi, Mail, Network, X, Eye, EyeOff, Eye as ViewIcon } from 'lucide-react';
import { toast } from 'sonner';

interface EmailEntry {
  email: string;
  password: string;
}

interface IpEntry {
  ip: string;
  password: string;
}

interface InternetConnection {
  _id?: string;
  station: string;
  starlinkEmails?: EmailEntry[] | string[]; // New format with objects, old format with strings
  starlinkEmail?: string; // Old format for backward compatibility
  vpnIps?: IpEntry[] | string[]; // New format with objects, old format with strings
  vpnIp?: string; // Old format for backward compatibility
  scheduledForDeletion?: string; // ISO date string for 72-hour delayed deletion
  createdAt?: string;
  updatedAt?: string;
}

export function InternetConnectionsClient() {
  const [connections, setConnections] = useState<InternetConnection[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewWarningOpen, setViewWarningOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDeleteDialogOpen, setCancelDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<InternetConnection | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [showFormPasswords, setShowFormPasswords] = useState<{ [key: string]: boolean }>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formData, setFormData] = useState({
    station: '',
    starlinkEmails: [{ email: '', password: '' }] as EmailEntry[],
    vpnIps: [{ ip: '', password: '' }] as IpEntry[],
  });

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/internet-connections');
      const data = await response.json();
      if (response.ok) {
        // Handle backward compatibility - convert old format to new format
        const connections = (data.connections || []).map((conn: any) => {
          // If old format exists (single string), convert to new format (array of objects)
          if (conn.starlinkEmail && !conn.starlinkEmails) {
            conn.starlinkEmails = [{ email: conn.starlinkEmail, password: '' }];
          } else if (Array.isArray(conn.starlinkEmails)) {
            // Convert string array to object array if needed
            conn.starlinkEmails = conn.starlinkEmails.map((item: any) => {
              if (typeof item === 'string') {
                return { email: item, password: '' };
              }
              return item;
            });
          }
          
          if (conn.vpnIp && !conn.vpnIps) {
            conn.vpnIps = [{ ip: conn.vpnIp, password: '' }];
          } else if (Array.isArray(conn.vpnIps)) {
            // Convert string array to object array if needed
            conn.vpnIps = conn.vpnIps.map((item: any) => {
              if (typeof item === 'string') {
                return { ip: item, password: '' };
              }
              return item;
            });
          }
          return conn;
        });
        setConnections(connections);
        setStations(data.stations || []);
      } else {
        throw new Error(data.error || 'Failed to fetch connections');
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load internet connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    checkSuperAdmin();
    
    // Periodically check for scheduled deletions to cleanup
    const cleanupInterval = setInterval(() => {
      fetch('/api/internet-connections/cleanup', { method: 'POST' })
        .then(() => fetchConnections())
        .catch(err => console.error('Cleanup error:', err));
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const response = await fetch('/api/users/me');
      const data = await response.json();
      if (response.ok && data.user) {
        setIsSuperAdmin(data.user.role === 'superadmin');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const handleAdd = () => {
    setSelectedConnection(null);
    setFormData({
      station: '',
      starlinkEmails: [{ email: '', password: '' }],
      vpnIps: [{ ip: '', password: '' }],
    });
    setFormOpen(true);
  };

  const handleView = (connection: InternetConnection) => {
    setSelectedConnection(connection);
    setViewWarningOpen(true);
  };

  const confirmView = () => {
    setViewWarningOpen(false);
    setViewDialogOpen(true);
  };

  const handleEdit = (connection: InternetConnection) => {
    setSelectedConnection(connection);
    // Handle backward compatibility
    let emails: EmailEntry[] = [];
    if (connection.starlinkEmails) {
      emails = connection.starlinkEmails.map((item: any) => {
        if (typeof item === 'string') {
          return { email: item, password: '' };
        }
        return { email: item.email || '', password: item.password || '' };
      });
    } else if (connection.starlinkEmail) {
      emails = [{ email: connection.starlinkEmail, password: '' }];
    }
    
    let ips: IpEntry[] = [];
    if (connection.vpnIps) {
      ips = connection.vpnIps.map((item: any) => {
        if (typeof item === 'string') {
          return { ip: item, password: '' };
        }
        return { ip: item.ip || '', password: item.password || '' };
      });
    } else if (connection.vpnIp) {
      ips = [{ ip: connection.vpnIp, password: '' }];
    }
    
    setFormData({
      station: connection.station || '',
      starlinkEmails: emails.length > 0 ? emails : [{ email: '', password: '' }],
      vpnIps: ips.length > 0 ? ips : [{ ip: '', password: '' }],
    });
    setFormOpen(true);
  };

  const addEmailField = () => {
    setFormData({
      ...formData,
      starlinkEmails: [...formData.starlinkEmails, { email: '', password: '' }],
    });
  };

  const removeEmailField = (index: number) => {
    if (formData.starlinkEmails.length > 1) {
      setFormData({
        ...formData,
        starlinkEmails: formData.starlinkEmails.filter((_, i) => i !== index),
      });
    }
  };

  const updateEmail = (index: number, field: 'email' | 'password', value: string) => {
    const newEmails = [...formData.starlinkEmails];
    newEmails[index] = { 
      email: newEmails[index]?.email || '', 
      password: newEmails[index]?.password || '',
      [field]: value 
    };
    setFormData({ ...formData, starlinkEmails: newEmails });
  };

  const addIpField = () => {
    setFormData({
      ...formData,
      vpnIps: [...formData.vpnIps, { ip: '', password: '' }],
    });
  };

  const removeIpField = (index: number) => {
    if (formData.vpnIps.length > 1) {
      setFormData({
        ...formData,
        vpnIps: formData.vpnIps.filter((_, i) => i !== index),
      });
    }
  };

  const updateIp = (index: number, field: 'ip' | 'password', value: string) => {
    const newIps = [...formData.vpnIps];
    
    // Strip http:// or https:// prefix if user pastes a URL
    if (field === 'ip' && value) {
      value = value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
    }
    
    newIps[index] = { 
      ip: newIps[index]?.ip || '', 
      password: newIps[index]?.password || '',
      [field]: value 
    };
    setFormData({ ...formData, vpnIps: newIps });
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFormPasswordVisibility = (key: string) => {
    setShowFormPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = (connection: InternetConnection) => {
    setSelectedConnection(connection);
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = (connection: InternetConnection) => {
    setSelectedConnection(connection);
    setCancelDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedConnection?._id) {
      toast.error('Cannot delete: ID not found');
      return;
    }

    try {
      // Schedule deletion for 72 hours from now
      const deletionDate = new Date();
      deletionDate.setHours(deletionDate.getHours() + 72);

      const response = await fetch(`/api/internet-connections/${selectedConnection._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledForDeletion: deletionDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule deletion');
      }

      toast.success('Deletion scheduled. Connection will be deleted in 72 hours.');
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
      fetchConnections();
    } catch (error) {
      console.error('Error scheduling deletion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule deletion';
      toast.error(errorMessage);
    }
  };

  const confirmCancelDelete = async () => {
    if (!selectedConnection?._id) {
      toast.error('Cannot cancel: ID not found');
      return;
    }

    try {
      const response = await fetch(`/api/internet-connections/${selectedConnection._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledForDeletion: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel deletion');
      }

      toast.success('Deletion cancelled successfully');
      setCancelDeleteDialogOpen(false);
      setSelectedConnection(null);
      fetchConnections();
    } catch (error) {
      console.error('Error cancelling deletion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel deletion';
      toast.error(errorMessage);
    }
  };

  const getTimeUntilDeletion = (scheduledDate: string) => {
    const deletionDate = new Date(scheduledDate);
    const now = new Date();
    const diffMs = deletionDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs <= 0) {
      return 'Pending deletion';
    }
    
    return `${diffHours}h ${diffMinutes}m remaining`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one email or IP is provided
    // Clean IPs: remove http:// or https:// prefixes and trailing slashes
    const cleanedIps = formData.vpnIps.map(ip => ({
      ...ip,
      ip: ip.ip.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    }));
    
    const validEmails = formData.starlinkEmails.filter(e => e.email.trim());
    const validIps = cleanedIps.filter(ip => ip.ip.trim());
    
    if (validEmails.length === 0 && validIps.length === 0) {
      toast.error('Please provide at least one Starlink email or VPN IP');
      return;
    }
    
    setSaving(true);

    try {
      const url = selectedConnection?._id
        ? `/api/internet-connections/${selectedConnection._id}`
        : '/api/internet-connections';
      const method = selectedConnection?._id ? 'PATCH' : 'POST';

      // Filter out empty values before submitting
      const submitData = {
        station: formData.station,
        starlinkEmails: validEmails,
        vpnIps: validIps,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save connection');
      }

      toast.success(
        selectedConnection?._id
          ? 'Internet connection updated successfully'
          : 'Internet connection created successfully'
      );
      setFormOpen(false);
      setSelectedConnection(null);
      setFormData({
        station: '',
        starlinkEmails: [{ email: '', password: '' }],
        vpnIps: [{ ip: '', password: '' }],
      });
      fetchConnections();
    } catch (error) {
      console.error('Error saving connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save connection';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight break-words">
            Internet Connections
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
            Manage Starlink emails and MikroTik VPN IPs with passwords for each station
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2 w-full sm:w-auto flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Add Connection</span>
          <span className="xs:hidden">Add</span>
        </Button>
      </div>

      {/* Connections Table */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : connections.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
                {connections.map((connection) => {
                  // Handle backward compatibility
                  let emails: EmailEntry[] = [];
                  if (connection.starlinkEmails) {
                    emails = connection.starlinkEmails.map((item: any) => {
                      if (typeof item === 'string') {
                        return { email: item, password: '' };
                      }
                      return item;
                    });
                  } else if (connection.starlinkEmail) {
                    emails = [{ email: connection.starlinkEmail, password: '' }];
                  }
                  
                  let ips: IpEntry[] = [];
                  if (connection.vpnIps) {
                    ips = connection.vpnIps.map((item: any) => {
                      if (typeof item === 'string') {
                        return { ip: item, password: '' };
                      }
                      return item;
                    });
                  } else if (connection.vpnIp) {
                    ips = [{ ip: connection.vpnIp, password: '' }];
                  }
                  
                  const isScheduledForDeletion = connection.scheduledForDeletion && new Date(connection.scheduledForDeletion) > new Date();
                  
                  return (
                    <Card 
                      key={connection._id}
                      className={`overflow-hidden ${isScheduledForDeletion ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <CardHeader className="pb-3 sm:pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 flex-wrap">
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                            <span className="break-words">{connection.station}</span>
                            {isScheduledForDeletion && (
                              <span className="text-xs px-2 sm:px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium whitespace-nowrap">
                                Scheduled
                              </span>
                            )}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2">
                            {connection.scheduledForDeletion ? (
                              <>
                                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium px-2 sm:px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md w-full sm:w-auto text-center sm:text-left">
                                  {getTimeUntilDeletion(connection.scheduledForDeletion)}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(connection)}
                                  className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  <ViewIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline">View</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(connection)}
                                  className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline">Edit</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelDelete(connection)}
                                  className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline">Cancel</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(connection)}
                                  className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  <ViewIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline">View</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(connection)}
                                  className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline">Edit</span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(connection)}
                                  className="gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline">Delete</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                          {/* Starlink Emails Section */}
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <h3 className="font-semibold text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">Starlink Emails</h3>
                            </div>
                            {emails.length > 0 ? (
                              <div className="space-y-2">
                                {emails.map((entry, idx) => (
                                  <div key={idx} className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-2 mb-1">
                                      <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                      <span className="text-xs sm:text-sm font-medium break-words overflow-wrap-anywhere">{entry.email}</span>
                                    </div>
                                    {entry.password && (
                                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                                        <span className="text-xs font-medium text-muted-foreground">Password:</span>
                                        <span className="text-xs font-mono font-semibold">••••••••</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-muted-foreground italic">No emails configured</p>
                            )}
                          </div>

                          {/* MikroTik VPN IPs Section */}
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <Network className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <h3 className="font-semibold text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">MikroTik VPN IPs</h3>
                            </div>
                            {ips.length > 0 ? (
                              <div className="space-y-2">
                                {ips.map((entry, idx) => (
                                  <div key={idx} className="p-2.5 sm:p-3 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-start gap-2 mb-1">
                                      <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                      <a
                                        href={`http://${entry.ip}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer break-words overflow-wrap-anywhere"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          navigator.clipboard.writeText(entry.ip).then(() => {
                                            toast.success(`Copied ${entry.ip} to clipboard`);
                                            setTimeout(() => {
                                              window.open(`http://${entry.ip}`, '_blank', 'noopener,noreferrer');
                                            }, 100);
                                          }).catch(() => {
                                            window.open(`http://${entry.ip}`, '_blank', 'noopener,noreferrer');
                                          });
                                        }}
                                      >
                                        {entry.ip}
                                      </a>
                                    </div>
                                    {entry.password && (
                                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                                        <span className="text-xs font-medium text-muted-foreground">Password:</span>
                                        <span className="text-xs font-mono font-semibold">••••••••</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-muted-foreground italic">No VPN IPs configured</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Wifi className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No internet connections found. Add your first connection to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>
              {selectedConnection ? 'Edit Connection' : 'Add Connection'}
            </DialogTitle>
            <DialogDescription>
              {selectedConnection
                ? 'Update the internet connection details for this station. You can update passwords and add/remove emails or IPs.'
                : 'Add a new internet connection with Starlink emails and MikroTik VPN IPs (passwords optional).'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Select
                value={formData.station}
                onValueChange={(value) => setFormData({ ...formData, station: value })}
                disabled={!!selectedConnection}
              >
                <SelectTrigger id="station">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedConnection && (
                <p className="text-xs text-muted-foreground">
                  Station cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Starlink Emails</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmailField}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Email
                </Button>
              </div>
              <div className="space-y-3">
                {formData.starlinkEmails.map((emailEntry, index) => (
                  <div key={index} className="space-y-2 p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="example@gmail.com (or just 'example')"
                        value={emailEntry?.email || ''}
                        onChange={(e) => {
                          let value = e.target.value;
                          updateEmail(index, 'email', value);
                        }}
                        onBlur={(e) => {
                          let value = e.target.value.trim();
                          // Auto-complete @gmail.com if user doesn't type it
                          if (value && !value.includes('@')) {
                            updateEmail(index, 'email', value + '@gmail.com');
                          }
                        }}
                        required={index === 0}
                        className="flex-1"
                      />
                      {formData.starlinkEmails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmailField(index)}
                          className="flex-shrink-0 h-9 w-9"
                        >
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showFormPasswords[`email-${index}`] ? 'text' : 'password'}
                        placeholder="Email password (optional)"
                        value={emailEntry?.password || ''}
                        onChange={(e) => updateEmail(index, 'password', e.target.value)}
                        className="w-full pr-9 sm:pr-10 text-sm sm:text-base"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-9 sm:w-10"
                        onClick={() => toggleFormPasswordVisibility(`email-${index}`)}
                      >
                        {showFormPasswords[`email-${index}`] ? (
                          <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Add multiple Starlink email addresses with passwords for this station
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>MikroTik VPN IPs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIpField}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add IP
                </Button>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {formData.vpnIps.map((ipEntry, index) => (
                  <div key={index} className="space-y-2 p-2.5 sm:p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="192.168.1.1"
                        value={ipEntry?.ip || ''}
                        onChange={(e) => updateIp(index, 'ip', e.target.value)}
                        required={index === 0}
                        className="flex-1 text-sm sm:text-base"
                      />
                      {formData.vpnIps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIpField(index)}
                          className="flex-shrink-0 h-9 w-9"
                        >
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showFormPasswords[`ip-${index}`] ? 'text' : 'password'}
                        placeholder="VPN password (optional)"
                        value={ipEntry?.password || ''}
                        onChange={(e) => updateIp(index, 'password', e.target.value)}
                        className="w-full pr-9 sm:pr-10 text-sm sm:text-base"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-9 sm:w-10"
                        onClick={() => toggleFormPasswordVisibility(`ip-${index}`)}
                      >
                        {showFormPasswords[`ip-${index}`] ? (
                          <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Add multiple MikroTik VPN IP addresses with passwords for this station
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedConnection ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Warning Dialog */}
      <AlertDialog open={viewWarningOpen} onOpenChange={setViewWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Security Warning</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block font-semibold text-amber-600 dark:text-amber-400">
                ⚠️ Make sure no one is looking at your screen before you view passwords!
              </span>
              <span className="block text-sm">
                You are about to view sensitive password information. Ensure you are in a private location and no one can see your screen.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmView} className="bg-blue-600 hover:bg-blue-700">
              I Understand, Show Passwords
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 mx-2 sm:mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Connection Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words">
              View all connection information including passwords for {selectedConnection?.station}
            </DialogDescription>
          </DialogHeader>
          {selectedConnection && (() => {
            // Handle backward compatibility
            let emails: EmailEntry[] = [];
            if (selectedConnection.starlinkEmails) {
              emails = selectedConnection.starlinkEmails.map((item: any) => {
                if (typeof item === 'string') {
                  return { email: item, password: '' };
                }
                return item;
              });
            } else if (selectedConnection.starlinkEmail) {
              emails = [{ email: selectedConnection.starlinkEmail, password: '' }];
            }
            
            let ips: IpEntry[] = [];
            if (selectedConnection.vpnIps) {
              ips = selectedConnection.vpnIps.map((item: any) => {
                if (typeof item === 'string') {
                  return { ip: item, password: '' };
                }
                return item;
              });
            } else if (selectedConnection.vpnIp) {
              ips = [{ ip: selectedConnection.vpnIp, password: '' }];
            }

            return (
              <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
                {/* Station Info */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold">Station</Label>
                  <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                    <p className="text-sm sm:text-base md:text-lg font-medium break-words overflow-wrap-anywhere">{selectedConnection.station}</p>
                  </div>
                </div>

                {/* Starlink Emails */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold">Starlink Emails</Label>
                  {emails.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {emails.map((entry, idx) => (
                        <div key={idx} className="p-2.5 sm:p-3 md:p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2 max-w-full overflow-x-hidden">
                          <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Email</p>
                              <p className="text-xs sm:text-sm md:text-base font-mono break-words overflow-wrap-anywhere">{entry.email}</p>
                            </div>
                          </div>
                          {entry.password && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Password</p>
                                <p className="text-xs sm:text-sm md:text-base font-mono break-all overflow-wrap-anywhere">{entry.password}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                      <p className="text-xs sm:text-sm text-muted-foreground">No Starlink emails configured</p>
                    </div>
                  )}
                </div>

                {/* MikroTik VPN IPs */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold">MikroTik VPN IPs</Label>
                  {ips.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {ips.map((entry, idx) => (
                        <div key={idx} className="p-2.5 sm:p-3 md:p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2 max-w-full overflow-x-hidden">
                          <div className="flex items-start gap-2">
                            <Network className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-xs sm:text-sm font-medium text-muted-foreground">IP Address</p>
                              <a
                                href={`http://${entry.ip}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs sm:text-sm md:text-base font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer break-words overflow-wrap-anywhere block"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigator.clipboard.writeText(entry.ip).then(() => {
                                    toast.success(`Copied ${entry.ip} to clipboard`);
                                    setTimeout(() => {
                                      window.open(`http://${entry.ip}`, '_blank', 'noopener,noreferrer');
                                    }, 100);
                                  }).catch(() => {
                                    window.open(`http://${entry.ip}`, '_blank', 'noopener,noreferrer');
                                  });
                                }}
                              >
                                {entry.ip}
                              </a>
                            </div>
                          </div>
                          {entry.password && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Password</p>
                                <p className="text-xs sm:text-sm md:text-base font-mono break-all overflow-wrap-anywhere">{entry.password}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                      <p className="text-xs sm:text-sm text-muted-foreground">No VPN IPs configured</p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-2 pt-4 border-t max-w-full overflow-x-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    {selectedConnection.createdAt && (
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium break-words overflow-wrap-anywhere">
                          {new Date(selectedConnection.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedConnection.updatedAt && (
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Last Updated</p>
                        <p className="font-medium break-words overflow-wrap-anywhere">
                          {new Date(selectedConnection.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedConnection.scheduledForDeletion && (
                    <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg max-w-full overflow-x-hidden">
                      <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-400">
                        Scheduled for Deletion
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 break-words overflow-wrap-anywhere">
                        {getTimeUntilDeletion(selectedConnection.scheduledForDeletion)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to schedule deletion for the internet connection for{' '}
              <span className="font-semibold">{selectedConnection?.station}</span>?
              <br />
              <br />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                The connection will be deleted in 72 hours. You can cancel the deletion before then.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Schedule Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Deletion Dialog */}
      <AlertDialog open={cancelDeleteDialogOpen} onOpenChange={setCancelDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the scheduled deletion for{' '}
              <span className="font-semibold">{selectedConnection?.station}</span>?
              <br />
              <br />
              The connection will remain active and will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelDelete} className="bg-emerald-600 hover:bg-emerald-700">
              Cancel Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

