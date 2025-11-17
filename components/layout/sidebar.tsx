'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, DollarSign, Warehouse, Package, Settings, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Overview & metrics'
  },
  {
    name: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    description: 'Manage support tickets'
  },
  {
    name: 'Expenses',
    href: '/expenses',
    icon: DollarSign,
    description: 'Track spending'
  },
  {
    name: 'Stations',
    href: '/stations',
    icon: Warehouse,
    description: 'Station management'
  },
  {
    name: 'Equipment',
    href: '/equipment',
    icon: Package,
    description: 'Equipment inventory'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configuration'
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
          {navigation.map((item, index) => {
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
          })}
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
