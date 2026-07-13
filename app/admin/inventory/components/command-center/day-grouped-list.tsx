'use client';

import { cn } from '@/lib/utils';
import type { DayGroup } from './inventory-day-groups';

export function DaySectionHeader({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2',
        className
      )}
    >
      <div>
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {count} record{count === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  );
}

export function DayGroupedSections<T>({
  groups,
  renderItems,
  emptyMessage,
}: {
  groups: DayGroup<T>[];
  renderItems: (items: T[]) => React.ReactNode;
  emptyMessage?: string;
}) {
  if (groups.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.day} className="space-y-2">
          <DaySectionHeader label={group.label} count={group.items.length} />
          {renderItems(group.items)}
        </section>
      ))}
    </div>
  );
}
