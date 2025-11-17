'use client';

import { useState, useEffect } from 'react';
import { ChartCard } from '@/components/dashboard/chart-card';
import { BarChart, Bar, LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHARTS_COLLAPSED_KEY = 'station_charts_collapsed';

export function StationCharts() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityScore, setActivityScore] = useState<{ station: string; score: number }[]>([]);
  const [ticketsHandled, setTicketsHandled] = useState<{ station: string; tickets: number }[]>([]);
  const [successRate, setSuccessRate] = useState<{ month: string; rate: number }[]>([]);

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
        const response = await fetch('/api/stations/stats');
        const data = await response.json();
        
        if (response.ok) {
          if (data.activityScore) {
            setActivityScore(data.activityScore);
          }
          if (data.ticketsHandled) {
            setTicketsHandled(data.ticketsHandled);
          }
          if (data.successRate) {
            setSuccessRate(data.successRate);
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
  }, [mounted]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="space-y-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Station Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Station metrics and performance insights</p>
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
        "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
      )}>
      {loading ? (
        <div className="col-span-3 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
      <ChartCard title="Station Activity Score" className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={activityScore}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="station" angle={-45} textAnchor="end" height={80} />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="score" fill="#059669" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Tickets Handled per Station" className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ticketsHandled} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="station" width={80} />
            <Tooltip />
            <Bar dataKey="tickets" fill="#059669" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Success Rate" className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-800">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={successRate}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Line 
              type="monotone" 
              dataKey="rate" 
              stroke="#059669" 
              strokeWidth={3}
              dot={{ fill: '#059669', r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              animationDuration={2000}
              animationEasing="ease-in-out"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
        </>
      )}
      </div>
    </div>
  );
}
