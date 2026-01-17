'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Loader2, CheckCircle2, Circle, Trash2, Edit, MapPin, Users, ChevronDown, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Technician {
  _id?: string;
  name: string;
  phone: string;
}

interface StationTask {
  _id?: string;
  title: string;
  stationId: string;
  stationName: string;
  description?: string;
  status: 'pending' | 'done';
  technicians?: Array<{ technicianId: string; name: string; phone: string }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

interface Station {
  _id?: string;
  stationId: string;
  name: string;
  location: string;
  region: string;
}

export default function StationTasksClient() {
  const [tasks, setTasks] = useState<StationTask[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formStationId, setFormStationId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTechnicianIds, setFormTechnicianIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStations();
    fetchTechnicians();
  }, []);

  // Refetch technicians when form opens (in case they were added recently)
  useEffect(() => {
    if (formOpen) {
      fetchTechnicians();
    }
  }, [formOpen]);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (response.ok) {
        setStations(data.stations || []);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians');
      const data = await response.json();
      if (response.ok) {
        // Ensure _id is converted to string for MongoDB ObjectIds
        const formattedTechnicians = (data.technicians || []).map((tech: any) => ({
          ...tech,
          _id: tech._id?.toString() || tech._id,
        }));
        console.log('Fetched technicians:', formattedTechnicians.length);
        setTechnicians(formattedTechnicians);
      } else {
        console.error('Failed to fetch technicians:', data.error);
        toast.error('Failed to fetch technicians');
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to fetch technicians');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/station-tasks');
      const data = await response.json();
      if (response.ok) {
        setTasks(data.tasks || []);
      } else {
        toast.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!formTitle.trim() || !formStationId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedStation = stations.find(s => s.stationId === formStationId);
    if (!selectedStation) {
      toast.error('Selected station not found');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/station-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          stationId: formStationId,
          stationName: selectedStation.name,
          description: formDescription,
          technicianIds: formTechnicianIds,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Task created successfully');
        setFormOpen(false);
        setFormTitle('');
        setFormStationId('');
        setFormDescription('');
        setFormTechnicianIds([]);
        fetchTasks();
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: StationTask) => {
    const newStatus = task.status === 'pending' ? 'done' : 'pending';
    try {
      const response = await fetch(`/api/station-tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Task marked as ${newStatus}`);
        fetchTasks();
      } else {
        toast.error(data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/station-tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Task deleted successfully');
        fetchTasks();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter === 'all' || task.status === filter;
    const matchesStation = stationFilter === 'all' || task.stationId === stationFilter;
    return matchesStatus && matchesStation;
  });

  const selectedStation = stations.find(s => s.stationId === formStationId);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="md:ml-72 flex-1 min-w-0">
        <Header />
        <main className="mt-16 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Station Tasks</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Track and manage tasks that need to be completed at each station
              </p>
            </div>
            <Button 
              onClick={() => setFormOpen(true)} 
              size="lg" 
              className="shadow-md w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          {/* Stats - Moved to top */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="text-2xl sm:text-3xl font-bold">{tasks.length}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                    {tasks.filter(t => t.status === 'pending').length}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Completed</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'done').length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" suppressHydrationWarning>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" suppressHydrationWarning>
                <SelectValue placeholder="Filter by station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                {stations.map((station) => (
                  <SelectItem key={station._id || station.stationId} value={station.stationId}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <CheckSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  {filter !== 'all' || stationFilter !== 'all' 
                    ? 'Try adjusting your filters to see more tasks.'
                    : 'Get started by creating your first station task.'}
                </p>
                <Button onClick={() => setFormOpen(true)} size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {filteredTasks.map((task) => (
                <Card 
                  key={task._id} 
                  className={cn(
                    'transition-all hover:shadow-lg border-l-4',
                    task.status === 'done' 
                      ? 'border-l-green-500 opacity-75 hover:opacity-90' 
                      : 'border-l-yellow-500 hover:border-l-yellow-600'
                  )}
                >
                  <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <button
                            onClick={() => handleToggleStatus(task)}
                            className="mt-0.5 sm:mt-1 transition-transform hover:scale-110 active:scale-95 touch-manipulation"
                            title={task.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                          >
                            {task.status === 'done' ? (
                              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-green-600 transition-colors" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={cn(
                                'text-base sm:text-lg font-semibold break-words',
                                task.status === 'done' && 'line-through text-muted-foreground'
                              )}>
                                {task.title}
                              </h3>
                              <Badge 
                                variant={task.status === 'done' ? 'default' : 'secondary'}
                                className={cn(
                                  'text-xs',
                                  task.status === 'done' 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                )}
                              >
                                {task.status === 'pending' ? 'Pending' : 'Completed'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 ml-7 sm:ml-9">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span className="font-medium">{task.stationName}</span>
                            <span className="text-muted-foreground/60 hidden sm:inline">•</span>
                            <span className="text-muted-foreground/80">{task.stationId}</span>
                          </div>
                          {task.technicians && task.technicians.length > 0 && (
                            <div className="flex items-start gap-2 text-xs sm:text-sm">
                              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-muted-foreground mr-2">Assigned to:</span>
                                <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1">
                                  {task.technicians.map((tech, idx) => (
                                    <Badge 
                                      key={tech.technicianId || idx} 
                                      variant="outline" 
                                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      {tech.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {task.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <span>Created:</span>
                              <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</span>
                            </span>
                            {task.completedAt && (
                              <span className="flex items-center gap-1">
                                <span>Completed:</span>
                                <span className="font-medium text-green-700">{new Date(task.completedAt).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task._id!)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Task Dialog */}
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogContent 
              className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0"
              suppressHydrationWarning
            >
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">Create New Station Task</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Add a task that needs to be completed at a station and assign technicians
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Task Title *</Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Replace router, Install new equipment"
                    className="h-11 text-base sm:text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="station" className="text-sm font-semibold">Station *</Label>
                  <Select value={formStationId} onValueChange={setFormStationId}>
                    <SelectTrigger className="h-11 text-base sm:text-sm" suppressHydrationWarning>
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station._id || station.stationId} value={station.stationId}>
                          {station.name} ({station.stationId}) - {station.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Assign Technicians (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select multiple technicians - they will receive SMS notifications
                  </p>
                  <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-11 text-base sm:text-sm"
                        suppressHydrationWarning
                      >
                        <span className="truncate">
                          {formTechnicianIds.length === 0
                            ? 'Select technicians (multiple allowed)...'
                            : formTechnicianIds.length === 1
                            ? technicians.find(t => t._id === formTechnicianIds[0])?.name || '1 technician selected'
                            : `${formTechnicianIds.length} technicians selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" suppressHydrationWarning>
                      <div className="p-3 border-b bg-muted/50">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            Select multiple technicians
                          </p>
                          {technicians.length > 0 && formTechnicianIds.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormTechnicianIds([]);
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground underline"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {technicians.length === 0 ? (
                          <div className="py-8 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No technicians available</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add technicians from the Tickets page
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {technicians.map((tech) => {
                              const isSelected = formTechnicianIds.includes(tech._id!);
                              return (
                                <div
                                  key={tech._id}
                                  className={cn(
                                    "flex items-center space-x-2 p-2.5 rounded-md cursor-pointer transition-colors touch-manipulation",
                                    isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-accent"
                                  )}
                                  onClick={() => {
                                    if (isSelected) {
                                      setFormTechnicianIds(prev => prev.filter(id => id !== tech._id));
                                    } else {
                                      setFormTechnicianIds(prev => [...prev, tech._id!]);
                                    }
                                  }}
                                >
                                  <Checkbox
                                    id={`tech-${tech._id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => {
                                      if (isSelected) {
                                        setFormTechnicianIds(prev => prev.filter(id => id !== tech._id));
                                      } else {
                                        setFormTechnicianIds(prev => [...prev, tech._id!]);
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`tech-${tech._id}`}
                                    className="flex-1 text-sm font-medium leading-none cursor-pointer break-words"
                                  >
                                    {tech.name}
                                    {tech.phone && <span className="text-muted-foreground ml-2 text-xs">({tech.phone})</span>}
                                  </label>
                                  {isSelected && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200 shrink-0">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {/* Show selected technicians as badges */}
                  {formTechnicianIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formTechnicianIds.map((techId) => {
                        const tech = technicians.find(t => t._id === techId);
                        if (!tech) return null;
                        return (
                          <Badge
                            key={techId}
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                          >
                            <Users className="w-3 h-3 mr-1" />
                            {tech.name}
                            <button
                              type="button"
                              onClick={() => setFormTechnicianIds(prev => prev.filter(id => id !== techId))}
                              className="ml-1.5 hover:text-red-600 transition-colors"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Additional details about the task, requirements, or special instructions..."
                    rows={4}
                    className="resize-none text-base sm:text-sm"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
                <Button 
                  variant="outline" 
                  onClick={() => setFormOpen(false)} 
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTask} 
                  disabled={submitting} 
                  size="lg" 
                  className="min-w-[120px] w-full sm:w-auto order-1 sm:order-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

