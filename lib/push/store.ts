import { prisma } from '@/lib/db/prisma'
import { encryptSecret, tryDecryptSecret } from '@/lib/crypto/secrets'
import { generateVapidKeys, isVapidKeys, type PushSubscriptionKeys, type VapidKeys } from './web-push'

// ---------------------------------------------------------------------------
// What bell alerts by Web Push keep: the site's signing pair (two SiteConfig
// columns) and the browsers admins have said yes in (AdminPushSubscription).
// See lib/push/send.ts for what is done with them.
// ---------------------------------------------------------------------------

/**
 * The site's VAPID pair, made the first time anybody asks.
 *
 * Two people turning alerts on at the same moment must end up with the SAME
 * pair, because each browser's subscription is bound to the public half it was
 * given: the write only lands on a row that has no pair yet, and both callers
 * read back whichever pair stayed.
 *
 * A stored pair that no longer decrypts - a backup restored onto a site with a
 * different ENCRYPTION_KEY - is replaced, and every subscription goes with it:
 * they were bound to a key this site can no longer sign with, so they are
 * already dead, and each browser subscribes again the next time an admin page
 * is opened in it (it compares keys - see components/admin/DesktopAlertsToggle).
 */
export async function getOrCreateVapidKeys(): Promise<VapidKeys> {
  const current = await readVapidKeys()
  if (current) return current

  const fresh = generateVapidKeys()
  const data = { pushVapidPublic: fresh.publicKey, pushVapidPrivateEncrypted: encryptSecret(fresh.privateKey) }
  await prisma.siteConfig.updateMany({ where: { id: 'singleton', pushVapidPublic: null }, data })
  const kept = await readVapidKeys()
  if (kept) return kept

  // What is stored is unusable. Replace it outright, and let the browsers bound
  // to it go - see above.
  await prisma.$transaction([
    prisma.siteConfig.updateMany({ where: { id: 'singleton' }, data }),
    prisma.adminPushSubscription.deleteMany({}),
  ])
  return (await readVapidKeys()) ?? fresh
}

/** The pair as stored, or null when there is none or it does not decrypt into
 *  a pair that belongs together. */
export async function readVapidKeys(): Promise<VapidKeys | null> {
  const row = await prisma.siteConfig.findUnique({
    where: { id: 'singleton' },
    select: { pushVapidPublic: true, pushVapidPrivateEncrypted: true },
  })
  if (!row?.pushVapidPublic || !row.pushVapidPrivateEncrypted) return null
  const privateKey = tryDecryptSecret(row.pushVapidPrivateEncrypted)
  if (!privateKey) return null
  const keys = { publicKey: row.pushVapidPublic, privateKey }
  return isVapidKeys(keys) ? keys : null
}

/**
 * Keeps one browser's subscription against the person signed in to it.
 *
 * Keyed on the endpoint, which is the browser: a second person signing in on
 * the same machine and turning alerts on takes the row over, and the first
 * stops being told about orders on a screen they are no longer at.
 */
export async function saveSubscription(userId: string, sub: PushSubscriptionKeys): Promise<void> {
  await prisma.adminPushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    update: { userId, p256dh: sub.p256dh, auth: sub.auth },
  })
}

/** Somebody turning alerts off in one browser. Their own row only: an endpoint
 *  is not a secret worth relying on, so it never removes somebody else's. */
export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.adminPushSubscription.deleteMany({ where: { endpoint, userId } })
}

/** A push service saying a browser is gone for good. */
export async function forgetEndpoint(endpoint: string): Promise<void> {
  await prisma.adminPushSubscription.deleteMany({ where: { endpoint } })
}
