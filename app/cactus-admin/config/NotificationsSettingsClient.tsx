'use client'

import { useEffect, useRef, useState } from 'react'
import { DesktopAlertsToggle, useDesktopAlerts } from '@/components/admin/DesktopAlertsToggle'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_INFO,
  defaultPrefs,
  type NotificationCategory,
  type NotificationPrefs,
} from '@/lib/notifications/preferences'

// Settings > General > Notifications. Per admin: which kinds of notification they
// get in the bell, and which of those they also want a browser alert for.
//
// Saves on every tick, like Schedules and the admin menu editor, so it has no
// page-level Save button (see saveScope in ConfigPageClient). The choices are the
// signed-in person's own; the browser switch for THIS browser is the bell button
// shown beside the explanation, because permission is granted per browser.

export default function NotificationsSettingsClient() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const latest = useRef(0)
  const { on, mode } = useDesktopAlerts()

  useEffect(() => {
    let live = true
    fetch('/api/admin/notifications/preferences', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Could not load your notification settings')
        if (live) setPrefs(d.prefs as NotificationPrefs)
      })
      .catch((err: unknown) => {
        if (live) {
          setPrefs(defaultPrefs())
          setError(err instanceof Error ? err.message : 'Could not load your notification settings')
        }
      })
    return () => { live = false }
  }, [])

  async function change(category: NotificationCategory, field: 'show' | 'browser', value: boolean) {
    if (!prefs) return
    const before = prefs
    const next: NotificationPrefs = { ...prefs, [category]: { ...prefs[category], [field]: value } }
    setPrefs(next)
    setError('')
    setSaved(false)
    const ticket = ++latest.current
    try {
      const res = await fetch('/api/admin/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Could not save')
      if (ticket === latest.current) setSaved(true)
    } catch (err: unknown) {
      // Only the newest press may put things back; an older one failing after a
      // newer one has landed would undo the wrong thing.
      if (ticket === latest.current) {
        setPrefs(before)
        setError(err instanceof Error ? err.message : 'Could not save')
      }
    }
  }

  const browserHint = mode === 'unsupported'
    ? 'This browser cannot show notifications, so browser alerts have nowhere to go from here. Other browsers you have signed in on are unaffected.'
    : on
      ? 'Browser alerts are switched on in this browser.'
      : 'Browser alerts are off in this browser. Press the bell to allow them; each browser you use needs switching on once.'

  return (
    <div className="card">
      <h2 className="card-title">Notifications</h2>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Pick what turns up in your notifications, and what is worth a browser alert on top. These are your own
        choices; other admins set theirs. Changes waiting to go live are always shown, since that is the only
        way to the Redeploy button.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <DesktopAlertsToggle placement="bottom" />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{browserHint}</span>
      </div>

      {!prefs ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading&hellip;</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left' }}>Notification</th>
                <th scope="col" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Show me</th>
                <th scope="col" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Browser alert</th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_CATEGORIES.map((category) => {
                const info = NOTIFICATION_CATEGORY_INFO[category]
                const pref = prefs[category]
                return (
                  <tr key={category}>
                    <td>
                      <strong>{info.label}</strong>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{info.description}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={pref.show}
                        aria-label={`Show ${info.label.toLowerCase()}`}
                        onChange={(e) => void change(category, 'show', e.target.checked)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={pref.show && pref.browser}
                        disabled={!pref.show}
                        aria-label={`Browser alert for ${info.label.toLowerCase()}`}
                        onChange={(e) => void change(category, 'browser', e.target.checked)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div aria-live="polite" style={{ minHeight: '1.5em', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
        {error ? <span style={{ color: 'var(--color-destructive)' }}>{error}</span> : saved ? <span style={{ color: 'var(--color-text-muted)' }}>Saved.</span> : null}
      </div>
    </div>
  )
}
