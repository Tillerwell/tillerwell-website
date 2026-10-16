import { writeFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { classifyFieldTab, groupFieldNames } from '@/lib/puck/fields/fieldTabs'
import { puckConfig, layoutPuckConfig, headerPuckConfig, footerPuckConfig } from '@/lib/puck/config'

describe('classifyFieldTab', () => {
  it.each([
    ['padding', 'layout'],
    ['paddingY', 'layout'],
    ['marginBottom', 'layout'],
    ['spaceAbove', 'layout'],
    ['spaceBelowPx', 'layout'],
    ['gap', 'layout'],
    ['maxWidth', 'layout'],
    ['minHeight', 'layout'],
    ['col2Width', 'layout'],
    ['col3VAlign', 'layout'],
    ['align', 'layout'],
    ['verticalAlign', 'layout'],
    ['columns', 'layout'],
    ['sticky', 'layout'],
    ['stickyOffset', 'layout'],
    ['visibility', 'layout'],
    ['fontFamily', 'appearance'],
    ['fontSize', 'appearance'],
    ['itemFontWeight', 'appearance'],
    ['textColor', 'appearance'],
    ['bgColor', 'appearance'],
    ['hoverColour', 'appearance'],
    ['borderWidth', 'appearance'],
    ['borderRadius', 'appearance'],
    ['boxShadow', 'appearance'],
    ['overlayOpacity', 'appearance'],
    ['patternImage', 'appearance'],
    ['animationType', 'appearance'],
    ['headStyle', 'appearance'],
    ['heading', 'block'],
    ['text', 'block'],
    ['buttonLabel', 'block'],
    ['href', 'block'],
    ['showDate', 'block'],
    ['mediaUrl', 'block'],
    ['pageSize', 'block'],
    ['limit', 'block'],
    ['someBrandNewField', 'block'],
  ])('%s -> %s', (name, tab) => {
    expect(classifyFieldTab(name)).toBe(tab)
  })

  it('keeps repeaters and nested objects under Block whatever they are called', () => {
    expect(classifyFieldTab('paddingRows', { type: 'array' })).toBe('block')
    expect(classifyFieldTab('colours', { type: 'object' })).toBe('block')
  })

  it('lets a field tag itself', () => {
    expect(classifyFieldTab('heading', { type: 'text', tab: 'appearance' })).toBe('appearance')
  })

  it('lets the block map beat both the field tag and the naming rules', () => {
    expect(classifyFieldTab('padding', { type: 'select', tab: 'appearance' }, { padding: 'block' })).toBe('block')
  })

  it('ignores a nonsense tab rather than losing the field', () => {
    expect(classifyFieldTab('padding', { tab: 'sideways' as never })).toBe('layout')
  })
})

describe('groupFieldNames', () => {
  it('returns only non-empty groups in Block, Appearance, Layout order', () => {
    const groups = groupFieldNames(['padding', 'textColor', 'heading', 'bgColor'], {})
    expect(groups.map((g) => g.id)).toEqual(['block', 'appearance', 'layout'])
    expect(groups.find((g) => g.id === 'appearance')?.names).toEqual(['textColor', 'bgColor'])
  })

  it('drops a tab with nothing in it', () => {
    expect(groupFieldNames(['heading', 'text'], {}).map((g) => g.id)).toEqual(['block'])
  })
})

// Every config the editors use: the block-level `fieldTabs` map is hand-written, so a
// typo in it would silently do nothing. Catch a key that names no real field.
describe('block fieldTabs maps', () => {
  const configs = { puckConfig, layoutPuckConfig, headerPuckConfig, footerPuckConfig } as Record<string, any>

  it.each(Object.keys(configs))('%s: every fieldTabs key is a real field', (name) => {
    const stray: string[] = []
    for (const [type, def] of Object.entries<any>(configs[name].components ?? {})) {
      for (const key of Object.keys(def.fieldTabs ?? {})) {
        if (!def.fields || !(key in def.fields)) stray.push(`${type}.${key}`)
      }
    }
    expect(stray).toEqual([])
  })

  it('prints the full audit when asked', () => {
    if (!process.env.FIELD_TAB_AUDIT) return
    const rows: string[] = []
    for (const [name, cfg] of Object.entries(configs)) {
      for (const [type, def] of Object.entries<any>(cfg.components ?? {})) {
        const g = groupFieldNames(Object.keys(def.fields ?? {}), def.fields, def.fieldTabs)
        rows.push(`${name}/${type}: ` + g.map((x) => `${x.id}[${x.names.join(',')}]`).join(' '))
      }
    }
    writeFileSync(process.env.FIELD_TAB_AUDIT, rows.join('\n'))
  })
})
