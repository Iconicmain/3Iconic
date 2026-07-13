export function toDayKey(value?: string | Date | null): string {
  if (!value) return 'unknown';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDayLabel(dayKey: string): string {
  if (dayKey === 'unknown') return 'Unknown date';

  const d = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dayKey;

  const todayKey = toDayKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDayKey(yesterday);

  if (dayKey === todayKey) return 'Today';
  if (dayKey === yesterdayKey) return 'Yesterday';

  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface DayGroup<T> {
  day: string;
  label: string;
  items: T[];
}

export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
  sortDesc = true
): DayGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = toDayKey(getDate(item));
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return sortDesc ? b.localeCompare(a) : a.localeCompare(b);
  });

  return keys.map((day) => ({
    day,
    label: formatDayLabel(day),
    items: map.get(day) || [],
  }));
}
