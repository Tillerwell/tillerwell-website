import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { SavePrefsSchema } from '@/lib/notifications/preferences'
import { getUserNotificationPrefs } from '@/lib/notifications/visibility'

// The signed-in admin's own notification preferences (Settings > General >
// Notifications). Personal, so there is no "edit someone else's" form of this:
// it always reads and writes the caller's own row.
//
// Same door as the bell it configures.

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!await hasPermission(user, 'config.manage')) return errorResponse('Forbidden', 403)

  return NextResponse.json({ prefs: await getUserNotificationPrefs(user.id) })
}

export async function PUT(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!await hasPermission(user, 'config.manage')) return errorResponse('Forbidden', 403)

  const parsed = SavePrefsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  await prisma.user.update({ where: { id: user.id }, data: { notificationPrefs: parsed.data } })
  return NextResponse.json({ ok: true, prefs: parsed.data })
}
