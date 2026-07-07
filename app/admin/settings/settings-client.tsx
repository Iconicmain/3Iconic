'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Lock, Users, Palette, Save, Store, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPageClient() {
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Shop settings state
  const [shopSettings, setShopSettings] = useState({
    isClosed: false,
    closureType: null as 'manual' | 'automatic' | null,
    manualCloseDate: '',
    automaticSchedule: {
      enabled: false,
      daysOfWeek: [] as number[],
      startTime: '00:00',
      endTime: '23:59',
      timezone: 'Africa/Nairobi',
    },
    message: 'We are currently closed. Please check back later.',
  });

  useEffect(() => {
    fetchUserRole();
    fetchShopSettings();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setIsSuperAdmin(data.role === 'superadmin');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopSettings = async () => {
    try {
      const response = await fetch('/api/settings/shop');
      if (response.ok) {
        const data = await response.json();
        setShopSettings({
          isClosed: data.isClosed || false,
          closureType: data.closureType || null,
          manualCloseDate: data.manualCloseDate 
            ? new Date(data.manualCloseDate).toISOString().slice(0, 16)
            : '',
          automaticSchedule: data.automaticSchedule || {
            enabled: false,
            daysOfWeek: [],
            startTime: '00:00',
            endTime: '23:59',
            timezone: 'Africa/Nairobi',
          },
          message: data.message || 'We are currently closed. Please check back later.',
        });
      }
    } catch (error) {
      console.error('Error fetching shop settings:', error);
    }
  };

  const handleSaveShopSettings = async () => {
    try {
      const response = await fetch('/api/settings/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopSettings),
      });

      if (response.ok) {
        toast.success('Shop settings saved successfully');
        fetchShopSettings();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save shop settings');
      }
    } catch (error) {
      toast.error('Error saving shop settings');
      console.error(error);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    const days = [...shopSettings.automaticSchedule.daysOfWeek];
    const index = days.indexOf(day);
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    setShopSettings({
      ...shopSettings,
      automaticSchedule: {
        ...shopSettings.automaticSchedule,
        daysOfWeek: days.sort(),
      },
    });
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <div className="mt-32 md:mt-0 pt-20 md:pt-0">
          <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto p-6">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your account and system preferences</p>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="account" className="space-y-6">
                <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <TabsTrigger value="account" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Account</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">Notifications</span>
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span className="hidden sm:inline">Appearance</span>
                  </TabsTrigger>
                  {isSuperAdmin && (
                    <TabsTrigger value="shop" className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span className="hidden sm:inline">Shop</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Account Settings */}
                <TabsContent value="account" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Information</CardTitle>
                      <CardDescription>Update your account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                        <Input placeholder="Admin User" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Email Address</label>
                        <Input placeholder="admin@example.com" type="email" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Company</label>
                        <Input placeholder="Your Company" />
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage your security preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Current Password</label>
                        <Input placeholder="••••••••" type="password" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
                        <Input placeholder="••••••••" type="password" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Confirm Password</label>
                        <Input placeholder="••••••••" type="password" />
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Update Password
                      </Button>

                      <div className="pt-6 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                          </div>
                          <Button 
                            variant={twoFactor ? 'destructive' : 'outline'}
                            onClick={() => setTwoFactor(!twoFactor)}
                          >
                            {twoFactor ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notifications Settings */}
                <TabsContent value="notifications" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>Choose what notifications you receive</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        {[
                          { label: 'Ticket Updates', description: 'Receive notifications for ticket status changes' },
                          { label: 'Expense Alerts', description: 'Get alerted for high-value expenses' },
                          { label: 'Station Reports', description: 'Weekly reports on station performance' },
                          { label: 'Equipment Maintenance', description: 'Reminders for equipment maintenance' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                              <p className="font-medium text-foreground">{item.label}</p>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                            <input type="checkbox" defaultChecked className="w-5 h-5" />
                          </div>
                        ))}
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Appearance Settings */}
                <TabsContent value="appearance" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize how the dashboard looks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-3 block">Theme</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'light', label: 'Light', icon: '☀️' },
                            { id: 'dark', label: 'Dark', icon: '🌙' },
                            { id: 'system', label: 'System', icon: '💻' },
                          ].map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setTheme(option.id)}
                              className={`p-4 rounded-lg border-2 transition-all text-center ${
                                theme === option.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <span className="text-2xl block mb-2">{option.icon}</span>
                              <p className="text-sm font-medium">{option.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border">
                        <p className="text-sm font-medium text-foreground mb-3">Color Accent</p>
                        <div className="flex gap-3">
                          {[
                            { name: 'Emerald', color: 'bg-emerald-500' },
                            { name: 'Blue', color: 'bg-blue-500' },
                            { name: 'Purple', color: 'bg-purple-500' },
                            { name: 'Rose', color: 'bg-rose-500' },
                          ].map((accent) => (
                            <button
                              key={accent.name}
                              className={`w-10 h-10 rounded-full ${accent.color} hover:ring-2 ring-offset-2 transition-all`}
                              title={accent.name}
                            />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Shop Management (Super Admin Only) */}
                {isSuperAdmin && (
                  <TabsContent value="shop" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Shop Management</CardTitle>
                        <CardDescription>Control shop availability and closure schedules</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Shop Status Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div>
                            <p className="font-medium text-foreground">Shop Status</p>
                            <p className="text-sm text-muted-foreground">
                              {shopSettings.isClosed ? 'Shop is currently closed' : 'Shop is currently open'}
                            </p>
                          </div>
                          <Switch
                            checked={shopSettings.isClosed}
                            onCheckedChange={(checked) =>
                              setShopSettings({ ...shopSettings, isClosed: checked })
                            }
                          />
                        </div>

                        {/* Closure Type Selection */}
                        <div className="space-y-2">
                          <Label>Closure Type</Label>
                          <Select
                            value={shopSettings.closureType || 'none'}
                            onValueChange={(value) =>
                              setShopSettings({
                                ...shopSettings,
                                closureType: value === 'none' ? null : (value as 'manual' | 'automatic'),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Schedule (Manual Only)</SelectItem>
                              <SelectItem value="manual">Manual Timeline</SelectItem>
                              <SelectItem value="automatic">Automatic Schedule</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Manual Timeline */}
                        {shopSettings.closureType === 'manual' && (
                          <div className="space-y-2 p-4 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar className="w-4 h-4 text-primary" />
                              <Label className="font-semibold">Manual Close Date & Time</Label>
                            </div>
                            <Input
                              type="datetime-local"
                              value={shopSettings.manualCloseDate}
                              onChange={(e) =>
                                setShopSettings({ ...shopSettings, manualCloseDate: e.target.value })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              The shop will automatically close at this date and time
                            </p>
                          </div>
                        )}

                        {/* Automatic Schedule */}
                        {shopSettings.closureType === 'automatic' && (
                          <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="w-4 h-4 text-primary" />
                              <Label className="font-semibold">Automatic Schedule</Label>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Enable Automatic Schedule</Label>
                                <p className="text-xs text-muted-foreground">
                                  Automatically close shop based on schedule
                                </p>
                              </div>
                              <Switch
                                checked={shopSettings.automaticSchedule.enabled}
                                onCheckedChange={(checked) =>
                                  setShopSettings({
                                    ...shopSettings,
                                    automaticSchedule: {
                                      ...shopSettings.automaticSchedule,
                                      enabled: checked,
                                    },
                                  })
                                }
                              />
                            </div>

                            {shopSettings.automaticSchedule.enabled && (
                              <>
                                <div className="space-y-2">
                                  <Label>Days of Week</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {daysOfWeek.map((day) => (
                                      <Button
                                        key={day.value}
                                        type="button"
                                        variant={
                                          shopSettings.automaticSchedule.daysOfWeek.includes(day.value)
                                            ? 'default'
                                            : 'outline'
                                        }
                                        size="sm"
                                        onClick={() => toggleDayOfWeek(day.value)}
                                      >
                                        {day.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input
                                      type="time"
                                      value={shopSettings.automaticSchedule.startTime}
                                      onChange={(e) =>
                                        setShopSettings({
                                          ...shopSettings,
                                          automaticSchedule: {
                                            ...shopSettings.automaticSchedule,
                                            startTime: e.target.value,
                                          },
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input
                                      type="time"
                                      value={shopSettings.automaticSchedule.endTime}
                                      onChange={(e) =>
                                        setShopSettings({
                                          ...shopSettings,
                                          automaticSchedule: {
                                            ...shopSettings.automaticSchedule,
                                            endTime: e.target.value,
                                          },
                                        })
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Timezone</Label>
                                  <Select
                                    value={shopSettings.automaticSchedule.timezone}
                                    onValueChange={(value) =>
                                      setShopSettings({
                                        ...shopSettings,
                                        automaticSchedule: {
                                          ...shopSettings.automaticSchedule,
                                          timezone: value,
                                        },
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                                      <SelectItem value="UTC">UTC</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Closure Message */}
                        <div className="space-y-2">
                          <Label>Closure Message</Label>
                          <Textarea
                            value={shopSettings.message}
                            onChange={(e) =>
                              setShopSettings({ ...shopSettings, message: e.target.value })
                            }
                            placeholder="We are currently closed. Please check back later."
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground">
                            This message will be displayed when the shop is closed
                          </p>
                        </div>

                        <Button
                          onClick={handleSaveShopSettings}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Shop Settings
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

