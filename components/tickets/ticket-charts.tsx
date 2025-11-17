'use client';

import { useState, useEffect } from 'react';
import { ChartCard } from '@/components/dashboard/chart-card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#059669', '#f97316', '#ef4444', '#3b82f6'];

const CHARTS_COLLAPSED_KEY = 'ticket_charts_collapsed';

interface TicketChartsProps {
  refreshTrigger?: number;
}

export function TicketCharts({ refreshTrigger = 0 }: TicketChartsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthlyVolume, setMonthlyVolume] = useState([
    { month: 'Week 1', tickets: 0 },
    { month: 'Week 2', tickets: 0 },
    { month: 'Week 3', tickets: 0 },
    { month: 'Week 4', tickets: 0 },
  ]);
  const [categoryDistribution, setCategoryDistribution] = useState([
    { name: 'Installation', value: 0 },
    { name: 'Maintenance', value: 0 },
    { name: 'Support', value: 0 },
    { name: 'Repair', value: 0 },
  ]);
  const [resolutionTime, setResolutionTime] = useState([
    { week: 'Week 1', hours: 0 },
    { week: 'Week 2', hours: 0 },
    { week: 'Week 3', hours: 0 },
    { week: 'Week 4', hours: 0 },
  ]);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(CHARTS_COLLAPSED_KEY);
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(CHARTS_COLLAPSED_KEY, String(isCollapsed));
    }
  }, [isCollapsed, mounted]);

  // Fetch chart data from API
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tickets/stats');
        const data = await response.json();
        
        if (response.ok) {
          if (data.monthlyVolume) {
            setMonthlyVolume(data.monthlyVolume);
          }
          if (data.categoryDistribution) {
            setCategoryDistribution(data.categoryDistribution);
          }
          if (data.resolutionTime) {
            setResolutionTime(data.resolutionTime);
          }
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      fetchChartData();
    }
  }, [mounted, refreshTrigger]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="space-y-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Ticket metrics and performance insights</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="gap-2 text-gray-600 hover:text-gray-900"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span className="hidden sm:inline">Show Charts</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              <span className="hidden sm:inline">Hide Charts</span>
            </>
          )}
        </Button>
      </div>

      {/* Charts Grid */}
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
      )}>
      {loading ? (
        <div className="col-span-3 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
      <ChartCard title="Monthly Ticket Volume">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyVolume}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tickets" fill="#059669" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Category Distribution">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={categoryDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {categoryDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Avg Resolution Time">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={resolutionTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#059669" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
        </>
      )}
      </div>
    </div>
  );
}
