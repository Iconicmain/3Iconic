import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { fetchAllInventoryStations } from '@/lib/isp/station-access';
import {
  accountTypeFromUser,
  accountTypeLabel,
  userRequiresInventoryStationAssignment,
} from '@/lib/user-account-types';

export const runtime = 'nodejs';

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const client = await clientPromise;
  const user = await client.db('tixmgmt').collection('users').findOne(
    { email: session.user.email.toLowerCase() },
    { projection: { role: 1 } }
  );

  if (user?.role !== 'superadmin') return null;
  return session;
}

export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  const client = await clientPromise;
  const users = await client.db('tixmgmt').collection('users').find({}).toArray();
  const stations = await fetchAllInventoryStations();

  const assignableUsers = users
    .filter((u) =>
      userRequiresInventoryStationAssignment({
        role: u.role,
        accountType: u.accountType,
        pagePermissions: u.pagePermissions,
      })
    )
    .map((u) => ({
      id: u.id || u._id.toString(),
      email: u.email,
      name: u.name,
      accountType: accountTypeFromUser(u),
      accountTypeLabel: accountTypeLabel(accountTypeFromUser(u)),
      assignedStationIds: Array.isArray(u.assignedStationIds) ? u.assignedStationIds : [],
      hasInventoryAccess: (u.pagePermissions || []).some(
        (p: { pageId: string; permissions?: string[] }) =>
          p.pageId === 'inventory' && p.permissions?.includes('view')
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    users: assignableUsers,
    stations: stations.map((s) => ({
      id: s.id,
      stationName: s.stationName,
      code: s.code,
    })),
  });
}

export async function PUT(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, assignedStationIds } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const ids = Array.isArray(assignedStationIds)
    ? assignedStationIds.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim())
    : [];

  const client = await clientPromise;
  const usersCol = client.db('tixmgmt').collection('users');

  let user = null;
  if (ObjectId.isValid(userId)) {
    user = await usersCol.findOne({ _id: new ObjectId(userId) });
  }
  if (!user) {
    user = await usersCol.findOne({ id: userId });
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (
    !userRequiresInventoryStationAssignment({
      role: user.role,
      accountType: user.accountType,
      pagePermissions: user.pagePermissions,
    })
  ) {
    return NextResponse.json(
      { error: 'This user does not require inventory station assignment' },
      { status: 400 }
    );
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'Select at least one station for this user' },
      { status: 400 }
    );
  }

  const stations = await fetchAllInventoryStations();
  const validIds = new Set(stations.flatMap((s) => [s.id, s.stationId, s._id]));
  const invalid = ids.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'One or more station IDs are invalid' }, { status: 400 });
  }

  await usersCol.updateOne(
    { _id: user._id },
    {
      $set: {
        assignedStationIds: ids,
        assignedStationId: ids[0] || null,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({
    success: true,
    userId: user.id || user._id.toString(),
    assignedStationIds: ids,
  });
}
