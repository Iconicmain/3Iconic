// Shared constants for the application

// Define available pages and their permissions
export const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/admin' },
  { id: 'tickets', name: 'Tickets', path: '/admin/tickets' },
  { id: 'expenses', name: 'Expenses', path: '/admin/expenses' },
  { id: 'stations', name: 'Stations', path: '/admin/stations' },
  { id: 'equipment', name: 'Equipment', path: '/admin/equipment' },
  { id: 'internet-connections', name: 'Internet Connections', path: '/admin/internet-connections' },
  { id: 'users', name: 'User Management', path: '/admin/users' },
  { id: 'settings', name: 'Settings', path: '/admin/settings' },
  { id: 'send-message', name: 'Send Message', path: '/admin/send-message' },
  { id: 'equipment-requests', name: 'Request Equipment', path: '/admin/equipment-requests' },
  { id: 'manage-requests', name: 'Manage Requests', path: '/admin/manage-requests' },
  { id: 'station-tasks', name: 'Station Tasks', path: '/admin/station-tasks' },
] as const;

export const PERMISSION_TYPES = ['view', 'add', 'edit', 'delete'] as const;
export type PermissionType = typeof PERMISSION_TYPES[number];

