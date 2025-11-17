import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  trend,
  icon,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn('bg-white', className)}>
      <CardContent className="pt-4 sm:pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground truncate">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <div
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-semibold',
                    trend === 'up' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend === 'up' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {Math.abs(change)}%
                </div>
                <span className="text-xs text-muted-foreground">from last month</span>
              </div>
            )}
          </div>
          {icon && <div className="text-muted-foreground shrink-0 ml-2">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
