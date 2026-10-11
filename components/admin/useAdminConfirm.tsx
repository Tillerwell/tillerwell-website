'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// The admin's own "are you sure?", in place of the browser's confirm(). The
// browser's box is grey, cannot be styled, names the site's address as its
// title, and on some browsers offers to stop the page asking again - after
// which every Delete on that page quietly does nothing.
//
// Returns [confirm, node]: await confirm({...}) for a yes or no, and render
// {node} once, anywhere. It is drawn into <body>, so no stacking context or
// `overflow: hidden` round the trigger - the page editor's header, say - can
// bury or clip it. `{ inline: true }` draws it where {node} is instead, which
// the bell needs: its dropdown shuts on any press outside itself, and a dialog
// in <body> would count as one.
//
// Escape cancels and goes no further, so a dialog opened from a dropdown that
// also shuts on Escape takes the dialog down and leaves the dropdown standing.

export type AdminConfirmOptions = {
  title?: string
  message: ReactNode
  confirmLabel?: string
  /** '' leaves the cancel button off, for a message that only needs an OK. */
  cancelLabel?: string
  /** A red confirm button. On by default: most of these are deletions. */
  danger?: boolean
}

export function useAdminConfirm(
  { inline = false }: { inline?: boolean } = {},
): [(opts: AdminConfirmOptions) => Promise<boolean>, ReactNode] {
  const titleId = useId()
  const [state, setState] = useState<{ opts: AdminConfirmOptions; resolve: (ok: boolean) => void } | null>(null)

  const confirm = useCallback(
    (opts: AdminConfirmOptions) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  )

  const settle = useCallback((ok: boolean) => {
    setState((prev) => {
      prev?.resolve(ok)
      return null
    })
  }, [])

  useEffect(() => {
    if (!state) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      settle(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [state, settle])

  const dialog = state ? (
    <div className="admin-confirm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) settle(false) }}>
      <div className="admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="admin-confirm-title">{state.opts.title ?? 'Are you sure?'}</h2>
        <p className="admin-confirm-message">{state.opts.message}</p>
        <div className="admin-confirm-actions">
          {state.opts.cancelLabel !== '' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => settle(false)}>
              {state.opts.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            type="button"
            className={state.opts.danger === false ? 'btn btn-primary btn-sm' : 'btn btn-danger btn-sm'}
            autoFocus
            onClick={() => settle(true)}
          >
            {state.opts.confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  // Only ever non-null in the browser (it opens on a click), so <body> exists.
  const node = dialog && !inline ? createPortal(dialog, document.body) : dialog
  return [confirm, node]
}

// The same, asking for a line of text in place of the browser's prompt(): the
// name for a saved block, a link's address. Resolves the text as typed (not
// trimmed - that is the caller's call), or null when cancelled. Enter submits.

export type AdminPromptOptions = {
  title: string
  message?: ReactNode
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  /** What the box is for, for a screen reader. Defaults to the title. */
  inputLabel?: string
}

export function useAdminPrompt(
  { inline = false }: { inline?: boolean } = {},
): [(opts: AdminPromptOptions) => Promise<string | null>, ReactNode] {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ opts: AdminPromptOptions; resolve: (value: string | null) => void } | null>(null)
  const [value, setValue] = useState('')

  const ask = useCallback((opts: AdminPromptOptions) => new Promise<string | null>((resolve) => {
    setValue(opts.defaultValue ?? '')
    setState({ opts, resolve })
  }), [])

  const settle = useCallback((answer: string | null) => {
    setState((prev) => {
      prev?.resolve(answer)
      return null
    })
  }, [])

  useEffect(() => {
    if (!state) return
    // Focused and selected, so a default can be typed straight over.
    inputRef.current?.focus()
    inputRef.current?.select()
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      settle(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [state, settle])

  const dialog = state ? (
    <div className="admin-confirm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) settle(null) }}>
      <form
        className="admin-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(e) => { e.preventDefault(); settle(value) }}
      >
        <h2 id={titleId} className="admin-confirm-title">{state.opts.title}</h2>
        {state.opts.message && <p className="admin-confirm-message">{state.opts.message}</p>}
        <input
          ref={inputRef}
          className="admin-confirm-input"
          type="text"
          value={value}
          placeholder={state.opts.placeholder}
          aria-label={state.opts.inputLabel ?? state.opts.title}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="admin-confirm-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => settle(null)}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm">{state.opts.confirmLabel ?? 'OK'}</button>
        </div>
      </form>
    </div>
  ) : null

  const node = dialog && !inline ? createPortal(dialog, document.body) : dialog
  return [ask, node]
}
