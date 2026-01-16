'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, DollarSign, Warehouse, Package, Settings, Menu, X, ChevronRight, Users, Calculator, Wifi, MessageSquare, ClipboardList, ClipboardCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AVAILABLE_PAGES } from '@/lib/constants';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview & metrics',
    pageId: 'dashboard'
  },
  {
    name: 'Tickets',
    href: '/admin/tickets',
    icon: Ticket,
    description: 'Manage support tickets',
    pageId: 'tickets'
  },
  {
    name: 'Expenses',
    href: '/admin/expenses',
    icon: DollarSign,
    description: 'Track spending',
    pageId: 'expenses'
  },
  {
    name: 'Stations',
    href: '/admin/stations',
    icon: Warehouse,
    description: 'Station management',
    pageId: 'stations'
  },
  {
    name: 'Equipment',
    href: '/admin/equipment',
    icon: Package,
    description: 'Equipment inventory',
    pageId: 'equipment'
  },
  {
    name: 'Internet Connections',
    href: '/admin/internet-connections',
    icon: Wifi,
    description: 'Starlink & VPN IPs',
    pageId: 'internet-connections',
    superAdminOnly: true
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management',
    pageId: 'users'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Configuration',
    pageId: 'settings'
  },
  {
    name: 'Ticket Costs',
    href: '/admin/ticket-costs',
    icon: Calculator,
    description: 'Calculate ticket costs',
    pageId: 'ticket-costs',
    superAdminOnly: true
  },
  {
    name: 'Send Message',
    href: '/admin/send-message',
    icon: MessageSquare,
    description: 'Send SMS to clients',
    pageId: 'send-message'
  },
  {
    name: 'Request Equipment',
    href: '/admin/equipment-requests',
    icon: ClipboardList,
    description: 'Request equipment',
    pageId: 'equipment-requests'
  },
  {
    name: 'Manage Requests',
    href: '/admin/manage-requests',
    icon: ClipboardCheck,
    description: 'Review requests',
    pageId: 'manage-requests',
    superAdminOnly: true
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [allowedPages, setAllowedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        // Find current user
        const usersResponse = await fetch('/api/users/me');
        const userData = await usersResponse.json();
        
        // Get current user from users list
        const currentUser = data.users?.find((u: any) => u.email === userData.email);
        
        if (currentUser) {
          // Superadmins have access to all pages
          if (currentUser.role === 'superadmin') {
            setAllowedPages(new Set(navigation.map(item => item.pageId)));
          } else {
            // Filter pages user has view permission for (excluding super admin only pages)
            const allowed = new Set<string>();
            if (currentUser.pagePermissions) {
              currentUser.pagePermissions.forEach((perm: any) => {
                if (perm.permissions && perm.permissions.includes('view')) {
                  allowed.add(perm.pageId);
                }
              });
            }
            // Remove super admin only pages
            navigation.forEach(item => {
              if ((item as any).superAdminOnly) {
                allowed.delete(item.pageId);
              }
            });
            setAllowedPages(allowed);
          }
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        // On error, show no pages (fail secure)
        setAllowedPages(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);

  // Filter navigation items based on user permissions
  // Always show equipment-requests for authenticated users
  const filteredNavigation = navigation.filter(item => {
    if (item.pageId === 'equipment-requests') {
      return !loading; // Show if user is authenticated (loading is false)
    }
    return allowedPages.has(item.pageId);
  });

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <h1 className="ml-4 font-bold text-lg text-sidebar-foreground">3ICONIC</h1>
      </div>

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-[#1a472a] via-[#1a472a] to-[#0f3621] border-r border-[#2d6a3f] p-6 pt-24 md:pt-8 md:translate-x-0 transition-transform z-40 shadow-2xl flex flex-col overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="hidden md:flex items-center gap-3 mb-8 pb-8 border-b border-[#2d6a3f]">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">3ICONIC</h1>
            <p className="text-xs text-emerald-300 font-medium">Enterprise</p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-2">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider px-2 mb-4">Main Menu</p>
          {loading ? (
            <div className="px-4 py-3 text-emerald-200 text-sm">Loading...</div>
          ) : filteredNavigation.length === 0 ? (
            <div className="px-4 py-3 text-emerald-200/70 text-sm">No pages available</div>
          ) : (
            filteredNavigation.map((item: any, index) => {
              // Skip super admin only pages for non-superadmins
              if (item.superAdminOnly && !allowedPages.has(item.pageId)) {
                return null;
              }
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-white shadow-lg border border-emerald-500/30'
                    : 'text-emerald-100 hover:text-white hover:bg-white/5 border border-transparent'
                )}
              >
                {/* Background shine effect for active state */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                
                <div className={cn(
                  'p-2 rounded-md transition-all duration-300',
                  isActive
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 text-emerald-200 group-hover:bg-emerald-500/20 group-hover:text-emerald-300'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-emerald-300/70 truncate">{item.description}</p>
                </div>

                {isActive && (
                  <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 relative z-10" />
                )}
              </Link>
            );
            })
          )}
        </nav>

        {/* Footer Section */}
        <div className="pt-6 border-t border-[#2d6a3f] mt-auto">
          <div className="bg-white/5 border border-emerald-500/20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-white mb-2">Pro Version</p>
            <p className="text-xs text-emerald-200/80 leading-relaxed">Full access to all features and premium support</p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 mt-16 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
