import { z } from 'zod';

export const stationSchema = z.object({
  stationName: z.string().min(1, 'Station name is required'),
  code: z.string().min(1, 'Code is required'),
  location: z.string().min(1, 'Location is required'),
  managerName: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const inventoryItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  itemCode: z.string().min(1, 'Item code is required'),
  category: z.string().min(1, 'Category is required'),
  unitType: z.string().min(1, 'Unit type is required'),
  quantityAvailable: z.number().min(0, 'Quantity cannot be negative'),
  minimumLevel: z.number().min(0, 'Minimum level cannot be negative'),
  reorderLevel: z.number().min(0).optional(),
  isCable: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

export const addStockSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().min(0.01, 'Quantity must be positive'),
  notes: z.string().optional(),
});

export const adjustStockSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number(), // Can be negative for reductions
  reason: z.string().min(1, 'Reason is required for adjustments'),
  notes: z.string().optional(),
});

export const issueItemSchema = z.object({
  technicianId: z.string().min(1, 'Technician is required'),
  jobReference: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      quantityTaken: z.number().min(0.01, 'Quantity must be positive'),
      unitType: z.string().min(1),
    })
  ).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export const returnItemSchema = z.object({
  issueItemId: z.string().min(1),
  quantityReturned: z.number().min(0, 'Quantity cannot be negative'),
  returnCondition: z.string().optional(),
  notes: z.string().optional(),
});

export const cableRollSchema = z.object({
  rollCode: z.string().min(1, 'Roll code is required'),
  cableType: z.string().min(1, 'Cable type is required'),
  originalMeters: z.number().min(0.01, 'Original meters must be positive'),
  currentRemainingMeters: z.number().min(0),
  notes: z.string().optional(),
});

export const cableIssueSchema = z.object({
  rollId: z.string().min(1),
  technicianId: z.string().min(1, 'Technician is required'),
  jobReference: z.string().optional(),
  metersIssued: z.number().min(0.01, 'Meters must be positive'),
  notes: z.string().optional(),
});

export const cableReturnSchema = z.object({
  usageLogId: z.string().min(1),
  metersReturned: z.number().min(0),
  wasteMeters: z.number().min(0).optional(),
  notes: z.string().optional(),
});
