'use client'

import { useEffect, useRef, useState } from 'react'
import { DesktopAlertsToggle, useDesktopAlerts } from '@/components/admin/DesktopAlertsToggle'
import { defaultPrefs, type NotificationKind, type NotificationPrefs } from '@/lib/notifications/preferences'

// Settings > General > Notifications. Per admin: which kinds of notification they
// get in the bell, and which of those they also want a browser alert for.
//
// Core's kinds are plain rows. A module with one kind is a plain row too; a module
// with several folds them into an accordion, closed until opened, whose header
// switches the lot at once.
//
// Saves on every tick, like Schedules and the admin menu editor, so it has no
// page-level Save button (see saveScope in ConfigPageClient). The choices are the
// signed-in person's own; the browser switch for THIS browser is the bell button
// shown beside the explanation, because permission is granted per browser.

type Row = { kind: NotificationKind }
type Section = { key: string; label: string; kinds: NotificationKind[] }

/** Core first, then each module by name. A module with a single kind stays a row. */
function layout(kinds: NotificationKind[]): Array<Row | Section> {
  const out: Array<Row | Section> = kinds.filter((k) => !k.group).map((kind) => ({ kind }))
  const byModule = new Map<string, Section>()
  for (const k of kinds) {
    if (!k.group) continue
    const section = byModule.get(k.group) ?? { key: k.group, label: k.groupLabel ?? k.group, kinds: [] }
    section.kinds.push(k)
    byModule.set(k.group, section)
  }
  const sections = [...byModule.values()].sort((a, b) => a.label.localeCompare(b.label))
  for (const s of sections) {
    const only = s.kinds.length === 1 ? s.kinds[0] : undefined
    out.push(only ? { kind: only } : s)
  }
  return out
}

type Choice = { id: string; field: 'show' | 'browser'; value: boolean }

export default function NotificationsSettingsClient() {
  const [kinds, setKinds] = useState<NotificationKind[]>([])
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
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
        if (live) {
          setKinds(d.kinds as NotificationKind[])
          setPrefs(d.prefs as NotificationPrefs)
        }
      })
      .catch((err: unknown) => {
        if (live) {
          setPrefs(defaultPrefs([]))
          setError(err instanceof Error ? err.message : 'Could not load your notification settings')
        }
      })
    return () => { live = false }
  }, [])

  async function change(choices: Choice[]) {
    if (!prefs) return
    const before = prefs
    const next: NotificationPrefs = { ...prefs }
    for (const c of choices) {
      const current = next[c.id]
      if (current) next[c.id] = { ...current, [c.field]: c.value }
    }
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

  function renderKind(kind: NotificationKind, indent: boolean) {
    const pref = prefs?.[kind.id]
    if (!pref) return null
    return (
      <tr key={kind.id}>
        <td style={indent ? { paddingLeft: 'var(--space-8)' } : undefined}>
          <strong>{kind.label}</strong>
          {kind.group && !indent && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}> ({kind.groupLabel})</span>
          )}
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{kind.description}</div>
        </td>
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={pref.show}
            aria-label={`Show ${kind.label.toLowerCase()}`}
            onChange={(e) => void change([{ id: kind.id, field: 'show', value: e.target.checked }])}
          />
        </td>
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={pref.show && pref.browser}
            disabled={!pref.show}
            aria-label={`Browser alert for ${kind.label.toLowerCase()}`}
            onChange={(e) => void change([{ id: kind.id, field: 'browser', value: e.target.checked }])}
          />
        </td>
      </tr>
    )
  }

  function renderSection(section: Section) {
    if (!prefs) return null
    const expanded = open[section.key] === true
    const shown = section.kinds.filter((k) => prefs[k.id]?.show).length
    const alerted = section.kinds.filter((k) => prefs[k.id]?.show && prefs[k.id]?.browser).length
    const total = section.kinds.length
    const everyId = section.kinds.map((k) => k.id)
    return [
      <tr key={section.key}>
        <td>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setOpen((o) => ({ ...o, [section.key]: !expanded }))}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%' }}
          >
            <span aria-hidden="true" style={{ display: 'inline-block', transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'none' }}>&#9656;</span>
            <strong>{section.label}</strong>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{total} notifications</span>
          </button>
        </td>
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={shown === total}
            ref={(el) => { if (el) el.indeterminate = shown > 0 && shown < total }}
            aria-label={`Show all ${section.label} notifications`}
            onChange={(e) => void change(everyId.map((id) => ({ id, field: 'show' as const, value: e.target.checked })))}
          />
        </td>
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={shown > 0 && alerted === shown}
            ref={(el) => { if (el) el.indeterminate = alerted > 0 && alerted < shown }}
            disabled={shown === 0}
            aria-label={`Browser alerts for all ${section.label} notifications`}
            onChange={(e) => void change(section.kinds.filter((k) => prefs[k.id]?.show).map((k) => ({ id: k.id, field: 'browser' as const, value: e.target.checked })))}
          />
        </td>
      </tr>,
      ...(expanded ? section.kinds.map((k) => renderKind(k, true)) : []),
    ]
  }

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
              {layout(kinds).map((entry) => ('kind' in entry ? renderKind(entry.kind, false) : renderSection(entry)))}
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
