import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { VIDEO_JOB_DEDUPE_PREFIX } from '@/lib/media/video-job-notification'
import { resolvePrefs, type NotificationPrefs } from './preferences'

/** This person's saved notification preferences, over the defaults. */
export async function getUserNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } })
  return resolvePrefs(row?.notificationPrefs)
}

/**
 * The `where` that leaves out the kinds this person has switched off. Empty when
 * they have switched off nothing, so the common case adds no clause at all.
 *
 * Video jobs are `message` rows told apart by their dedupeKey, hence the care
 * below; and a null dedupeKey must be let through explicitly, because
 * `NOT (dedupeKey LIKE 'video-job:%')` is NULL, not true, for a null key.
 */
export function visibleNotificationsWhere(prefs: NotificationPrefs): Prisma.NotificationWhereInput {
  const isVideo: Prisma.NotificationWhereInput = { dedupeKey: { startsWith: VIDEO_JOB_DEDUPE_PREFIX } }
  const and: Prisma.NotificationWhereInput[] = []
  if (!prefs.video.show) and.push({ OR: [{ dedupeKey: null }, { NOT: isVideo }] })
  if (!prefs.message.show) and.push({ OR: [{ type: { not: 'message' } }, isVideo] })
  if (!prefs.alert.show) and.push({ type: { not: 'alert' } })
  if (!prefs.core_update.show) and.push({ type: { not: 'core_update' } })
  if (!prefs.module_update.show) and.push({ type: { not: 'module_update' } })
  return and.length > 0 ? { AND: and } : {}
}
