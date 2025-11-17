'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Lock, Users, Palette, Save } from 'lucide-react';

export default function SettingsPageClient() {
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [theme, setTheme] = useState('light');

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
                <TabsList className="grid w-full grid-cols-4">
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
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

