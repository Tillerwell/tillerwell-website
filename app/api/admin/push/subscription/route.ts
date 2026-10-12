import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { deleteSubscription, getOrCreateVapidKeys, saveSubscription } from '@/lib/push/store'
import { PushSubscriptionBody, PushUnsubscribeBody } from '@/lib/push/validation'
import { isAllowedPushEndpoint } from '@/lib/push/web-push'

// One browser's standing with bell alerts by Web Push. See lib/push/send.ts.
//
//   GET    - the site's public signing key, which a browser needs before it
//            can subscribe at all. Made on first ask.
//   POST   - this browser said yes: keep its subscription against whoever is
//            signed in to it.
//   DELETE - this browser said no again.
//
// Only somebody who can read the bell may do any of it - the same permission
// the bell's own route asks for, and the send re-checks it every time.

export const dynamic = 'force-dynamic'

async function signedIn() {
  const user = await getSessionFromCookie()
  if (!user) return { error: errorResponse('Not authenticated', 401) } as const
  if (!await hasPermission(user, 'config.manage')) return { error: errorResponse('Forbidden', 403) } as const
  return { user } as const
}

export async function GET() {
  const session = await signedIn()
  if ('error' in session) return session.error
  const keys = await getOrCreateVapidKeys()
  return NextResponse.json({ publicKey: keys.publicKey }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const session = await signedIn()
  if ('error' in session) return session.error
  const parsed = PushSubscriptionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return errorResponse('That is not a subscription this can keep.')
  // The server POSTs to this address from now on, so it has to be one of the
  // push services the browsers use - never wherever a request says.
  if (!isAllowedPushEndpoint(parsed.data.endpoint)) {
    return errorResponse('This browser uses a push service the site does not send to.')
  }
  await saveSubscription(session.user.id, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await signedIn()
  if ('error' in session) return session.error
  const parsed = PushUnsubscribeBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return errorResponse('That is not a subscription this can find.')
  await deleteSubscription(session.user.id, parsed.data.endpoint)
  return NextResponse.json({ ok: true })
}
