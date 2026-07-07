/** MongoDB filter: inventory item belongs to a resolved stationId */
export function itemStationFilter(stationId: string) {
  return {
    $or: [{ stationId }, { stationIds: stationId }],
  };
}

export function itemBelongsToStation(
  item: { stationId?: string; stationIds?: string[] },
  stationId: string
): boolean {
  if (item.stationId === stationId) return true;
  return Array.isArray(item.stationIds) && item.stationIds.includes(stationId);
}

export type StationHealth = 'Healthy' | 'Low Stock' | 'Needs Review' | 'No Activity';

export function computeStationHealth(params: {
  totalStockItems: number;
  lowStockCount: number;
  pendingReturns: number;
  itemsIssuedToday: number;
  itemsReturnedToday: number;
  lastActivityTime: Date | string | null;
}): StationHealth {
  const { totalStockItems, lowStockCount, pendingReturns, itemsIssuedToday, itemsReturnedToday, lastActivityTime } =
    params;

  if (totalStockItems === 0 && itemsIssuedToday === 0 && itemsReturnedToday === 0) {
    return 'No Activity';
  }
  if (lowStockCount > 0) return 'Low Stock';
  if (pendingReturns >= 5) return 'Needs Review';

  if (lastActivityTime) {
    const last = new Date(lastActivityTime);
    const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7 && itemsIssuedToday === 0) return 'Needs Review';
  } else if (totalStockItems > 0 && itemsIssuedToday === 0) {
    return 'Needs Review';
  }

  return 'Healthy';
}
