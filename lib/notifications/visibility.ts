import type { NotificationType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getNotificationKinds } from './kinds'
import { resolvePrefs, type NotificationKind, type NotificationPrefs } from './preferences'

export type NotificationView = {
  kinds: NotificationKind[]
  prefs: NotificationPrefs
  /** Leaves out the kinds this person has switched off. */
  where: Prisma.NotificationWhereInput
}

/** This person's saved notification preferences over the defaults, the kinds
 *  they cover, and the `where` that hides what they have switched off. */
export async function getNotificationView(userId: string): Promise<NotificationView> {
  const [kinds, row] = await Promise.all([
    getNotificationKinds(),
    prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } }),
  ])
  const prefs = resolvePrefs(row?.notificationPrefs, kinds)
  return { kinds, prefs, where: visibleNotificationsWhere(kinds, prefs) }
}

/**
 * The `where` that leaves out the kinds this person has switched off. Empty when
 * they have switched off nothing, so the common case adds no clause at all.
 *
 * Mirrors kindOf (preferences.ts) row for row: a longer prefix beats a shorter
 * one, and a type-only kind takes what no prefix claimed. A null dedupeKey must
 * be let through explicitly wherever a prefix is negated, because
 * `NOT (dedupeKey LIKE 'x%')` is NULL, not true, for a null key.
 */
export function visibleNotificationsWhere(
  kinds: readonly NotificationKind[],
  prefs: NotificationPrefs,
): Prisma.NotificationWhereInput {
  const prefixed = kinds.filter((k) => k.dedupePrefix)
  const starts = (prefix: string): Prisma.NotificationWhereInput => ({ dedupeKey: { startsWith: prefix } })
  const and: Prisma.NotificationWhereInput[] = []

  for (const k of kinds) {
    if (prefs[k.id]?.show !== false) continue

    if (k.dedupePrefix) {
      const prefix = k.dedupePrefix
      const longer = prefixed.filter((o) => o.id !== k.id && o.dedupePrefix!.length > prefix.length && o.dedupePrefix!.startsWith(prefix))
      and.push({
        OR: [
          { dedupeKey: null },
          { NOT: { AND: [starts(prefix), ...longer.map((o) => ({ NOT: starts(o.dedupePrefix!) }))] } },
        ],
      })
    }

    // Rows of this type that no prefix claimed. `deployment` never has a kind,
    // so it can never reach here.
    if (k.fallbackType) {
      and.push({ OR: [{ type: { not: k.fallbackType as NotificationType } }, ...prefixed.map((o) => starts(o.dedupePrefix!))] })
    }
  }
  return and.length > 0 ? { AND: and } : {}
}
