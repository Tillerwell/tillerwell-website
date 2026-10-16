import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Puck's store only exists inside <Puck>, so the selector hook is faked over a plain object.
const state: { selectedItem: { type: string } | null; config: Record<string, unknown> } = {
  selectedItem: { type: 'Thing' },
  config: {},
}
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (selector: (s: typeof state) => unknown) => selector(state),
}))

import { createTabbedFieldsOverride, tabbedFieldsOverride } from '@/lib/puck/tabs/TabbedFieldsOverride'

// Stands in for Puck's FieldsChild: the override only ever reads the `fieldName` prop.
function Field({ fieldName }: { fieldName: string }) {
  return <div data-field={fieldName} />
}

const fieldsOf = (names: string[]) => names.map((n) => <Field key={n} fieldName={n} />)
const render = (names: string[], Override = tabbedFieldsOverride, itemSelector: unknown = { index: 0 }) => {
  const Comp = Override as (p: { children: React.ReactNode; itemSelector?: unknown }) => React.ReactNode
  return renderToStaticMarkup(<Comp itemSelector={itemSelector}>{fieldsOf(names)}</Comp>)
}

const PANEL = /<div role="tabpanel"[^>]*aria-labelledby="[^"]*-tab-(\w+)"([^>]*)>(.*?)<\/div>(?=<div role="tabpanel"|$)/g

beforeEach(() => {
  state.selectedItem = { type: 'Thing' }
  state.config = { components: { Thing: { fields: {} } } }
})

describe('tabbed fields override', () => {
  const names = ['heading', 'text', 'textColor', 'bgColor', 'padding', 'visibility']

  it('sorts a long field list into Block, Appearance and Layout panels', () => {
    const html = render(names)
    expect(html).toContain('role="tablist"')
    expect([...html.matchAll(/data-tab="(\w+)"/g)].map((m) => m[1])).toEqual(['block', 'appearance', 'layout'])
    const panels = Object.fromEntries([...html.matchAll(PANEL)].map((m) => [m[1], [...m[3]!.matchAll(/data-field="(\w+)"/g)].map((f) => f[1])]))
    expect(panels).toEqual({
      block: ['heading', 'text'],
      appearance: ['textColor', 'bgColor'],
      layout: ['padding', 'visibility'],
    })
  })

  it('starts on Block and hides the other panels without unmounting them', () => {
    const html = render(names)
    expect(html).toMatch(/data-tab="block"[^>]*aria-selected="true"|aria-selected="true"[^>]*data-tab="block"/)
    expect([...html.matchAll(PANEL)].map((m) => [m[1], /\bhidden/.test(m[2]!)])).toEqual([
      ['block', false],
      ['appearance', true],
      ['layout', true],
    ])
  })

  it('honours the block\'s own fieldTabs map', () => {
    state.config = { components: { Thing: { fields: {}, fieldTabs: { heading: 'appearance' } } } }
    const html = render(names)
    const panels = Object.fromEntries([...html.matchAll(PANEL)].map((m) => [m[1], [...m[3]!.matchAll(/data-field="(\w+)"/g)].map((f) => f[1])]))
    expect(panels.appearance).toEqual(['heading', 'textColor', 'bgColor'])
  })

  it('leaves a short field list as one plain list', () => {
    const html = render(['heading', 'textColor', 'padding'])
    expect(html).not.toContain('role="tablist"')
    expect(html.match(/data-field=/g)).toHaveLength(3)
  })

  it('shows no strip when everything lands on one tab', () => {
    const html = render(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'])
    expect(html).not.toContain('role="tablist"')
    expect(html.match(/data-field=/g)).toHaveLength(7)
  })

  it('reads the root config when nothing is selected', () => {
    state.selectedItem = null
    state.config = { components: {}, root: { fields: {}, fieldTabs: { heading: 'layout' } } }
    const html = render(names, tabbedFieldsOverride, null)
    expect(html).toContain('role="tablist"')
  })

  it('renders nothing for an empty root when asked to hide it', () => {
    state.selectedItem = null
    const Hide = createTabbedFieldsOverride({ hideWhenNothingSelected: true })
    expect(render(['title'], Hide, null)).toBe('')
    expect(render(['title'], Hide, { index: 0 })).toContain('data-field="title"')
  })

  it('falls back to a flat list if a child has no fieldName', () => {
    const Comp = tabbedFieldsOverride as (p: { children: React.ReactNode }) => React.ReactNode
    const html = renderToStaticMarkup(<Comp><div data-odd />{fieldsOf(names)}</Comp>)
    expect(html).not.toContain('role="tablist"')
    expect(html).toContain('data-odd')
  })
})
