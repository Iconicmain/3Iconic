import clientPromise from '@/lib/mongodb';
import { accountTypeFromUser } from '@/lib/user-account-types';

export interface TicketTechnician {
  _id?: string;
  name: string;
  phone?: string;
  linkedEmail?: string | null;
  ispUserId?: string | null;
  source: 'user' | 'legacy';
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function isTechnicianUser(user: {
  role?: string;
  accountType?: string;
  ispRole?: string;
}): boolean {
  const accountType = user.accountType || accountTypeFromUser(user);
  return accountType === 'technician';
}

function displayNameFromUser(user: { name?: string; email?: string }): string {
  return (user.name || user.email || '').trim();
}

/**
 * Approved technician accounts from Users, merged with legacy technicians collection entries.
 */
export async function listTicketTechnicians(): Promise<TicketTechnician[]> {
  const client = await clientPromise;
  const db = client.db('tixmgmt');

  const byName = new Map<string, TicketTechnician>();

  const users = await db
    .collection('users')
    .find({ approved: true })
    .project({
      name: 1,
      email: 1,
      phone: 1,
      id: 1,
      accountType: 1,
      ispRole: 1,
      role: 1,
    })
    .toArray();

  for (const user of users) {
    if (!isTechnicianUser(user)) continue;

    const name = displayNameFromUser(user);
    if (!name) continue;

    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    byName.set(normalizeName(name), {
      name,
      phone: phone || undefined,
      linkedEmail: user.email ?? null,
      ispUserId: user.id ?? null,
      source: 'user',
    });
  }

  const legacyTechnicians = await db.collection('technicians').find({}).toArray();
  for (const tech of legacyTechnicians) {
    const name = (tech.name || '').trim();
    if (!name) continue;

    const key = normalizeName(name);
    if (byName.has(key)) continue;

    const phone = String(tech.phone || tech.phoneNumber || '').trim();
    byName.set(key, {
      _id: tech._id?.toString(),
      name,
      phone: phone || undefined,
      linkedEmail: tech.linkedEmail ?? null,
      ispUserId: tech.ispUserId ?? null,
      source: 'legacy',
    });
  }

  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export async function resolveTechnicianContact(
  name: string,
  technicians?: TicketTechnician[]
): Promise<{ name: string; phone?: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const list = technicians ?? (await listTicketTechnicians());
  const key = normalizeName(trimmed);

  const match =
    list.find((tech) => normalizeName(tech.name) === key) ||
    list.find((tech) => tech.name === trimmed);

  if (!match) return null;

  return {
    name: match.name,
    phone: match.phone,
  };
}

export function resolveTechnicianContactsFromList(
  names: string[],
  technicians: TicketTechnician[]
): Array<{ name: string; phone: string }> {
  const contacts: Array<{ name: string; phone: string }> = [];
  const seen = new Set<string>();

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const key = normalizeName(trimmed);
    const match =
      technicians.find((tech) => normalizeName(tech.name) === key) ||
      technicians.find((tech) => tech.name === trimmed);

    if (!match?.phone) continue;
    const contactKey = normalizeName(match.name);
    if (seen.has(contactKey)) continue;

    seen.add(contactKey);
    contacts.push({ name: match.name, phone: match.phone });
  }

  return contacts;
}

export async function resolveTechnicianContacts(
  names: string[]
): Promise<Array<{ name: string; phone: string }>> {
  return resolveTechnicianContactsFromList(names, await listTicketTechnicians());
}
