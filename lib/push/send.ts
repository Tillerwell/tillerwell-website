import { prisma } from '@/lib/db/prisma'
import { getSiteUrlOrNull } from '@/lib/config/env'
import { getAdminPathCached } from '@/lib/config/site'
import { BRANDING_DEFAULTS } from '@/lib/config/branding'
import { hasPermission } from '@/lib/permissions/check'
import { resolvePrefs, wantsBrowserAlert } from '@/lib/notifications/preferences'
import { getNotificationKinds } from '@/lib/notifications/kinds'
import { forgetEndpoint, readVapidKeys } from './store'
import { sendWebPush } from './web-push'

// ---------------------------------------------------------------------------
// The bell telling admins' browsers about a new alert the moment it is raised,
// by Web Push - so a new order reaches a laptop and a phone with no admin tab
// open. The older road (an open tab asking every so often, see
// components/admin/NotificationBell.tsx) still covers browsers with no push.
//
// Called from lib/notifications/alerts.ts, which decides WHEN; this decides
// who and how. Never throws: an order whose alert cannot be pushed is still an
// order, and this often runs at the end of a payment webhook.
// ---------------------------------------------------------------------------

/** Who may read the bell at all - its route asks for this - and so who is told. */
const BELL_PERMISSION = 'config.manage'

/** The whole round, at most. One short POST per browser, all at once, so this
 *  is a ceiling for a bad day rather than what an ordinary send takes. */
const BUDGET_MS = 5_000

/** How long a push service holds an alert for a browser that is offline: a
 *  laptop closed overnight still hears about the evening's orders in the
 *  morning, and one closed for a week is not buried on its return. */
const TTL_S = 24 * 60 * 60

export type BellPush = {
  /** The notification's id, which is also the tag the browser groups by - so
   *  the same alert pushed twice replaces itself rather than stacking. */
  id: string
  title: string
  /** Admin-relative, as stored on the notification. */
  link: string | null
  /** What kind of notification it is, so each person's own choice of what to be
   *  alerted about (Settings > Notifications) can be honoured. Omitted by a
   *  caller that pushes straight with no bell entry (the live chat's new-visitor
   *  nudge), which files under messages. */
  type?: string
  dedupeKey?: string | null
}

/**
 * Who the site says it is to the push services. Apple refuses a send without
 * one, and it has to be an https: address or a mailto:, so a site whose own
 * address is not https (a laptop on localhost) sends nothing.
 */
function vapidSubject(): string | null {
  const site = getSiteUrlOrNull()
  return site && site.startsWith('https://') ? site : null
}

function adminBase(adminPath: string | null): string {
  const path = adminPath?.trim().replace(/^\/+|\/+$/g, '') || 'cactus-admin'
  return `/${path}`
}

export async function pushBellAlert(alert: BellPush): Promise<void> {
  const filed = { type: alert.type ?? 'message', dedupeKey: alert.dedupeKey }
  try {
    const kinds = await getNotificationKinds()
    const subscriptions = await prisma.adminPushSubscription.findMany({
      where: { user: { suspendedAt: null } },
      include: { user: { include: { role: true } } },
    })
    if (subscriptions.length === 0) return
    if (!subscriptions.some((sub) => wantsBrowserAlert(resolvePrefs(sub.user.notificationPrefs, kinds), kinds, filed))) return
    // No pair means nobody can have subscribed with one, whatever the table
    // says - and never MADE here: a pair minted by a send nobody asked for
    // would strand every subscription bound to the one that went missing.
    const keys = await readVapidKeys()
    if (!keys) return
    const subject = vapidSubject()
    if (!subject) {
      console.warn('[push] bell alerts need SITE_URL to be an https address; none sent')
      return
    }

    // A role can lose the bell after somebody subscribed; asked afresh per send.
    // And each person decides which kinds of alert they want a browser nudge for.
    const allowed = new Map<string, boolean>()
    for (const sub of subscriptions) {
      if (allowed.has(sub.userId)) continue
      const wanted = wantsBrowserAlert(resolvePrefs(sub.user.notificationPrefs, kinds), kinds, filed)
      allowed.set(sub.userId, wanted && await hasPermission(sub.user, BELL_PERMISSION))
    }

    const [base, config] = await Promise.all([
      getAdminPathCached().then(adminBase),
      prisma.siteConfig.findUnique({ where: { id: 'singleton' }, select: { siteName: true } }),
    ])
    const payload = JSON.stringify({
      title: config?.siteName || 'Your site',
      body: alert.title,
      href: alert.link?.startsWith('/') ? `${base}${alert.link}` : `${base}/notifications`,
      tag: alert.id,
      icon: BRANDING_DEFAULTS.icon512,
    })

    const deadline = Date.now() + BUDGET_MS
    await Promise.all(subscriptions.filter((sub) => allowed.get(sub.userId)).map(async (sub) => {
      try {
        const outcome = await sendWebPush(sub, payload, { keys, subject }, {
          ttlSeconds: TTL_S,
          urgency: 'high',
          timeoutMs: Math.max(1_000, deadline - Date.now()),
        })
        if (outcome.gone) await forgetEndpoint(sub.endpoint)
        else if (!outcome.ok) {
          console.warn('[push] a push service refused a bell alert', {
            status: outcome.status,
            service: new URL(sub.endpoint).hostname,
          })
        }
      } catch (err) {
        console.warn('[push] a bell alert could not be sent', {
          service: new URL(sub.endpoint).hostname,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }))
  } catch (err) {
    console.error('[push] the bell alert round failed', err)
  }
}
