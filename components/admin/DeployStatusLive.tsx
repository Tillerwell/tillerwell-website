'use client'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  deployStateLabel,
  dismissDeployStatus,
  getDeployStatus,
  getServerDeployStatus,
  subscribeDeployStatus,
} from '@/lib/deploy-status-client'

function StepGlyph({ state }: { state: 'done' | 'running' | 'failed' }) {
  if (state === 'running') {
    return (
      <span className="admin-bell-deploy-glyph" role="img" aria-label="In progress">
        <span className="setup-spinner" />
      </span>
    )
  }
  return (
    <span
      className={`admin-bell-deploy-glyph admin-bell-deploy-glyph--${state}`}
      role="img"
      aria-label={state === 'done' ? 'Completed' : 'Failed'}
    >
      {state === 'done' ? '✓' : '✕'}
    </span>
  )
}

// Live view of an in-flight redeploy: shared between the notification bell
// dropdown and the full notifications page so both read the same store (see
// lib/deploy-status-client.ts) and never disagree.
//
// `full` (the notifications page) lists every log line with a tick beside each
// finished step and a spinner beside the one still running; the bell dropdown keeps
// its compact three-line window.
export default function DeployStatusLive({ full = false }: { full?: boolean }) {
  const status = useSyncExternalStore(subscribeDeployStatus, getDeployStatus, getServerDeployStatus)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [status.lines.length])

  if (!status.active) return null

  const { failed, state, lines } = status

  return (
    <div className={['admin-bell-deploy', failed ? 'admin-bell-deploy--failed' : ''].filter(Boolean).join(' ')}>
      <div className="admin-bell-deploy-top">
        {!failed && <span className="setup-spinner admin-bell-deploy-spinner" style={{ color: 'var(--color-primary)' }} />}
        <span className="admin-bell-deploy-title">
          {failed ? 'Redeploy failed' : 'Redeploying your site'}
        </span>
        <span className={`badge ${failed ? 'badge-danger' : 'badge-info'}`}>{deployStateLabel(state, failed)}</span>
      </div>
      <div className={['admin-bell-deploy-log', full ? 'admin-bell-deploy-log--full' : ''].filter(Boolean).join(' ')} ref={logRef}>
        {lines.length > 0 ? (
          lines.map((line, i) => {
            const latest = i === lines.length - 1
            return (
              <div
                key={i}
                className={[
                  'admin-bell-deploy-line',
                  latest ? 'admin-bell-deploy-line--latest' : '',
                  full ? 'admin-bell-deploy-line--step' : '',
                ].filter(Boolean).join(' ')}
              >
                {full && <StepGlyph state={!latest ? 'done' : failed ? 'failed' : 'running'} />}
                <span>{line}</span>
              </div>
            )
          })
        ) : (
          <div className="admin-bell-deploy-line">
            {failed ? 'Your changes may not have taken effect.' : 'Applying your changes and bringing the site back up.'}
          </div>
        )}
      </div>
      {failed && (
        <div className="admin-bell-deploy-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => dismissDeployStatus()}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
