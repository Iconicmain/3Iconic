'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, DollarSign, Warehouse, Package, Settings, Menu, X, ChevronRight, Users, Calculator, Wifi, MessageSquare, ClipboardList, ClipboardCheck, CheckSquare, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    name: 'Jobs',
    href: '/admin/jobs',
    icon: Briefcase,
    description: 'Manage job positions',
    pageId: 'jobs'
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
  {
    name: 'Station Tasks',
    href: '/admin/station-tasks',
    icon: CheckSquare,
    description: 'Track station tasks',
    pageId: 'station-tasks'
  },
  {
    name: 'Inventory',
    href: '/admin/inventory',
    icon: Package,
    description: 'Inventory command center',
    pageId: 'inventory'
  },
  {
    name: 'Station Assignments',
    href: '/admin/inventory/station-assignments',
    icon: Warehouse,
    description: 'Assign inventory stations',
    pageId: 'inventory-station-assignments',
    superAdminOnly: true
  },
];

const PERMISSIONS_CACHE_KEY = 'sidebar-allowed-pages-v1';
const PERMISSIONS_CACHE_TTL_MS = 10 * 60 * 1000;

function buildAllowedPages(currentUser: {
  role?: string;
  pagePermissions?: { pageId: string; permissions?: string[] }[];
}): Set<string> {
  if (currentUser.role === 'superadmin') {
    return new Set(navigation.map((item) => item.pageId));
  }

  const allowed = new Set<string>();
  currentUser.pagePermissions?.forEach((perm) => {
    if (perm.permissions?.includes('view')) {
      allowed.add(perm.pageId);
    }
  });

  navigation.forEach((item) => {
    if (item.superAdminOnly) {
      allowed.delete(item.pageId);
    }
  });

  return allowed;
}

function readCachedAllowedPages(): Set<string> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(PERMISSIONS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { pages: string[]; ts: number };
    if (!Array.isArray(parsed.pages) || Date.now() - parsed.ts > PERMISSIONS_CACHE_TTL_MS) {
      return null;
    }

    return new Set(parsed.pages);
  } catch {
    return null;
  }
}

function writeCachedAllowedPages(pages: Set<string>) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(
      PERMISSIONS_CACHE_KEY,
      JSON.stringify({ pages: [...pages], ts: Date.now() })
    );
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const cachedPages = readCachedAllowedPages();
  const [allowedPages, setAllowedPages] = useState<Set<string>>(cachedPages ?? new Set());
  const [loading, setLoading] = useState(cachedPages === null);

  useEffect(() => {
    let cancelled = false;

    const fetchUserPermissions = async () => {
      try {
        const response = await fetch('/api/users/me', { cache: 'no-store' });
        const currentUser = await response.json();

        if (!response.ok || cancelled) return;

        const allowed = buildAllowedPages(currentUser);
        setAllowedPages(allowed);
        writeCachedAllowedPages(allowed);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        if (!cancelled && !cachedPages) {
          setAllowedPages(new Set());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUserPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredNavigation = navigation.filter((item) => {
    if (item.pageId === 'equipment-requests' || item.pageId === 'station-tasks') {
      return !loading || allowedPages.size > 0;
    }
    return allowedPages.has(item.pageId);
  });

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#1a472a] to-[#0f3621] border-b border-[#2d6a3f] flex items-center px-4 z-50">
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
        <div className="hidden md:flex items-center gap-3 mb-8 pb-8 border-b border-[#2d6a3f]">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">3ICONIC</h1>
            <p className="text-xs text-emerald-300 font-medium">Enterprise</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider px-2 mb-4">Main Menu</p>
          {loading && filteredNavigation.length === 0 ? (
            <div className="px-4 py-3 text-emerald-200 text-sm">Loading menu…</div>
          ) : filteredNavigation.length === 0 ? (
            <div className="px-4 py-3 text-emerald-200/70 text-sm">No pages available</div>
          ) : (
            filteredNavigation.map((item) => {
              if (item.superAdminOnly && !allowedPages.has(item.pageId)) {
                return null;
              }

              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={handleNavClick}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-white shadow-lg border border-emerald-500/30'
                      : 'text-emerald-100 hover:text-white hover:bg-white/5 border border-transparent'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}

                  <div
                    className={cn(
                      'p-2 rounded-md transition-all duration-300',
                      isActive
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'bg-white/5 text-emerald-200 group-hover:bg-emerald-500/20 group-hover:text-emerald-300'
                    )}
                  >
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

        <div className="pt-6 border-t border-[#2d6a3f] mt-auto">
          <div className="bg-white/5 border border-emerald-500/20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-white mb-2">Pro Version</p>
            <p className="text-xs text-emerald-200/80 leading-relaxed">Full access to all features and premium support</p>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 mt-16 max-md:backdrop-blur-none"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
