// ISP Station Inventory - TypeScript types and constants

export type IspUserRole = 'SUPER_ADMIN' | 'STATION_MANAGER' | 'INVENTORY_OFFICER' | 'TECHNICIAN';

export type TransactionType =
  | 'ADD'
  | 'ISSUE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE';

export type TechnicianIssueStatus = 'OPEN' | 'PARTIAL_RETURN' | 'CLOSED';

export type CableRollStatus = 'ACTIVE' | 'FINISHED' | 'DAMAGED';

export interface IspStation {
  _id?: string;
  id: string;
  stationName: string;
  code: string;
  location: string;
  managerName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IspUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: IspUserRole;
  assignedStationId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  _id?: string;
  id: string;
  stationId?: string; // Legacy single station
  stationIds?: string[]; // Multi-station: item available at all these stations
  itemName: string;
  itemCode: string;
  category: string;
  unitType: string;
  quantityAvailable: number;
  minimumLevel: number;
  reorderLevel?: number;
  isCable?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouterUnit {
  _id?: string;
  id: string;
  stationId?: string;
  stationIds: string[];
  itemName: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  status: 'available' | 'issued' | 'returned' | 'damaged';
  technicianId?: string | null;
  jobReference?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransaction {
  _id?: string;
  id: string;
  stationId: string;
  itemId: string;
  transactionType: TransactionType;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  technicianId?: string | null;
  jobReference?: string | null;
  approvedBy?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface TechnicianIssue {
  _id?: string;
  id: string;
  stationId: string;
  technicianId: string;
  issueDate: Date;
  jobReference?: string | null;
  status: TechnicianIssueStatus;
  approvedBy?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicianIssueItem {
  _id?: string;
  id: string;
  technicianIssueId: string;
  itemId: string;
  quantityTaken: number;
  quantityReturned: number;
  quantityUsed: number;
  unitType: string;
  returnCondition?: string | null;
  notes?: string | null;
  timeOut?: Date | null;
  returnTime?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CableRoll {
  _id?: string;
  id: string;
  stationId: string;
  rollCode: string;
  cableType: string;
  originalMeters: number;
  currentRemainingMeters: number;
  status: CableRollStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CableUsageLog {
  _id?: string;
  id: string;
  stationId: string;
  rollId: string;
  technicianId: string;
  jobReference?: string | null;
  openingMeters: number;
  metersIssued: number;
  metersReturned: number;
  metersUsed: number;
  wasteMeters?: number;
  closingMeters: number;
  approvedBy?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export interface AuditLog {
  _id?: string;
  id: string;
  userId: string;
  stationId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export const ISP_DB = 'tixmgmt';
// Use existing 'stations' collection from /admin/stations (stationId, name, location, region)
export const ISP_STATIONS_COLLECTION = 'stations';

export const ISP_COLLECTIONS = {
  stations: 'stations', // Reuse existing stations collection
  inventoryItems: 'isp_inventory_items',
  routerUnits: 'isp_router_units',
  inventoryTransactions: 'isp_inventory_transactions',
  technicianIssues: 'isp_technician_issues',
  technicianIssueItems: 'isp_technician_issue_items',
  cableRolls: 'isp_cable_rolls',
  cableUsageLogs: 'isp_cable_usage_logs',
  auditLogs: 'isp_audit_logs',
} as const;

export const UNIT_TYPES = ['pcs', 'meters', 'rolls', 'boxes', 'units'] as const;
export const CABLE_CATEGORY = 'Drop Cable';
