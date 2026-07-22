import { sendSMS } from '@/lib/sms';
import {
  getSuperAdminRecipients,
  resolveTechnicianContact,
  resolveStaffName,
  resolveStationName,
} from '@/lib/isp/equipment-notification-recipients';

function uniquePhones(phones: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of phones) {
    const key = p.replace(/\s+/g, '');
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

async function sendToRecipients(phones: string[], message: string, context: string): Promise<void> {
  if (phones.length === 0) {
    console.warn(`[Equipment SMS] No recipients for ${context}`);
    return;
  }
  try {
    await sendSMS({ mobile: phones, msg: message });
    console.log(`[Equipment SMS] ✅ Sent ${context} to ${phones.length} recipient(s)`);
  } catch (error) {
    console.error(`[Equipment SMS] ❌ Failed ${context}:`, error);
  }
}

export async function notifyEquipmentIssue(params: {
  technicianId: string;
  technicianName?: string;
  stationId: string;
  itemsSummary: string;
  issuedByUserId?: string;
  jobReference?: string | null;
  notes?: string | null;
}): Promise<void> {
  const [admins, technician, stationName, issuedByName] = await Promise.all([
    getSuperAdminRecipients(),
    resolveTechnicianContact(params.technicianId),
    resolveStationName(params.stationId),
    params.issuedByUserId ? resolveStaffName(params.issuedByUserId) : Promise.resolve(''),
  ]);

  const techName = params.technicianName || technician?.name || 'Technician';
  const jobLine = params.jobReference ? `\nJob/Project: ${params.jobReference}` : '';
  const notesLine = params.notes ? `\nNotes: ${params.notes}` : '';
  const issuedByLine = issuedByName ? `\nIssued by: ${issuedByName}` : '';

  const adminMessage = `Super Admin Alert: Equipment Issued\n\nTechnician: ${techName}\nStation: ${stationName}\nItems: ${params.itemsSummary}${jobLine}${issuedByLine}${notesLine}\n\nIconic Fibre Inventory`;

  const adminPhones = uniquePhones(admins.map((a) => a.phone));
  await sendToRecipients(adminPhones, adminMessage, `issue (super admins) → ${techName}`);

  if (technician?.phone) {
    const techMessage = `Hello ${techName},\n\nEquipment has been issued to you.\n\nStation: ${stationName}\nItems: ${params.itemsSummary}${jobLine}${notesLine}\n\nPlease confirm receipt with your supervisor.\n\nIconic Fibre Inventory`;
    await sendToRecipients([technician.phone], techMessage, `issue (technician) → ${techName}`);
  } else {
    console.warn(`[Equipment SMS] No phone for technician ${params.technicianId} (${techName})`);
  }
}

export async function notifyEquipmentReturn(params: {
  technicianId: string;
  technicianName?: string;
  stationId: string;
  itemsSummary: string;
  quantityReturned: number;
  unitType?: string;
  returnCondition?: string;
  processedByUserId?: string;
  notes?: string | null;
}): Promise<void> {
  const [admins, technician, stationName, processedByName] = await Promise.all([
    getSuperAdminRecipients(),
    resolveTechnicianContact(params.technicianId),
    resolveStationName(params.stationId),
    params.processedByUserId ? resolveStaffName(params.processedByUserId) : Promise.resolve(''),
  ]);

  const techName = params.technicianName || technician?.name || 'Technician';
  const condition = params.returnCondition || 'Good';
  const unit = params.unitType || 'pcs';
  const processedLine = processedByName ? `\nProcessed by: ${processedByName}` : '';
  const notesLine = params.notes ? `\nNotes: ${params.notes}` : '';

  const adminMessage = `Super Admin Alert: Equipment Returned\n\nTechnician: ${techName}\nStation: ${stationName}\nItems: ${params.itemsSummary}\nReturned: ${params.quantityReturned} ${unit}\nCondition: ${condition}${processedLine}${notesLine}\n\nIconic Fibre Inventory`;

  const adminPhones = uniquePhones(admins.map((a) => a.phone));
  await sendToRecipients(adminPhones, adminMessage, `return (super admins) → ${techName}`);

  if (technician?.phone) {
    const techMessage = `Hello ${techName},\n\nYour equipment return has been recorded.\n\nStation: ${stationName}\nItems: ${params.itemsSummary}\nReturned: ${params.quantityReturned} ${unit}\nCondition: ${condition}${notesLine}\n\nIconic Fibre Inventory`;
    await sendToRecipients([technician.phone], techMessage, `return (technician) → ${techName}`);
  } else {
    console.warn(`[Equipment SMS] No phone for technician ${params.technicianId} (${techName})`);
  }
}

export async function notifyCableIssue(params: {
  technicianId: string;
  stationId: string;
  rollCode: string;
  cableType?: string;
  metersIssued: number;
  issuedByUserId?: string;
  jobReference?: string | null;
}): Promise<void> {
  const summary = `${params.metersIssued}m ${params.cableType || 'cable'} (Roll ${params.rollCode})`;
  await notifyEquipmentIssue({
    technicianId: params.technicianId,
    stationId: params.stationId,
    itemsSummary: summary,
    issuedByUserId: params.issuedByUserId,
    jobReference: params.jobReference,
  });
}

export async function notifyCableReturn(params: {
  technicianId: string;
  stationId: string;
  rollCode: string;
  cableType?: string;
  metersReturned: number;
  processedByUserId?: string;
}): Promise<void> {
  const summary = `${params.metersReturned}m ${params.cableType || 'cable'} (Roll ${params.rollCode})`;
  await notifyEquipmentReturn({
    technicianId: params.technicianId,
    stationId: params.stationId,
    itemsSummary: summary,
    quantityReturned: params.metersReturned,
    unitType: 'm',
    returnCondition: 'Returned',
    processedByUserId: params.processedByUserId,
  });
}

export async function notifyRouterReplacementPending(params: {
  technicianId: string;
  technicianName?: string;
  stationId: string;
  newRouterLabel: string;
  oldRouterLabel: string;
  ticketId?: string | null;
}): Promise<void> {
  const [admins, technician, stationName] = await Promise.all([
    getSuperAdminRecipients(),
    resolveTechnicianContact(params.technicianId),
    resolveStationName(params.stationId),
  ]);

  const techName = params.technicianName || technician?.name || 'Technician';
  const ticketLine = params.ticketId ? `\nTicket: ${params.ticketId}` : '';

  const adminMessage = `Super Admin Alert: Router Replacement\n\nTechnician: ${techName}\nStation: ${stationName}\nNew installed: ${params.newRouterLabel}\nOld from client (awaiting return): ${params.oldRouterLabel}${ticketLine}\n\nFollow up in Inventory → Returns → Router Replacements.\n\nIconic Fibre Inventory`;

  const adminPhones = uniquePhones(admins.map((a) => a.phone));
  await sendToRecipients(adminPhones, adminMessage, `router replacement pending → ${techName}`);
}
