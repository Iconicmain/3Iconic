import { cn } from '@/lib/utils';

/** Soft enterprise palette — tinted backgrounds + readable foreground text */

export type KpiVariant = 'stock' | 'warning' | 'issue' | 'return' | 'cable' | 'tech';

const KPI_STYLES: Record<KpiVariant, { card: string; icon: string; mobileCard: string; mobileIcon: string }> = {
  stock: {
    card: 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    mobileCard: 'max-md:border-emerald-200 max-md:bg-emerald-50 max-md:dark:border-emerald-900 max-md:dark:bg-emerald-950',
    mobileIcon: 'max-md:bg-emerald-100 max-md:text-emerald-700 max-md:dark:bg-emerald-900 max-md:dark:text-emerald-300',
  },
  warning: {
    card: 'border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/25',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    mobileCard: 'max-md:border-amber-200 max-md:bg-amber-50 max-md:dark:border-amber-900 max-md:dark:bg-amber-950',
    mobileIcon: 'max-md:bg-amber-100 max-md:text-amber-700 max-md:dark:bg-amber-900 max-md:dark:text-amber-300',
  },
  issue: {
    card: 'border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20',
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    mobileCard: 'max-md:border-blue-200 max-md:bg-blue-50 max-md:dark:border-blue-900 max-md:dark:bg-blue-950',
    mobileIcon: 'max-md:bg-blue-100 max-md:text-blue-700 max-md:dark:bg-blue-900 max-md:dark:text-blue-300',
  },
  return: {
    card: 'border-orange-200/80 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20',
    icon: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    mobileCard: 'max-md:border-orange-200 max-md:bg-orange-50 max-md:dark:border-orange-900 max-md:dark:bg-orange-950',
    mobileIcon: 'max-md:bg-orange-100 max-md:text-orange-700 max-md:dark:bg-orange-900 max-md:dark:text-orange-300',
  },
  cable: {
    card: 'border-cyan-200/80 bg-cyan-50/50 dark:border-cyan-900/50 dark:bg-cyan-950/20',
    icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
    mobileCard: 'max-md:border-cyan-200 max-md:bg-cyan-50 max-md:dark:border-cyan-900 max-md:dark:bg-cyan-950',
    mobileIcon: 'max-md:bg-cyan-100 max-md:text-cyan-700 max-md:dark:bg-cyan-900 max-md:dark:text-cyan-300',
  },
  tech: {
    card: 'border-violet-200/80 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20',
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    mobileCard: 'max-md:border-violet-200 max-md:bg-violet-50 max-md:dark:border-violet-900 max-md:dark:bg-violet-950',
    mobileIcon: 'max-md:bg-violet-100 max-md:text-violet-700 max-md:dark:bg-violet-900 max-md:dark:text-violet-300',
  },
};

export function kpiCardClasses(variant: KpiVariant, highlight = false): string {
  const styles = KPI_STYLES[variant];
  return cn(
    styles.card,
    styles.mobileCard,
    highlight && 'ring-1 ring-inset ring-current/10 max-md:ring-0'
  );
}

export function kpiIconClasses(variant: KpiVariant): string {
  const styles = KPI_STYLES[variant];
  return cn('p-1.5 rounded-lg shrink-0', styles.icon, styles.mobileIcon);
}

export type StockStatus = 'healthy' | 'low' | 'out';

export function stockStatusStyle(status: StockStatus): string {
  switch (status) {
    case 'out':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900';
    case 'low':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
  }
}

export function unitBadgeClasses(unit: 'pcs' | 'm'): string {
  return unit === 'm'
    ? 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900'
    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700';
}

const CATEGORY_COLORS: Record<string, string> = {
  Equipment: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  Materials: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  'Drop Cable': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900',
  'Fiber Cable': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
  Accessories: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  Other: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700',
};

export function categoryBadgeClasses(category?: string | null): string {
  const key = category || 'Other';
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.Other;
}

export type TabAccent = 'stock' | 'movement' | 'returns' | 'transfers' | 'reports';

const TAB_ACTIVE: Record<TabAccent, string> = {
  stock: 'data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900 data-[state=active]:border-emerald-200 dark:data-[state=active]:bg-emerald-950/40 dark:data-[state=active]:text-emerald-300',
  movement: 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:border-blue-200 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300',
  returns: 'data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 data-[state=active]:border-orange-200 dark:data-[state=active]:bg-orange-950/40 dark:data-[state=active]:text-orange-300',
  transfers: 'data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-900 data-[state=active]:border-indigo-200 dark:data-[state=active]:bg-indigo-950/40 dark:data-[state=active]:text-indigo-300',
  reports: 'data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-200',
};

export function tabTriggerClasses(accent: TabAccent): string {
  return cn('border border-transparent', TAB_ACTIVE[accent]);
}

export type ActivityAction =
  | 'CREATE'
  | 'ADD_STOCK'
  | 'ADJUST_STOCK'
  | 'ISSUE'
  | 'RETURN'
  | 'CABLE_ISSUE'
  | 'CABLE_RETURN'
  | 'TRANSFER_STOCK'
  | string;

export function activityStyle(action: ActivityAction): { dot: string; bg: string; label: string } {
  const a = action.toUpperCase();
  if (a.includes('SHARED') && (a.includes('RETURN') || a.includes('DAMAGED') || a.includes('PARTIAL'))) {
    return { dot: 'bg-violet-500', bg: 'bg-violet-50/80 dark:bg-violet-950/20', label: 'text-violet-800 dark:text-violet-300' };
  }
  if (a.includes('SHARED') && a.includes('CABLE')) {
    return { dot: 'bg-indigo-500', bg: 'bg-indigo-50/80 dark:bg-indigo-950/20', label: 'text-indigo-800 dark:text-indigo-300' };
  }
  if (a.includes('SHARED') || a === 'PROJECT_ISSUE') {
    return { dot: 'bg-indigo-500', bg: 'bg-indigo-50/80 dark:bg-indigo-950/20', label: 'text-indigo-800 dark:text-indigo-300' };
  }
  if (a.includes('CABLE') && a.includes('RETURN')) {
    return { dot: 'bg-teal-500', bg: 'bg-teal-50/80 dark:bg-teal-950/20', label: 'text-teal-800 dark:text-teal-300' };
  }
  if (a.includes('CABLE') || a === 'CABLE_ISSUE') {
    return { dot: 'bg-cyan-500', bg: 'bg-cyan-50/80 dark:bg-cyan-950/20', label: 'text-cyan-800 dark:text-cyan-300' };
  }
  if (a === 'ISSUE') {
    return { dot: 'bg-blue-500', bg: 'bg-blue-50/80 dark:bg-blue-950/20', label: 'text-blue-800 dark:text-blue-300' };
  }
  if (a === 'RETURN') {
    return { dot: 'bg-orange-500', bg: 'bg-orange-50/80 dark:bg-orange-950/20', label: 'text-orange-800 dark:text-orange-300' };
  }
  if (a.includes('TRANSFER')) {
    return { dot: 'bg-indigo-500', bg: 'bg-indigo-50/80 dark:bg-indigo-950/20', label: 'text-indigo-800 dark:text-indigo-300' };
  }
  if (a.includes('ADJUST')) {
    return { dot: 'bg-amber-500', bg: 'bg-amber-50/80 dark:bg-amber-950/20', label: 'text-amber-800 dark:text-amber-300' };
  }
  if (a === 'CREATE' || a.includes('ADD')) {
    return { dot: 'bg-emerald-500', bg: 'bg-emerald-50/80 dark:bg-emerald-950/20', label: 'text-emerald-800 dark:text-emerald-300' };
  }
  return { dot: 'bg-slate-400', bg: 'bg-muted/50', label: 'text-foreground' };
}

export function softBadgeClass(className: string): string {
  return cn('border font-medium text-[11px] px-2 py-0.5 rounded-full', className);
}

export function rowHighlightForItem(quantity: number, minimum: number): string {
  if (quantity <= 0) {
    return 'border-l-2 border-l-red-400 bg-red-50/30 dark:bg-red-950/10 max-md:bg-red-50 max-md:dark:bg-red-950';
  }
  if (quantity <= minimum) {
    return 'border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10 max-md:bg-amber-50 max-md:dark:bg-amber-950';
  }
  return '';
}
