import { z } from 'zod'
import { VIDEO_JOB_DEDUPE_PREFIX } from '@/lib/media/video-job-notification'

// Settings > General > Notifications: per admin, which kinds of notification they
// see in the bell and on the Notifications page, and which of those they also want
// a browser alert for.
//
// A "kind" is one thing a notification can be about: "a new order", "a mail
// account will not let us in", "a Cactus update". Core declares its own below; a
// module declares its own in its manifest (`notificationKinds`, read live by
// lib/notifications/kinds.ts), so a module's alerts get a switch of their own
// without core knowing the module exists.
//
// A notification is filed under a kind two ways:
//   1. its dedupeKey starts with the kind's `dedupePrefix` (longest prefix wins);
//   2. failing that, its type matches a kind's `fallbackType`. This catches an
//      alert from a module that has declared nothing, so nothing is ever without
//      a switch - it files under "Other messages" or "Other warnings".
//
// "Changes awaiting deployment" is deliberately NOT a kind: it is the only
// route to the Redeploy button and the only record of saved-but-not-live changes,
// so it is always shown (and, as before, never pushed).
//
// Free of any server import: the Settings tab (a client component), the bell and
// the server's push all read it.

export type NotificationKind = {
  /** Stable key the choice is saved under. Core's are bare ('video'); a module's
   *  are `{module}:{id}`. Never rename one - the saved choice is keyed by it. */
  id: string
  label: string
  description: string
  /** The module that raises it, or null for core. Kinds sharing a module are
   *  grouped on the Settings tab. */
  group: string | null
  groupLabel: string | null
  /** Files a notification here when its dedupeKey starts with this. */
  dedupePrefix?: string
  /** Files a notification here, last of all, when it matched no prefix and has
   *  this type. */
  fallbackType?: string
  /** Whether a browser alert is on until the person says otherwise. */
  browserDefault: boolean
}

export const CORE_NOTIFICATION_KINDS: NotificationKind[] = [
  { id: 'member_approval', label: 'Members awaiting approval', description: 'Somebody has signed up and is waiting for you to let them in.', group: null, groupLabel: null, dedupePrefix: 'member-pending-approval:', browserDefault: true },
  { id: 'member_deletion', label: 'Members leaving', description: 'A member has asked to delete their account.', group: null, groupLabel: null, dedupePrefix: 'member-deletion:', browserDefault: true },
  { id: 'video', label: 'Video optimising', description: 'Progress and results for videos being made web-friendly.', group: null, groupLabel: null, dedupePrefix: VIDEO_JOB_DEDUPE_PREFIX, browserDefault: true },
  { id: 'schema_drift', label: 'Module database out of step', description: 'A module\'s stored data does not match the version of it that is running.', group: null, groupLabel: null, dedupePrefix: 'schema-drift', browserDefault: true },
  { id: 'core_update', label: 'Cactus updates', description: 'A newer version of the Cactus platform is available.', group: null, groupLabel: null, dedupePrefix: 'core-update', fallbackType: 'core_update', browserDefault: false },
  { id: 'module_update', label: 'Module updates', description: 'A newer version of an installed module is available.', group: null, groupLabel: null, dedupePrefix: 'module-update:', fallbackType: 'module_update', browserDefault: false },
  { id: 'message', label: 'Other messages', description: 'Anything else a person or a module has sent your way that has no switch of its own.', group: null, groupLabel: null, fallbackType: 'message', browserDefault: true },
  { id: 'alert', label: 'Other warnings', description: 'Anything else that is wrong and wants a look, and has no switch of its own.', group: null, groupLabel: null, fallbackType: 'alert', browserDefault: true },
]

export type CategoryPref = { show: boolean; browser: boolean }
export type NotificationPrefs = Record<string, CategoryPref>

type Filed = { type: string; dedupeKey?: string | null }

/** Which kind a notification files under. `deployment` has none. */
export function kindOf(kinds: readonly NotificationKind[], n: Filed): NotificationKind | null {
  if (n.type === 'deployment') return null
  const key = n.dedupeKey ?? ''
  let best: NotificationKind | null = null
  if (key) {
    for (const k of kinds) {
      if (!k.dedupePrefix || !key.startsWith(k.dedupePrefix)) continue
      if (!best || k.dedupePrefix.length > (best.dedupePrefix?.length ?? 0)) best = k
    }
  }
  return best ?? kinds.find((k) => k.fallbackType === n.type) ?? null
}

// Exactly how everything behaved before this setting existed: all shown, and a
// browser alert for the kinds worth interrupting somebody for.
export function defaultPrefs(kinds: readonly NotificationKind[]): NotificationPrefs {
  const out: NotificationPrefs = {}
  for (const k of kinds) out[k.id] = { show: true, browser: k.browserDefault }
  return out
}

const StoredSchema = z.record(
  z.string(),
  z.object({ show: z.boolean().optional(), browser: z.boolean().optional() }),
)

/** What a save may carry: any number of kinds, each fully spelled out. The route
 *  keeps only the ids it recognises and leaves every other saved choice alone. */
export const SavePrefsSchema = z.record(z.string(), z.object({ show: z.boolean(), browser: z.boolean() }))

/** Whatever is stored on the user, laid over the defaults. Never throws. */
export function resolvePrefs(raw: unknown, kinds: readonly NotificationKind[]): NotificationPrefs {
  const out = defaultPrefs(kinds)
  const parsed = StoredSchema.safeParse(raw)
  if (!parsed.success) return out
  for (const k of kinds) {
    const stored = parsed.data[k.id]
    if (!stored) continue
    out[k.id] = { show: stored.show ?? true, browser: stored.browser ?? k.browserDefault }
  }
  return out
}

/** Whether to browser-alert this person about a notification. A hidden kind is
 *  never announced, whatever its browser switch says. */
export function wantsBrowserAlert(prefs: NotificationPrefs, kinds: readonly NotificationKind[], n: Filed): boolean {
  const k = kindOf(kinds, n)
  const pref = k ? prefs[k.id] : undefined
  return !!pref && pref.show && pref.browser
}
