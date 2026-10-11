'use client'

// The rich-text field's built-in toolbar (from @puckeditor/core) ships every mark
// control except a link button, even though the Link mark itself is enabled by
// default. This renderMenu takes the standard controls Puck hands us as `children`
// and appends a Link control, so authors can turn selected text into a hyperlink.
//
// This module imports the Puck editor runtime, so it must never reach the public
// page graph. It goes through lib/puck/fields/registry.tsx like the field widgets:
// config.tsx names the server-safe proxy, editor.ts registers the real thing, and
// only the two admin Puck editors import editor.ts. See registry.tsx for the why.

import React from 'react'
import { RichTextMenu } from '@puckeditor/core'
import type { Editor } from '@tiptap/react'
import { useAdminConfirm, useAdminPrompt } from '@/components/admin/useAdminConfirm'

// Keep in step with the protocol allow-list in config.tsx's richtextExtensions and
// with sanitizeRichText on the published render path. A bare `example.com` gets an
// https:// prefix; anything with an unlisted scheme is refused rather than stored.
const ALLOWED_HREF = /^(https?:|mailto:|tel:|\/|#)/i
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i

function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function LinkControl({ editor }: { editor: Editor | null }) {
  const isActive = editor?.isActive('link') ?? false
  const [askText, promptNode] = useAdminPrompt()
  const [tell, alertNode] = useAdminConfirm()

  const onClick = async () => {
    if (!editor) return
    const current = (editor.getAttributes('link')?.href as string) ?? ''
    const input = await askText({
      title: current ? 'Edit the link' : 'Add a link',
      message: 'Leave it empty to remove the link.',
      defaultValue: current,
      placeholder: 'https://',
      inputLabel: 'Link address',
      confirmLabel: 'Save link',
    })
    if (input === null) return // cancelled

    let url = input.trim()
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    if (!ALLOWED_HREF.test(url)) {
      if (BARE_DOMAIN.test(url)) {
        url = `https://${url}`
      } else {
        await tell({
          title: 'That link address is not allowed',
          message: 'Use a web address (https://), email (mailto:), phone (tel:), or an on-page link starting with / or #.',
          confirmLabel: 'OK',
          cancelLabel: '',
          danger: false,
        })
        return
      }
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <>
      <RichTextMenu.Control
        icon={<LinkIcon />}
        title="Link"
        active={isActive}
        onClick={() => { void onClick() }}
      />
      {promptNode}
      {alertNode}
    </>
  )
}

export function RichTextMenuWithLink({
  children,
  editor,
}: {
  children: React.ReactNode
  editor: Editor | null
  editorState?: unknown
  readOnly?: boolean
}) {
  return (
    <RichTextMenu>
      {children}
      <RichTextMenu.Group>
        <LinkControl editor={editor} />
      </RichTextMenu.Group>
    </RichTextMenu>
  )
}
