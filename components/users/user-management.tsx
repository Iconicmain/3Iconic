'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Save, X, UserPlus, Users, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PagePermission {
  pageId: string;
  permissions: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  pagePermissions: PagePermission[];
  role: 'superadmin' | 'admin' | 'user';
  approved?: boolean;
}

interface AvailablePage {
  id: string;
  name: string;
  path: string;
}

const PERMISSION_TYPES = ['view', 'add', 'edit', 'delete'] as const;

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [currentUserRole, setCurrentUserRole] = useState<'superadmin' | 'admin' | 'user'>('user');
  const [currentUserPermissions, setCurrentUserPermissions] = useState<PagePermission[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    image: '',
    role: 'user' as 'superadmin' | 'admin' | 'user',
    approved: false,
    pagePermissions: [] as PagePermission[],
  });

  const isSuperAdmin = currentUserRole === 'superadmin';
  
  // Check if user has edit permission on users page to add users
  const canAddUser = isSuperAdmin || (() => {
    const usersPagePermission = currentUserPermissions.find(p => p.pageId === 'users');
    return usersPagePermission?.permissions.includes('edit') || false;
  })();

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserRole(data.role || 'user');
        
        // Also fetch full user data to get permissions
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const currentUser = usersData.users?.find((u: User) => u.email === data.email);
          if (currentUser) {
            setCurrentUserPermissions(currentUser.pagePermissions || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      // Filter out superadmins from the user list - they shouldn't be displayed
      const filteredUsers = (data.users || []).filter((user: User) => user.role !== 'superadmin');
      setUsers(filteredUsers);
      setAvailablePages(data.availablePages || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        image: user.image || '',
        role: user.role,
        approved: user.approved !== undefined ? user.approved : false,
        pagePermissions: user.pagePermissions || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        image: '',
        role: 'user',
        approved: false,
        pagePermissions: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      image: '',
      role: 'user',
      pagePermissions: [],
    });
  };

  const handlePermissionChange = (pageId: string, permission: string, checked: boolean) => {
    console.log(`[handlePermissionChange] ${pageId} ${permission} ${checked}`);
    setFormData((prev) => {
      const existingPage = prev.pagePermissions.find((p) => p.pageId === pageId);
      let newPermissions = [...prev.pagePermissions];

      if (existingPage) {
        if (checked) {
          // Add permission if not already present
          if (!existingPage.permissions.includes(permission)) {
            existingPage.permissions.push(permission);
          }
        } else {
          // Remove permission
          existingPage.permissions = existingPage.permissions.filter((p) => p !== permission);
          // If no permissions left, remove the page entry
          if (existingPage.permissions.length === 0) {
            newPermissions = newPermissions.filter((p) => p.pageId !== pageId);
          }
        }
      } else if (checked) {
        // Add new page with permission
        newPermissions.push({ pageId, permissions: [permission] });
      }

      console.log(`[handlePermissionChange] New permissions:`, newPermissions);
      return { ...prev, pagePermissions: newPermissions };
    });
  };

  const handleSave = async () => {
    if (!formData.email || !formData.name) {
      toast.error('Email and name are required');
      return;
    }

    // Validate: Admin users must have at least one permission
    if (formData.role === 'admin' && formData.pagePermissions.length === 0) {
      toast.error('Admin users must have at least one page permission. Please grant permissions before saving.');
      return;
    }

    // Validate: Approved users (except superadmin) should have at least one permission
    if (formData.approved && formData.role !== 'superadmin' && formData.pagePermissions.length === 0) {
      toast.error('Approved users must have at least one page permission. Please grant permissions before approving.');
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to save user';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      toast.success(editingUser ? 'User updated successfully' : 'User created successfully');
      handleCloseDialog();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;

    try {
      const response = await fetch(`/api/users/${deleteUserId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const getPagePermission = (user: User, pageId: string): string[] => {
    // Superadmins have all permissions for all pages (including 'add')
    if (user.role === 'superadmin') {
      return ['view', 'add', 'edit', 'delete'];
    }
    const pagePerm = user.pagePermissions.find((p) => p.pageId === pageId);
    return pagePerm?.permissions || [];
  };

  const hasPermission = (user: User, pageId: string, permission: string): boolean => {
    return getPagePermission(user, pageId).includes(permission);
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage user access and permissions for different pages
          </p>
        </div>
        {canAddUser && (
          <Button 
            onClick={() => handleOpenDialog()} 
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="font-semibold">Add User</span>
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      {users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                    Total Users
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                    {users.length}
                  </p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                    Admins
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Regular Users
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {users.filter(u => u.role === 'user').length}
                  </p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">
                    Pages
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100">
                    {availablePages.length}
                  </p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users List */}
      <div className="grid gap-3 sm:gap-4">
        {users.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700">
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No users found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Get started by adding your first user to manage permissions and access
              </p>
              {isSuperAdmin && (
                <Button 
                  onClick={() => handleOpenDialog()} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                  size="lg"
                >
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="font-semibold">Add First User</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card 
              key={user.id} 
              className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {user.image ? (
                      <div className="relative">
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-emerald-200 dark:border-emerald-800 shadow-sm"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                          user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                          user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-1 truncate">
                        {user.name}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground truncate mb-2">
                        {user.email}
                      </CardDescription>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          user.role === 'superadmin'
                            ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-200 border border-red-300 dark:border-red-700'
                            : user.role === 'admin' 
                            ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-200 border border-purple-300 dark:border-purple-700' 
                            : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                        }`}>
                          {user.role === 'superadmin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                        {user.approved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            <XCircle className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {!user.approved && user.role !== 'superadmin' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Use the user's ID or email as fallback
                              const userId = user.id || user.email;
                              console.log(`[Approve] Attempting to approve user with ID: ${userId}`, user);
                              
                              const response = await fetch(`/api/users/${userId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ approved: true }),
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                console.log('[Approve] Success:', data);
                                toast.success('User approved successfully');
                                fetchUsers();
                              } else {
                                // Try to parse error, but handle non-JSON responses
                                let errorMessage = `Failed to approve user (Status: ${response.status})`;
                                try {
                                  const errorData = await response.json();
                                  errorMessage = errorData.error || errorMessage;
                                  console.error('[Approve] Error response:', errorData);
                                } catch (parseError) {
                                  const text = await response.text();
                                  console.error('[Approve] Non-JSON error response:', text);
                                  errorMessage = text || errorMessage;
                                }
                                throw new Error(errorMessage);
                              }
                            } catch (error: any) {
                              console.error('[Approve] Error:', error);
                              toast.error(error.message || 'Failed to approve user');
                            }
                          }}
                          className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-medium">Approve</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                        className="flex-1 sm:flex-initial border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        <span className="text-xs sm:text-sm font-medium">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                            className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            <span className="text-xs sm:text-sm font-medium">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {user.name} ({user.email}). This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteUserId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                  {!isSuperAdmin && (
                    <div className="text-xs sm:text-sm text-muted-foreground italic">
                      Only super admins can manage user permissions and approvals
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Collapsible
                  open={expandedUsers.has(user.id)}
                  onOpenChange={() => toggleUserExpanded(user.id)}
                >
                  <CollapsibleTrigger className="w-full group">
                    <div className="flex items-center justify-between w-full p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 hover:from-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-950/20 dark:hover:to-emerald-900/20 rounded-lg border border-gray-200 dark:border-gray-800 transition-all duration-200 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 group-hover:shadow-sm">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm sm:text-base font-semibold text-foreground block">
                            Page Permissions
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user.pagePermissions.reduce((acc, p) => acc + p.permissions.length, 0)} permissions across {user.pagePermissions.length} pages
                          </span>
                        </div>
                      </div>
                      {expandedUsers.has(user.id) ? (
                        <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-transform" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                      {availablePages.map((page) => {
                    const permissions = getPagePermission(user, page.id);
                    const hasAnyPermission = permissions.length > 0;
                    const permissionCount = permissions.length;

                    return (
                      <div
                        key={page.id}
                        className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                          hasAnyPermission
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm'
                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm sm:text-base text-foreground">{page.name}</h4>
                            {hasAnyPermission && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {page.path}
                          </span>
                        </div>
                         <div className="flex flex-wrap gap-2 sm:gap-3">
                           {PERMISSION_TYPES.map((permission) => {
                             const hasPerm = hasPermission(user, page.id, permission);
                             return (
                               <div
                                 key={permission}
                                 className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border-2 ${
                                   hasPerm
                                     ? 'bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md hover:bg-emerald-600 hover:shadow-lg'
                                     : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                 } ${isSuperAdmin ? 'cursor-pointer' : ''}`}
                                 onClick={isSuperAdmin ? async () => {
                                  // Toggle permission directly
                                  const newPermissions = [...(user.pagePermissions || [])];
                                  const pagePermIndex = newPermissions.findIndex(p => p.pageId === page.id);
                                  
                                  if (hasPerm) {
                                    // Remove permission
                                    if (pagePermIndex >= 0) {
                                      const pagePerm = newPermissions[pagePermIndex];
                                      pagePerm.permissions = pagePerm.permissions.filter(p => p !== permission);
                                      if (pagePerm.permissions.length === 0) {
                                        newPermissions.splice(pagePermIndex, 1);
                                      }
                                    }
                                  } else {
                                    // Add permission
                                    if (pagePermIndex >= 0) {
                                      if (!newPermissions[pagePermIndex].permissions.includes(permission)) {
                                        newPermissions[pagePermIndex].permissions.push(permission);
                                      }
                                    } else {
                                      newPermissions.push({
                                        pageId: page.id,
                                        permissions: [permission]
                                      });
                                    }
                                  }
                                  
                                  // Update user via API
                                  try {
                                    const response = await fetch(`/api/users/${user.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        pagePermissions: newPermissions
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      toast.success(`Permission ${hasPerm ? 'removed' : 'granted'} successfully`);
                                      fetchUsers();
                                    } else {
                                      const error = await response.json();
                                      toast.error(error.error || 'Failed to update permission');
                                    }
                                  } catch (error: any) {
                                    console.error('Error updating permission:', error);
                                    toast.error('Failed to update permission');
                                  }
                                } : undefined}
                              >
                                 {isSuperAdmin && (
                                   <Checkbox
                                     checked={hasPerm}
                                     onCheckedChange={() => {}} // Handled by onClick on parent div
                                     className={`w-4 h-4 border-2 transition-all ${
                                       hasPerm
                                         ? 'border-white bg-white data-[state=checked]:bg-white data-[state=checked]:border-white'
                                         : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700'
                                     }`}
                                     onClick={(e) => e.stopPropagation()}
                                   />
                                 )}
                                 {!isSuperAdmin && (
                                   <div
                                     className={`w-2.5 h-2.5 rounded-full ${
                                       hasPerm ? 'bg-white' : 'bg-gray-400 dark:bg-gray-500'
                                     }`}
                                   />
                                 )}
                                {permission.charAt(0).toUpperCase() + permission.slice(1)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-h-[95vh]">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-800">
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-1">
              {editingUser
                ? 'Update user information and permissions'
                : 'Create a new user and set their page permissions'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 sm:space-y-6 py-4 sm:py-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    disabled={!!editingUser}
                    className="h-11 border-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-11 border-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="image" className="text-sm font-medium">Image URL (optional)</Label>
                  <Input
                    id="image"
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="h-11 border-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900"
                  />
                </div>
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'superadmin' | 'admin' | 'user';
                        // Superadmins and admins are auto-approved and get all permissions
                        const isSuperAdminRole = newRole === 'superadmin';
                        const isAdmin = newRole === 'admin';
                        
                        setFormData({ 
                          ...formData, 
                          role: newRole,
                          approved: isSuperAdminRole || isAdmin ? true : formData.approved,
                          pagePermissions: isSuperAdminRole 
                            ? availablePages.map((page) => ({
                                pageId: page.id,
                                permissions: ['view', 'add', 'edit', 'delete'],
                              }))
                            : formData.pagePermissions
                        });
                      }}
                      className="h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 dark:focus-visible:ring-emerald-900 focus-visible:border-emerald-500 transition-colors"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                    {formData.role === 'admin' && formData.pagePermissions.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Admin users must have at least one page permission. Please grant permissions below.</span>
                      </p>
                    )}
                  </div>
                )}
                {!isSuperAdmin && !editingUser && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                    <div className="h-11 px-3 py-2 text-sm text-muted-foreground bg-muted rounded-md border-2 border-input">
                      User (Only super admins can set roles)
                    </div>
                  </div>
                )}
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                    <Checkbox
                      id="approved"
                      checked={formData.approved}
                      onCheckedChange={(checked) => setFormData({ ...formData, approved: checked as boolean })}
                      disabled={formData.role === 'superadmin' || formData.role === 'admin'}
                      className="border-2"
                    />
                    <div className="flex-1">
                      <Label htmlFor="approved" className="text-sm font-medium cursor-pointer">
                        Approved
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formData.role === 'superadmin' || formData.role === 'admin'
                          ? `${formData.role === 'superadmin' ? 'Super admins' : 'Admins'} are automatically approved`
                          : 'Check to approve this user'}
                      </p>
                      {formData.approved && formData.role !== 'superadmin' && formData.role !== 'admin' && formData.pagePermissions.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Approved users must have at least one page permission to access the system.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!isSuperAdmin && !editingUser && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Approved
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        New users require super admin approval. Only super admins can approve users.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Page Permissions - Only visible to superadmins */}
            {isSuperAdmin && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-5 sm:pt-6">
                <p className="text-xs text-muted-foreground mb-4">
                  Only super admins can set page permissions. Users with edit permission can add users but cannot set permissions.
                </p>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-semibold uppercase tracking-wider">Page Permissions</Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.pagePermissions.reduce((acc, p) => acc + p.permissions.length, 0)} permissions selected
                  </span>
                </div>
                <div className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2">
                  {availablePages.map((page) => {
                    const pagePerm = formData.pagePermissions.find((p) => p.pageId === page.id);
                    const currentPermissions = pagePerm?.permissions || [];
                    const hasAnyPermission = currentPermissions.length > 0;

                    return (
                      <div
                        key={page.id}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          hasAnyPermission
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-foreground">{page.name}</h4>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{page.path}</p>
                          </div>
                          {hasAnyPermission && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 w-fit">
                              {currentPermissions.length} {currentPermissions.length === 1 ? 'permission' : 'permissions'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                          {PERMISSION_TYPES.map((permission) => {
                            const isChecked = currentPermissions.includes(permission);
                            return (
                              <Label
                                key={permission}
                                htmlFor={`${page.id}-${permission}`}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer border-2 ${
                                  isChecked 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 dark:border-emerald-500 shadow-md' 
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                }`}
                              >
                                <Checkbox
                                  id={`${page.id}-${permission}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    console.log(`[Dialog] Toggling ${page.id} ${permission} to ${checked}`);
                                    handlePermissionChange(page.id, permission, checked as boolean);
                                  }}
                                  className={`w-5 h-5 border-2 cursor-pointer transition-all ${
                                    isChecked
                                      ? 'border-white bg-white data-[state=checked]:bg-white data-[state=checked]:border-white'
                                      : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700'
                                  }`}
                                  disabled={false}
                                />
                                <span
                                  className={`text-sm font-semibold ${
                                    isChecked 
                                      ? 'text-white' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {permission.charAt(0).toUpperCase() + permission.slice(1)}
                                </span>
                              </Label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!isSuperAdmin && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-5 sm:pt-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    Only super admins can manage user permissions, roles, and approvals.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-gray-200 dark:border-gray-800 pt-4 sm:pt-5 gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={handleCloseDialog}
              className="flex-1 sm:flex-initial border-2 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            {isSuperAdmin && (
              <Button 
                onClick={handleSave}
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                <span className="font-semibold">{editingUser ? 'Update' : 'Create'} User</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

