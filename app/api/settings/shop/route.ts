import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import clientPromise from '@/lib/mongodb'

interface ShopSettings {
  type: 'shop'
  isClosed: boolean
  closureType: 'manual' | 'automatic' | null
  manualCloseDate: Date | null
  automaticSchedule: {
    enabled: boolean
    daysOfWeek: number[] // 0 = Sunday, 1 = Monday, etc.
    startTime: string // HH:mm format
    endTime: string // HH:mm format
    timezone: string
  } | null
  message: string
  updatedAt: Date
  updatedBy: string
}

// Helper function to check if user is superadmin
async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.email) {
    return false
  }

  const client = await clientPromise
  const db = client.db('tixmgmt')
  const usersCollection = db.collection('users')

  const user = await usersCollection.findOne({
    email: session.user.email.toLowerCase(),
  })

  return user?.role === 'superadmin'
}

// GET - Fetch shop settings
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('tixmgmt')
    const settingsCollection = db.collection<ShopSettings>('settings')

    const settings = await settingsCollection.findOne({ type: 'shop' })

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        isClosed: false,
        closureType: null,
        manualCloseDate: null,
        automaticSchedule: null,
        message: 'We are currently closed. Please check back later.',
      })
    }

    // Check if schedule should close the shop
    let shouldBeClosed = settings.isClosed

    if (settings.closureType === 'automatic' && settings.automaticSchedule?.enabled) {
      // Automatic schedule overrides manual toggle
      const now = new Date()
      const dayOfWeek = now.getDay()
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })

      const schedule = settings.automaticSchedule
      const isScheduledDay = schedule.daysOfWeek.includes(dayOfWeek)
      const isWithinHours =
        currentTime >= schedule.startTime && currentTime <= schedule.endTime

      shouldBeClosed = isScheduledDay && isWithinHours
    } else if (settings.closureType === 'manual' && settings.manualCloseDate) {
      // Manual timeline: close if current time is past the set date
      const now = new Date()
      const closeDate = new Date(settings.manualCloseDate)
      shouldBeClosed = now >= closeDate
    }
    // If closureType is null, use the manual isClosed toggle

    return NextResponse.json({
      ...settings,
      isClosed: shouldBeClosed,
    })
  } catch (error) {
    console.error('Error fetching shop settings:', error)
    return NextResponse.json({ error: 'Failed to fetch shop settings' }, { status: 500 })
  }
}

// PUT - Update shop settings (super admin only)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: 'Unauthorized. Super admin only.' }, { status: 403 })
    }

    const session = await auth()
    const body = await request.json()

    const client = await clientPromise
    const db = client.db('tixmgmt')
    const settingsCollection = db.collection<ShopSettings>('settings')

    const updateData: Partial<ShopSettings> = {
      type: 'shop',
      isClosed: body.isClosed ?? false,
      closureType: body.closureType ?? null,
      manualCloseDate: body.manualCloseDate ? new Date(body.manualCloseDate) : null,
      automaticSchedule: body.automaticSchedule ?? null,
      message: body.message || 'We are currently closed. Please check back later.',
      updatedAt: new Date(),
      updatedBy: session?.user?.email || 'unknown',
    }

    const result = await settingsCollection.updateOne(
      { type: 'shop' },
      { $set: updateData },
      { upsert: true }
    )

    return NextResponse.json({ success: true, settings: updateData })
  } catch (error) {
    console.error('Error updating shop settings:', error)
    return NextResponse.json({ error: 'Failed to update shop settings' }, { status: 500 })
  }
}

