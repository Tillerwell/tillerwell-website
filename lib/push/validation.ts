import { z } from 'zod'

/** A base64url string decoding to exactly this many bytes. The keys a browser
 *  hands over are fixed-size, and one of the wrong size would only fail later,
 *  inside the encryption, on every single send. */
function base64UrlOf(bytes: number) {
  return z.string().trim().max(200).regex(/^[A-Za-z0-9_-]+={0,2}$/)
    .refine((value) => Buffer.from(value, 'base64url').length === bytes)
}

/** One browser saying yes to bell alerts: `PushSubscription.toJSON()`, as it
 *  comes. Whether the endpoint is a push service the site will post to is asked
 *  separately (isAllowedPushEndpoint), because that is a rule about where the
 *  server sends things rather than about the shape of the request. */
export const PushSubscriptionBody = z.object({
  endpoint: z.string().trim().url().max(1000),
  keys: z.object({
    p256dh: base64UrlOf(65),
    auth: base64UrlOf(16),
  }),
})

/** One browser saying no again. */
export const PushUnsubscribeBody = z.object({
  endpoint: z.string().trim().url().max(1000),
})
