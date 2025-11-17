'use client';

import { useState, useEffect } from 'react';
import { ChartCard } from '@/components/dashboard/chart-card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHARTS_COLLAPSED_KEY = 'expense_charts_collapsed';
const COLORS = ['#059669', '#f97316', '#ef4444', '#3b82f6'];

interface Expense {
  id: string;
  description: string;
  category: string;
  station: string;
  amount: number;
  date: string;
  status: 'approved' | 'pending' | 'rejected';
}

// Helper function to calculate monthly trend
const calculateMonthlyTrend = (expenses: Expense[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData: { [key: string]: number } = {};
  
  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += expense.amount;
  });

  // Get last 6 months
  const now = new Date();
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    last6Months.push({
      month: monthNames[date.getMonth()],
      expenses: monthlyData[monthKey] || 0,
    });
  }

  return last6Months;
};

// Helper function to calculate category distribution
const calculateCategoryDistribution = (expenses: Expense[]) => {
  const categoryData: { [key: string]: number } = {};
  
  expenses.forEach((expense) => {
    if (!categoryData[expense.category]) {
      categoryData[expense.category] = 0;
    }
    categoryData[expense.category] += expense.amount;
  });

  return Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));
};

// Helper function to calculate station comparison
const calculateStationComparison = (expenses: Expense[]) => {
  const stationData: { [key: string]: number } = {};
  
  expenses.forEach((expense) => {
    if (!stationData[expense.station]) {
      stationData[expense.station] = 0;
    }
    stationData[expense.station] += expense.amount;
  });

  return Object.entries(stationData)
    .map(([station, expenses]) => ({
      station,
      expenses,
    }))
    .sort((a, b) => b.expenses - a.expenses);
};

// Helper function to calculate year comparison
const calculateYearComparison = (expenses: Expense[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearData: { [key: string]: { [key: string]: number } } = {};
  
  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    const year = date.getFullYear().toString();
    const month = monthNames[date.getMonth()];
    
    if (!yearData[year]) {
      yearData[year] = {};
    }
    if (!yearData[year][month]) {
      yearData[year][month] = 0;
    }
    yearData[year][month] += expense.amount;
  });

  // Get last 6 months for comparison
  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;
  const last6Months = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = monthNames[date.getMonth()];
    last6Months.push({
      month,
      [previousYear]: yearData[previousYear]?.[month] || 0,
      [currentYear]: yearData[currentYear]?.[month] || 0,
    });
  }

  return last6Months;
};

export function ExpenseCharts() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // Fetch expenses from API
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/expenses');
        if (response.ok) {
          const data = await response.json();
          setExpenses(data.expenses || []);
        } else {
          console.error('Failed to fetch expenses');
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Calculate chart data from expenses
  const monthlyTrend = calculateMonthlyTrend(expenses);
  const categoryDistribution = calculateCategoryDistribution(expenses);
  const stationComparison = calculateStationComparison(expenses);
  const yearComparison = calculateYearComparison(expenses);

  return (
    <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 w-full">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Expense Analytics</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Expense metrics and financial insights</p>
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
        "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8 transition-all duration-300 ease-in-out overflow-hidden w-full max-w-full",
        isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
      )}>
      {loading ? (
        <div className="col-span-2 flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading chart data...</p>
        </div>
      ) : (
        <>
      <ChartCard title="Monthly Expense Trend">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip formatter={(value) => `Ksh ${value.toLocaleString()}`} />
            <Line type="monotone" dataKey="expenses" stroke="#059669" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Category Distribution">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
          <PieChart>
            <Pie
              data={categoryDistribution}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {categoryDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `Ksh ${value.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Station Expense Comparison">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
          <BarChart data={stationComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="station" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip formatter={(value) => `Ksh ${value.toLocaleString()}`} />
            <Bar dataKey="expenses" fill="#059669" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Year-to-Year Comparison">
        <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
          <LineChart data={yearComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip formatter={(value) => `Ksh ${value.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
                {yearComparison.length > 0 && Object.keys(yearComparison[0]).filter(k => k !== 'month').map((year, index) => (
                  <Line 
                    key={year}
                    type="monotone" 
                    dataKey={year} 
                    stroke={index === 0 ? "#d1d5db" : "#059669"} 
                    strokeWidth={2} 
                  />
                ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
        </>
      )}
      </div>
    </div>
  );
}
