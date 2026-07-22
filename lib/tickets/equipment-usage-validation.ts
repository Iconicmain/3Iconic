import { z } from 'zod';

export const equipmentUsageRowSchema = z
  .object({
    kind: z.enum(['item', 'cable']),
    technicianId: z.string().min(1),
    technicianName: z.string().min(1),
    sourceIssueId: z.string().min(1),
    usageType: z.enum([
      'installed',
      'exchange_replacement',
      'returned_unused',
      'damaged',
      'lost',
      'repair',
      'still_with_technician',
    ]),
    notes: z.string().optional(),
    itemId: z.string().optional(),
    itemName: z.string().min(1),
    issueItemId: z.string().optional(),
    unit: z.enum(['pcs', 'm']),
    quantityUsed: z.number().min(0).optional(),
    routerUnitIds: z.array(z.string()).optional(),
    serialNumber: z.string().nullable().optional(),
    macAddress: z.string().nullable().optional(),
    replacedRouterSerial: z.string().nullable().optional(),
    replacedRouterMac: z.string().nullable().optional(),
    usageLogId: z.string().optional(),
    rollId: z.string().optional(),
    rollCode: z.string().optional(),
    metersUsed: z.number().min(0).optional(),
    metersReturned: z.number().min(0).optional(),
    wasteMeters: z.number().min(0).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.kind === 'item') {
      if (!row.issueItemId) {
        ctx.addIssue({ code: 'custom', message: 'Issue item is required', path: ['issueItemId'] });
      }
      if (row.usageType === 'still_with_technician') return;
      const qty = row.routerUnitIds?.length || row.quantityUsed || 0;
      if (qty <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter quantity used or select a unit',
          path: ['quantityUsed'],
        });
      }
      if (row.routerUnitIds?.length && row.quantityUsed && row.quantityUsed !== row.routerUnitIds.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Quantity must match selected units',
          path: ['quantityUsed'],
        });
      }
      if (row.usageType === 'exchange_replacement') {
        if (!row.routerUnitIds?.length) {
          ctx.addIssue({
            code: 'custom',
            message: 'Select the new router unit installed',
            path: ['routerUnitIds'],
          });
        }
        const oldSerial = row.replacedRouterSerial?.trim();
        const oldMac = row.replacedRouterMac?.trim();
        if (!oldSerial && !oldMac) {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter serial or MAC of the old router removed from client',
            path: ['replacedRouterSerial'],
          });
        }
      }
    } else {
      if (!row.usageLogId) {
        ctx.addIssue({ code: 'custom', message: 'Cable issue record is required', path: ['usageLogId'] });
      }
      if (row.usageType === 'still_with_technician') return;
      const used = row.metersUsed || 0;
      const returned = row.metersReturned || 0;
      const waste = row.wasteMeters || 0;
      if (used + returned + waste <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter meters used, returned, or damaged',
          path: ['metersUsed'],
        });
      }
    }
  });

export const ticketEquipmentUsagePayloadSchema = z.object({
  equipmentUsedEnabled: z.boolean(),
  equipmentUsed: z.array(equipmentUsageRowSchema).optional(),
});
