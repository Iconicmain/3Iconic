'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { StatsCard } from './stats-card';
import { ChartCard } from './chart-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Coins, Warehouse, Package, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#059669', '#f97316', '#ef4444', '#3b82f6'];

interface DashboardData {
  totalTickets: number;
  openTickets: number;
  monthlyExpenses: number;
  totalStations: number;
  monthlyTickets: { month: string; open: number; closed: number }[];
  expensesTrend: { month: string; expenses: number }[];
  stationPerformance: { station: string; tickets: number }[];
  equipmentData: { name: string; value: number }[];
  equipmentAvailableVsInstalled: { month: string; available: number; installed: number }[];
  recentTickets: { id: string; client: string; status: string; date: string }[];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    totalTickets: 0,
    openTickets: 0,
    monthlyExpenses: 0,
    totalStations: 0,
    monthlyTickets: [],
    expensesTrend: [],
    stationPerformance: [],
    equipmentData: [],
    equipmentAvailableVsInstalled: [],
    recentTickets: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [ticketsRes, expensesRes, stationsRes, equipmentRes, ticketsStatsRes, stationsStatsRes, equipmentStatsRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/expenses'),
        fetch('/api/stations'),
        fetch('/api/equipment'),
        fetch('/api/tickets/stats'),
        fetch('/api/stations/stats'),
        fetch('/api/equipment/stats'),
      ]);

      const ticketsData = await ticketsRes.json();
      const expensesData = await expensesRes.json();
      const stationsData = await stationsRes.json();
      const equipmentData = await equipmentRes.json();
      const ticketsStats = await ticketsStatsRes.json();
      const stationsStats = await stationsStatsRes.json();
      const equipmentStats = await equipmentStatsRes.json();

      const tickets = ticketsData.tickets || [];
      const expenses = expensesData.expenses || [];
      const stations = stationsData.stations || [];
      const equipment = equipmentData.equipment || [];

      // Calculate stats
      const totalTickets = tickets.length;
      const openTickets = tickets.filter((t: any) => t.status === 'open' || t.status === 'in-progress').length;
      
      // Calculate current month expenses
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyExpenses = expenses
        .filter((exp: any) => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      const totalStations = stations.length;

      // Calculate monthly tickets (last 6 months)
      const monthlyTicketsData = calculateMonthlyTickets(tickets);
      
      // Calculate expenses trend (last 6 months)
      const expensesTrendData = calculateExpensesTrend(expenses);
      
      // Station performance from stats
      const stationPerformanceData = stationsStats.ticketsHandled || [];
      
      // Equipment data from stats
      const equipmentDataFromStats = equipmentStats.utilizationData || [];
      
      // Calculate equipment available vs installed (full year, monthly breakdown)
      const equipmentAvailableVsInstalledData = calculateEquipmentAvailableVsInstalled(equipment);
      
      // Recent tickets (last 5)
      const recentTicketsData = tickets
        .sort((a: any, b: any) => {
          const dateA = new Date(a.dateTimeReported || a.createdAt).getTime();
          const dateB = new Date(b.dateTimeReported || b.createdAt).getTime();
          return dateB - dateA;
        })
        .slice(0, 5)
        .map((ticket: any) => ({
          id: ticket.ticketId || ticket.id,
          client: ticket.clientName || 'Unknown',
          status: ticket.status || 'open',
          date: ticket.dateTimeReported 
            ? new Date(ticket.dateTimeReported).toISOString().split('T')[0]
            : new Date(ticket.createdAt).toISOString().split('T')[0],
        }));

      setData({
        totalTickets,
        openTickets,
        monthlyExpenses,
        totalStations,
        monthlyTickets: monthlyTicketsData,
        expensesTrend: expensesTrendData,
        stationPerformance: stationPerformanceData,
        equipmentData: equipmentDataFromStats,
        equipmentAvailableVsInstalled: equipmentAvailableVsInstalledData,
        recentTickets: recentTicketsData,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyTickets = (tickets: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: { month: string; open: number; closed: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      
      const monthTickets = tickets.filter((ticket: any) => {
        const ticketDate = new Date(ticket.dateTimeReported || ticket.createdAt);
        return ticketDate.getMonth() === monthIndex && ticketDate.getFullYear() === year;
      });

      const open = monthTickets.filter((t: any) => t.status === 'open' || t.status === 'in-progress').length;
      const closed = monthTickets.filter((t: any) => t.status === 'closed' || t.status === 'resolved').length;

      last6Months.push({
        month: months[monthIndex],
        open,
        closed,
      });
    }

    return last6Months;
  };

  const calculateExpensesTrend = (expenses: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: { month: string; expenses: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      
      const monthExpenses = expenses
        .filter((exp: any) => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === monthIndex && expDate.getFullYear() === year;
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      last6Months.push({
        month: months[monthIndex],
        expenses: monthExpenses,
      });
    }

    return last6Months;
  };

  const calculateEquipmentAvailableVsInstalled = (equipment: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearlyData: { month: string; available: number; installed: number }[] = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      // Equipment available in this month (status is 'available' and was available/created this month)
      const availableThisMonth = equipment.filter((eq: any) => {
        if (eq.status !== 'available') return false;
        const checkDate = eq.updatedAt ? new Date(eq.updatedAt) : new Date(eq.createdAt);
        return checkDate.getMonth() === monthIndex && checkDate.getFullYear() === currentYear;
      }).length;

      // Equipment installed in this month (status is 'installed' and was installed this month)
      const installedThisMonth = equipment.filter((eq: any) => {
        if (eq.status !== 'installed') return false;
        const checkDate = eq.updatedAt ? new Date(eq.updatedAt) : new Date(eq.createdAt);
        return checkDate.getMonth() === monthIndex && checkDate.getFullYear() === currentYear;
      }).length;

      yearlyData.push({
        month: months[monthIndex],
        available: availableThisMonth,
        installed: installedThisMonth,
      });
    }

    return yearlyData;
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="md:ml-72 flex-1">
          <Header />
          <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-sm sm:text-base">Loading dashboard data...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Welcome back! Here's an overview of your ticket management system.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatsCard
              title="Total Tickets"
              value={data.totalTickets.toLocaleString()}
              icon={<Ticket className="w-6 h-6 sm:w-8 sm:h-8" />}
            />
            <StatsCard
              title="Open Tickets"
              value={data.openTickets.toLocaleString()}
              icon={<Ticket className="w-6 h-6 sm:w-8 sm:h-8" />}
            />
            <StatsCard
              title="This Month Expenses"
              value={`Ksh ${data.monthlyExpenses.toLocaleString()}`}
              icon={<Coins className="w-6 h-6 sm:w-8 sm:h-8" />}
            />
            <StatsCard
              title="Stations"
              value={data.totalStations.toLocaleString()}
              icon={<Warehouse className="w-6 h-6 sm:w-8 sm:h-8" />}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <ChartCard title="Monthly Tickets" description="Open vs Closed">
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyTickets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" fill="#059669" />
                  <Bar dataKey="closed" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Expenses Trend" description="Monthly expense totals">
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.expensesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#059669"
                    strokeWidth={2}
                  />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* More Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <ChartCard title="Station Performance">
              <div className="h-[220px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.stationPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="station" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Equipment Status">
              <div className="h-[220px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie
                    data={data.equipmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.equipmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Equipment Available vs Installed (Yearly)" className="md:col-span-2 lg:col-span-1">
              <div className="h-[220px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.equipmentAvailableVsInstalled}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="available" fill="#059669" name="Available" />
                  <Bar dataKey="installed" fill="#f97316" name="Installed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Recent Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  {data.recentTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent tickets</p>
                  ) : (
                    data.recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2 sm:p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-foreground truncate">{ticket.id}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{ticket.client}</p>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right gap-2">
                        <div
                          className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              ticket.status === 'open' || ticket.status === 'Open'
                              ? 'bg-red-100 text-red-800'
                                : ticket.status === 'in-progress' || ticket.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ticket.date}
                        </p>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
