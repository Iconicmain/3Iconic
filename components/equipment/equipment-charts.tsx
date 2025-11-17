'use client';

import { useState, useEffect } from 'react';
import { ChartCard } from '@/components/dashboard/chart-card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHARTS_COLLAPSED_KEY = 'equipment_charts_collapsed';

const COLORS = ['#059669', '#f97316', '#ef4444', '#3b82f6'];

interface EquipmentChartsProps {
  refreshTrigger?: number;
}

export function EquipmentCharts({ refreshTrigger = 0 }: EquipmentChartsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [utilizationData, setUtilizationData] = useState([
    { name: 'Installed', value: 0 },
    { name: 'Available', value: 0 },
    { name: 'In Repair', value: 0 },
    { name: 'Bought', value: 0 },
  ]);
  const [newEquipmentAdded, setNewEquipmentAdded] = useState([
    { month: 'Jan', added: 0 },
    { month: 'Feb', added: 0 },
    { month: 'Mar', added: 0 },
    { month: 'Apr', added: 0 },
    { month: 'May', added: 0 },
    { month: 'Jun', added: 0 },
  ]);
  const [equipmentPerStation, setEquipmentPerStation] = useState<Array<{ station: string; installed: number }>>([]);

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
        const response = await fetch('/api/equipment/stats');
        const data = await response.json();
        
        if (response.ok) {
          if (data.utilizationData) {
            setUtilizationData(data.utilizationData);
          }
          if (data.newEquipmentAdded) {
            setNewEquipmentAdded(data.newEquipmentAdded);
          }
          if (data.equipmentPerStation && Array.isArray(data.equipmentPerStation)) {
            setEquipmentPerStation(data.equipmentPerStation.length > 0 ? data.equipmentPerStation : []);
          } else {
            setEquipmentPerStation([]);
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
    <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 w-full">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Equipment Analytics</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Equipment metrics and performance insights</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="gap-2 text-gray-600 hover:text-gray-900 shrink-0 self-start sm:self-auto"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span className="hidden sm:inline">Show Charts</span>
              <span className="sm:hidden">Show</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              <span className="hidden sm:inline">Hide Charts</span>
              <span className="sm:hidden">Hide</span>
            </>
          )}
        </Button>
      </div>

      {/* Charts Grid */}
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8 transition-all duration-300 ease-in-out overflow-hidden w-full max-w-full",
        isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
      )}>
      {loading ? (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
      <ChartCard title="Equipment Usage Distribution">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          <PieChart>
            <Pie
              data={utilizationData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {utilizationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="New Equipment Added">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          <BarChart data={newEquipmentAdded}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip />
            <Bar dataKey="added" fill="#059669" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Equipment Installed Per Station">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          {equipmentPerStation.length > 0 ? (
            <BarChart data={equipmentPerStation} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" style={{ fontSize: '11px' }} />
              <YAxis 
                dataKey="station" 
                type="category" 
                width={100} 
                style={{ fontSize: '11px' }}
                tick={{ fontSize: '11px' }}
              />
              <Tooltip formatter={(value) => [`${value} installed`, 'Count']} />
              <Bar dataKey="installed" fill="#059669" radius={[0, 4, 4, 0]} />
            </BarChart>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No installed equipment data available
            </div>
          )}
        </ResponsiveContainer>
      </ChartCard>
      </>
      )}
      </div>
    </div>
  );
}
