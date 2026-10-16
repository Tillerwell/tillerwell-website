'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { AdminTooltip } from './Tooltip'
import { useAdminConfirm } from './useAdminConfirm'
import { SettingsIcon } from './notification-icons'
import { BELL_SUBSCRIPTION_PATH, BELL_WORKER_PATH } from '@/lib/push/worker'

// Desktop (browser) alerts for new notifications: the store and the bell
// button that switches them, shared by the sidebar bell's dropdown and the
// Notifications page so the two can never disagree about whether they are on.
//
// TWO ROADS, push first:
//   push - the browser subscribes with its own push service and the site
//          sends to it the moment an alert is raised (lib/push/send.ts). Arrives
//          with no admin tab open at all. Every current desktop browser, and an
//          iPhone or iPad from the Home Screen app.
//   poll - an open admin tab asking every so often and popping the alert up
//          itself (NotificationBell). What is left for a browser with
//          notifications but no push, and the fallback while push is starting.
// Safari in an ordinary iPhone or iPad tab has neither; the button there
// explains how to get them rather than vanishing ('homescreen').
//
// The on/off choice is per browser, kept in this browser: the permission itself
// is granted per browser per site, so a database row saying "on" would describe
// nothing about the Chrome in front of somebody. The subscription the server
// sends to is a database row, kept against whoever turned it on.
const DESKTOP_ALERTS_KEY = 'cactus-bell-desktop-alerts'

type Mode = 'push' | 'poll' | 'homescreen' | 'unsupported'

function detectMode(): Mode {
  if (typeof window === 'undefined') return 'unsupported'
  const notifications = 'Notification' in window
  if (notifications && 'serviceWorker' in navigator && 'PushManager' in window) return 'push'
  if (notifications) return 'poll'
  // Safari on an iPhone or iPad, in an ordinary tab: the only browser that
  // says whether it is running as a Home Screen app, and the only one that
  // keeps notifications for that case alone.
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
  if (standalone === false) return 'homescreen'
  return 'unsupported'
}

function storedOn(): boolean {
  try {
    return window.localStorage.getItem(DESKTOP_ALERTS_KEY) === 'on'
  } catch {
    return false
  }
}

function store(value: 'on' | 'off'): void {
  try {
    window.localStorage.setItem(DESKTOP_ALERTS_KEY, value)
  } catch {
    // Storage refused; the choice lasts as long as the page does.
  }
}

export function desktopAlertsOn(): boolean {
  try {
    return typeof Notification !== 'undefined'
      && Notification.permission === 'granted'
      && storedOn()
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// The push half. Prepared once per page load, before anybody presses anything,
// because Safari only lets a press ask for permission if nothing is awaited in
// between: the worker's registration and the site's key have to be in hand
// already.
// ---------------------------------------------------------------------------

type PushKit = { registration: ServiceWorkerRegistration; key: Uint8Array<ArrayBuffer> }

let kit: PushKit | null = null
let preparing: Promise<void> | null = null
/** Whether the site is pushing to this browser right now. While it is, the
 *  open tab's own popups stand down - the push shows the same alert. */
let pushed = false

const listeners = new Set<() => void>()
function changed(): void {
  listeners.forEach((l) => l())
}

export function subscribeDesktopAlerts(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Whether this browser is receiving bell alerts by push. */
export function bellPushActive(): boolean {
  return pushed
}

/** The site's public key as the browser wants it. */
function keyBytes(publicKey: string): Uint8Array<ArrayBuffer> {
  const padded = publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (publicKey.length % 4)) % 4)
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function sameKey(subscription: PushSubscription, expected: Uint8Array): boolean {
  const held = subscription.options?.applicationServerKey
  // A browser that does not say which key it subscribed with is taken at its
  // word; the site says so soon enough if it is wrong, and forgets the row.
  if (!held) return true
  const bytes = new Uint8Array(held)
  return bytes.length === expected.length && bytes.every((b, i) => b === expected[i])
}

async function tellSite(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch(BELL_SUBSCRIPTION_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Subscribes and tells the site. On the back of a press this must be the
 *  FIRST thing awaited, for Safari - and subscribe() hands back the browser's
 *  existing subscription when it already has one on the same key, so nothing
 *  needs looking up first. */
async function subscribeAndTell(ready: PushKit): Promise<boolean> {
  const subscription = await ready.registration.pushManager
    .subscribe({ userVisibleOnly: true, applicationServerKey: ready.key })
    .catch(() => null)
  return subscription ? tellSite(subscription) : false
}

/** Withdraws this browser: the site first, so it stops sending before the
 *  browser stops listening. */
async function withdraw(subscription: PushSubscription): Promise<void> {
  await fetch(BELL_SUBSCRIPTION_PATH, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined)
  await subscription.unsubscribe().catch(() => false)
}

/**
 * Registers the worker, fetches the site's key, and - when alerts are already
 * on in this browser - makes sure the site is pushing to it. Called by the bell
 * on every admin page load; only the first call in a page does anything.
 */
export function prepareBellPush(): Promise<void> {
  if (preparing) return preparing
  preparing = (async () => {
    if (detectMode() !== 'push') return
    try {
      const registration = await navigator.serviceWorker.register(BELL_WORKER_PATH)
      const response = await fetch(BELL_SUBSCRIPTION_PATH, { cache: 'no-store' })
      if (!response.ok) return
      const { publicKey } = await response.json() as { publicKey?: unknown }
      if (typeof publicKey !== 'string') return
      const key = keyBytes(publicKey)
      kit = { registration, key }

      // Bound to a key the site no longer signs with - a site restored onto a
      // new server, say. Dead already; let it go and take out a fresh one.
      const existing = await registration.pushManager.getSubscription()
      if (existing && !sameKey(existing, key)) await existing.unsubscribe().catch(() => false)
      // Turned off here, but the browser is still subscribed - a switch-off
      // whose withdrawal never reached the site. Finish it, or the alerts the
      // button says are off keep arriving.
      else if (existing && !desktopAlertsOn()) await withdraw(existing)

      // Allowed already, so most browsers subscribe without a press. Safari
      // may not; if it refuses, the open tab's own popups carry on.
      if (desktopAlertsOn() && await subscribeAndTell(kit)) {
        pushed = true
        changed()
      }
    } catch {
      // No worker in this browser after all - a private window, or site data
      // blocked. The open tab's popups are what is left, and they need nothing.
    }
  })()
  return preparing
}

export type ToggleOutcome = 'on' | 'off' | 'homescreen' | 'unchanged'

export async function toggleDesktopAlerts(): Promise<ToggleOutcome> {
  const mode = detectMode()
  if (mode === 'homescreen') return 'homescreen'
  if (typeof Notification === 'undefined') return 'unchanged'

  if (desktopAlertsOn()) {
    store('off')
    pushed = false
    changed()
    const ready = kit
    if (ready) {
      const subscription = await ready.registration.pushManager.getSubscription().catch(() => null)
      if (subscription) await withdraw(subscription)
    }
    return 'off'
  }

  let permission = Notification.permission
  let isPushed = false
  try {
    const ready = kit
    if (mode === 'push' && ready && permission !== 'denied') {
      // Subscribing is what asks for permission in Safari, so it goes first.
      isPushed = await subscribeAndTell(ready)
      permission = Notification.permission
    }
    // No push to be had yet (the worker still starting, or a push service that
    // turned the browser away), so the older road asks for itself.
    if (permission === 'default') permission = await Notification.requestPermission()
  } catch {
    // The permission prompt refused; the button stays as it was.
  }
  if (permission !== 'granted') {
    changed()
    return 'unchanged'
  }
  store('on')
  pushed = isPushed
  changed()
  // Granted on the older road while the worker was still starting: subscribe
  // now that it has, which needs no press once permission is in hand.
  if (!isPushed && mode === 'push') {
    void prepareBellPush().then(async () => {
      if (kit && desktopAlertsOn() && await subscribeAndTell(kit)) {
        pushed = true
        changed()
      }
    })
  }
  return 'on'
}

/** Whether desktop alerts are on in this browser, kept current. */
export function useDesktopAlerts(): { on: boolean; mode: Mode } {
  const on = useSyncExternalStore(subscribeDesktopAlerts, desktopAlertsOn, () => false)
  const mode = useSyncExternalStore(() => () => {}, detectMode, () => 'unsupported' as const)
  return { on, mode }
}

/** The bell button, sharing one capsule with the settings cog. Where the
 *  browser has no way to be told anything the bell goes, but the cog stays.
 *  `onSettingsClick` lets a dropdown shut itself as the link is followed. */
export function DesktopAlertsToggle({ placement = 'bottom', settingsHref, onSettingsClick }: {
  placement?: 'top' | 'bottom'
  /** Omit where the cog would only link to the page it is on. */
  settingsHref?: string
  onSettingsClick?: () => void
}) {
  const { on, mode } = useDesktopAlerts()
  // Inline: the bell's dropdown shuts on a press outside itself, and the help
  // dialog has to count as inside.
  const [tell, helpNode] = useAdminConfirm({ inline: true })
  const blocked = typeof Notification !== 'undefined' && Notification.permission === 'denied'
  const label = mode === 'homescreen'
    ? 'Alerts on this phone: add the site to your Home Screen first'
    : on
      ? 'Stop nudging me when a notification arrives'
      : blocked
        ? 'Alerts are blocked for this site in your browser settings'
        : 'Nudge me when a notification arrives, even with this tab closed'
  return (
    <div className="admin-icon-group">
      {settingsHref && (
        <AdminTooltip body="Notification settings" placement={placement}>
          <Link href={settingsHref} className="admin-icon-btn" aria-label="Notification settings" onClick={onSettingsClick}>
            {SettingsIcon}
          </Link>
        </AdminTooltip>
      )}
      {mode !== 'unsupported' && (
      <AdminTooltip body={label} placement={placement}>
        <button
          type="button"
          className="admin-icon-btn admin-alerts-toggle"
          aria-pressed={on}
          aria-label={label}
          disabled={blocked && !on}
          onClick={() => {
            void toggleDesktopAlerts().then((outcome) => {
              if (outcome !== 'homescreen') return
              void tell({
                title: 'Alerts on this phone',
                message: 'iPhone and iPad only pass on notifications from apps on the Home Screen. Tap the Share button, then Add to Home Screen. Open the new icon, sign in, and press this bell there to allow alerts.',
                confirmLabel: 'Got it',
                cancelLabel: '',
                danger: false,
              })
            })
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
            <path d="M10 18a2 2 0 0 0 4 0" />
            {!on && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </AdminTooltip>
      )}
      {helpNode}
    </div>
  )
}
