'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminTooltip } from '@/components/admin/Tooltip'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { DesktopAlertsToggle } from '@/components/admin/DesktopAlertsToggle'
import { DeleteAllIcon, MarkAllReadIcon } from '@/components/admin/notification-icons'

type Props = {
  /** Everything in the table, not just the page's capped slice. */
  total: number
  unread: number
  /**
   * Open deployment notifications - changes saved but not yet live. Delete all
   * leaves these alone, so they come off the number the confirm names.
   */
  pendingDeploy: number
  /** Settings > General > Notifications, where the person picks what they get. */
  settingsHref: string
}

export default function NotificationBulkActions({ total, unread, pendingDeploy, settingsHref }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [askConfirm, confirmNode] = useAdminConfirm()

  // What Delete all would actually remove - the open deployment notification is
  // deliberately left behind by the endpoint.
  const deletable = total - pendingDeploy

  async function handleMarkAllRead() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Action failed')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAll() {
    // Names the real number, which can be larger than the hundred rows on screen
    // and is smaller than the total when a deployment is still pending - nobody
    // should discover either after the fact.
    const kept = pendingDeploy > 0
      ? ' Changes still awaiting deployment are kept.'
      : ''
    if (!(await askConfirm({
      title: `Delete ${deletable} notification${deletable === 1 ? '' : 's'}?`,
      message: `This cannot be undone.${kept}`,
      confirmLabel: 'Delete all',
    }))) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/notifications', { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Delete failed')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // The same icons as the bell's dropdown header, in the same order: the two
  // whole-list actions sharing a capsule, then the settings cog and desktop-alerts bell sharing a capsule. The bell shows even on an empty list - whether to be nudged is not a
  // question about what is in it.
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
      {error && (
        <span style={{ color: 'var(--color-destructive)', fontSize: 'var(--text-sm)' }}>{error}</span>
      )}
      {total > 0 && (
        <div className="admin-icon-group" role="group" aria-label="Every notification">
          <AdminTooltip body="Mark all as read" placement="bottom">
            <button
              type="button"
              className="admin-icon-btn"
              aria-label="Mark all as read"
              disabled={loading || unread === 0}
              onClick={handleMarkAllRead}
            >
              {MarkAllReadIcon}
            </button>
          </AdminTooltip>
          <AdminTooltip body="Delete all" placement="bottom">
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              aria-label="Delete all"
              disabled={loading || deletable === 0}
              onClick={handleDeleteAll}
            >
              {DeleteAllIcon}
            </button>
          </AdminTooltip>
        </div>
      )}
      <DesktopAlertsToggle settingsHref={settingsHref} />
      {confirmNode}
    </div>
  )
}
