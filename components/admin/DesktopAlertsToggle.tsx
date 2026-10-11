'use client'

import { useSyncExternalStore } from 'react'
import { AdminTooltip } from './Tooltip'

// Desktop (browser) alerts for new notifications: the store and the bell
// button that switches them, shared by the sidebar bell's dropdown and the
// Notifications page so the two can never disagree about whether they are on.
//
// A per-browser choice, kept in this browser: the permission itself is granted
// per browser per site, so a database row saying "on" would describe nothing
// about the Chrome in front of somebody.
const DESKTOP_ALERTS_KEY = 'cactus-bell-desktop-alerts'

export function desktopAlertsOn(): boolean {
  try {
    return typeof Notification !== 'undefined'
      && Notification.permission === 'granted'
      && window.localStorage.getItem(DESKTOP_ALERTS_KEY) === 'on'
  } catch {
    return false
  }
}

const listeners = new Set<() => void>()

export function subscribeDesktopAlerts(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function toggleDesktopAlerts(): Promise<void> {
  if (typeof Notification === 'undefined') return
  try {
    if (desktopAlertsOn()) {
      window.localStorage.setItem(DESKTOP_ALERTS_KEY, 'off')
      listeners.forEach((l) => l())
      return
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission === 'granted') window.localStorage.setItem(DESKTOP_ALERTS_KEY, 'on')
  } catch {
    // Storage or the permission prompt refused; the button stays as it was.
  }
  listeners.forEach((l) => l())
}

/** Whether desktop alerts are on in this browser, kept current. */
export function useDesktopAlerts(): { on: boolean; supported: boolean } {
  const on = useSyncExternalStore(subscribeDesktopAlerts, desktopAlertsOn, () => false)
  const supported = useSyncExternalStore(() => () => {}, () => typeof Notification !== 'undefined', () => false)
  return { on, supported }
}

/** The bell button, in its own capsule. Draws nothing in a browser with no
 *  notifications to offer. */
export function DesktopAlertsToggle({ placement = 'bottom' }: { placement?: 'top' | 'bottom' }) {
  const { on, supported } = useDesktopAlerts()
  if (!supported) return null
  const blocked = typeof Notification !== 'undefined' && Notification.permission === 'denied'
  const label = on
    ? 'Stop nudging me when a notification arrives'
    : blocked
      ? 'Desktop alerts are blocked in this browser'
      : 'Nudge me when a notification arrives'
  return (
    <div className="admin-icon-group">
      <AdminTooltip body={label} placement={placement}>
        <button
          type="button"
          className="admin-icon-btn admin-alerts-toggle"
          aria-pressed={on}
          aria-label={label}
          disabled={blocked && !on}
          onClick={() => { void toggleDesktopAlerts() }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
            <path d="M10 18a2 2 0 0 0 4 0" />
            {!on && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </AdminTooltip>
    </div>
  )
}
