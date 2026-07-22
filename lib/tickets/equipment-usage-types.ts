export const EQUIPMENT_USAGE_TYPES = [
  { value: 'installed', label: 'Installed / used on ticket' },
  { value: 'returned_unused', label: 'Returned unused' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
  { value: 'repair', label: 'Sent to repair' },
  { value: 'still_with_technician', label: 'Still with technician' },
] as const;

export type EquipmentUsageType = (typeof EQUIPMENT_USAGE_TYPES)[number]['value'];

export interface IssuedSerializedUnit {
  id: string;
  serialNumber: string | null;
  macAddress: string | null;
  status: string;
  label: string;
}

export interface IssuedEquipmentOption {
  kind: 'item' | 'cable';
  technicianId: string;
  technicianName: string;
  sourceIssueId: string;
  issueItemId?: string;
  usageLogId?: string;
  itemId?: string;
  itemName: string;
  itemCode?: string | null;
  unit: 'pcs' | 'm';
  outstanding: number;
  isSerialized: boolean;
  serializedUnits?: IssuedSerializedUnit[];
  rollId?: string;
  rollCode?: string;
  metersIssued?: number;
  optionKey: string;
}

export interface TicketEquipmentUsageRecord {
  kind: 'item' | 'cable';
  technicianId: string;
  technicianName: string;
  sourceIssueId: string;
  usageType: EquipmentUsageType;
  notes?: string | null;
  itemId?: string;
  itemName: string;
  issueItemId?: string;
  unit: 'pcs' | 'm';
  quantityUsed?: number;
  routerUnitIds?: string[];
  serialNumber?: string | null;
  macAddress?: string | null;
  usageLogId?: string;
  rollId?: string;
  rollCode?: string;
  metersUsed?: number;
  metersReturned?: number;
  wasteMeters?: number;
}

export interface TicketActivityEntry {
  id: string;
  action: string;
  message: string;
  createdAt: Date;
  createdBy?: string | null;
  meta?: Record<string, unknown>;
}
