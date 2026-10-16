import { z } from 'zod'
import { isVideoJobDedupeKey } from '@/lib/media/video-job-notification'
import { isPushworthy } from '@/lib/push/pushworthy'

// Settings > General > Notifications: per admin, which kinds of notification they
// see in the bell and on the Notifications page, and which of those they also want
// a browser alert for.
//
// A "category" is the coarse kind a notification belongs to. Module alerts all
// ride the generic `message` or `alert` type, so a module's alert files under one
// of those rather than getting a row of its own - rows for every module's every
// alert would be a list nobody keeps up with. Video jobs are the one exception,
// because they are core and so chatty that they need their own switch.
//
// "Changes awaiting deployment" is deliberately NOT a category: it is the only
// route to the Redeploy button and the only record of saved-but-not-live changes,
// so it is always shown (and, as before, never pushed).
//
// Free of any server import: the Settings tab (a client component), the bell and
// the server's push all read it.

export const NOTIFICATION_CATEGORIES = ['message', 'alert', 'video', 'core_update', 'module_update'] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_CATEGORY_INFO: Record<NotificationCategory, { label: string; description: string }> = {
  message: { label: 'Messages and orders', description: 'New orders, enquiries, mentions and anything else a person has sent your way.' },
  alert: { label: 'Warnings', description: 'Something is wrong and wants a look: a failed payment sync, a disconnected account, that sort of thing.' },
  video: { label: 'Video optimising', description: 'Progress and results for videos being made web-friendly.' },
  core_update: { label: 'Cactus updates', description: 'A newer version of the Cactus platform is available.' },
  module_update: { label: 'Module updates', description: 'A newer version of an installed module is available.' },
}

export type CategoryPref = { show: boolean; browser: boolean }
export type NotificationPrefs = Record<NotificationCategory, CategoryPref>

/** Which category a notification files under. `deployment` has none. */
export function categoryOf(n: { type: string; dedupeKey?: string | null }): NotificationCategory | null {
  if (isVideoJobDedupeKey(n.dedupeKey)) return 'video'
  switch (n.type) {
    case 'message':
    case 'alert':
    case 'core_update':
    case 'module_update':
      return n.type
    default:
      return null
  }
}

// Exactly how everything behaved before this setting existed: all shown, and a
// browser alert for the kinds worth interrupting somebody for.
export function defaultPrefs(): NotificationPrefs {
  const out = {} as NotificationPrefs
  for (const c of NOTIFICATION_CATEGORIES) {
    out[c] = { show: true, browser: isPushworthy(c === 'video' ? 'message' : c) }
  }
  return out
}

const StoredSchema = z.record(
  z.string(),
  z.object({ show: z.boolean().optional(), browser: z.boolean().optional() }),
)

export const SavePrefsSchema = z.object(
  Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((c) => [c, z.object({ show: z.boolean(), browser: z.boolean() })]),
  ) as Record<NotificationCategory, z.ZodObject<{ show: z.ZodBoolean; browser: z.ZodBoolean }>>,
)

/** Whatever is stored on the user, laid over the defaults. Never throws. */
export function resolvePrefs(raw: unknown): NotificationPrefs {
  const out = defaultPrefs()
  const parsed = StoredSchema.safeParse(raw)
  if (!parsed.success) return out
  for (const c of NOTIFICATION_CATEGORIES) {
    const stored = parsed.data[c]
    if (!stored) continue
    out[c] = { show: stored.show ?? out[c].show, browser: stored.browser ?? out[c].browser }
  }
  return out
}

/** Whether to browser-alert this person about a notification. A hidden kind is
 *  never announced, whatever its browser switch says. */
export function wantsBrowserAlert(prefs: NotificationPrefs, n: { type: string; dedupeKey?: string | null }): boolean {
  const c = categoryOf(n)
  return c !== null && prefs[c].show && prefs[c].browser
}
