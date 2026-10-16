import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { SavePrefsSchema } from '@/lib/notifications/preferences'
import { getNotificationView } from '@/lib/notifications/visibility'
import { resolvePrefs } from '@/lib/notifications/preferences'
import { getNotificationKinds } from '@/lib/notifications/kinds'

// The signed-in admin's own notification preferences (Settings > General >
// Notifications). Personal, so there is no "edit someone else's" form of this:
// it always reads and writes the caller's own row.
//
// Same door as the bell it configures.

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!await hasPermission(user, 'config.manage')) return errorResponse('Forbidden', 403)

  const { kinds, prefs } = await getNotificationView(user.id)
  return NextResponse.json({ kinds, prefs })
}

export async function PUT(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!await hasPermission(user, 'config.manage')) return errorResponse('Forbidden', 403)

  const parsed = SavePrefsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  // Only kinds installed right now are taken from the request; a choice saved for
  // a module that is currently uninstalled is left alone, so putting the module
  // back finds the person's settings where they left them.
  const [kinds, row] = await Promise.all([
    getNotificationKinds(),
    prisma.user.findUnique({ where: { id: user.id }, select: { notificationPrefs: true } }),
  ])
  const stored = row?.notificationPrefs && typeof row.notificationPrefs === 'object' && !Array.isArray(row.notificationPrefs)
    ? row.notificationPrefs as Record<string, unknown>
    : {}
  const merged: Record<string, { show: boolean; browser: boolean }> = {}
  for (const k of kinds) {
    const choice = parsed.data[k.id]
    if (choice) merged[k.id] = choice
  }
  await prisma.user.update({ where: { id: user.id }, data: { notificationPrefs: { ...stored, ...merged } } })
  return NextResponse.json({ ok: true, prefs: resolvePrefs({ ...stored, ...merged }, kinds) })
}
