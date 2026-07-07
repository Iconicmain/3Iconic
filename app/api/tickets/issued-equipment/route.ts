import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPagePermission } from '@/lib/permissions';
import { fetchIssuedEquipmentForTicket } from '@/lib/tickets/equipment-usage-service';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canEdit = await hasPagePermission('/admin/tickets', 'edit');
    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const stationName = searchParams.get('stationName');
    const techniciansParam = searchParams.get('technicians');
    const ticketId = searchParams.get('ticketId') || undefined;

    if (!stationName) {
      return NextResponse.json({ error: 'stationName is required' }, { status: 400 });
    }

    const technicianNames = techniciansParam
      ? techniciansParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const result = await fetchIssuedEquipmentForTicket({
      stationName,
      technicianNames,
      ticketId,
    });

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[Issued Equipment GET]', error);
    return NextResponse.json({ error: 'Failed to fetch issued equipment' }, { status: 500 });
  }
}
