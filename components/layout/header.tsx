'use client';

import { Bell, Search, ChevronDown, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  return (
    <header className="md:ml-72 fixed md:sticky top-16 md:top-0 right-0 left-0 md:left-auto h-16 bg-white/95 backdrop-blur-md border-b border-gray-100 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
      {/* Left Section - Logo & Search */}
      <div className="flex items-center gap-6 flex-1">
        {/* Logo Section - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">3ICONIC</h1>
            <p className="text-xs text-gray-500 font-medium">Enterprise</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
              placeholder="Search tickets, clients, stations..."
              className="pl-10 h-9 bg-gray-50/80 border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200 text-sm"
          />
          </div>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="gap-2.5 h-9 px-2.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm ring-2 ring-white">
                <span className="text-xs font-semibold text-white">AU</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-none">Admin User</p>
                <p className="text-xs text-gray-500 leading-none mt-0.5">admin@example.com</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
            <div className="px-3 py-2.5 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">AU</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Admin User</p>
                  <p className="text-xs text-gray-500 truncate">admin@example.com</p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem className="gap-2.5 px-3 py-2.5 cursor-pointer rounded-md">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5 px-3 py-2.5 cursor-pointer rounded-md">
              <LogOut className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
