import { describe, expect, it } from 'vitest'
import {
  CORE_NOTIFICATION_KINDS,
  SavePrefsSchema,
  defaultPrefs,
  kindOf,
  resolvePrefs,
  wantsBrowserAlert,
  type NotificationKind,
} from './preferences'
import { visibleNotificationsWhere } from './visibility'

const shop = (id: string, dedupePrefix: string): NotificationKind => ({
  id: `shop:${id}`, label: id, description: '', group: 'shop', groupLabel: 'Shop', dedupePrefix, browserDefault: true,
})
const KINDS: NotificationKind[] = [
  ...CORE_NOTIFICATION_KINDS,
  shop('orders', 'shop:order:'),
  shop('questions', 'shop:product-questions'),
  shop('everything', 'shop:'),
]

describe('kindOf', () => {
  it('files a video job under video even though it rides the message type', () => {
    expect(kindOf(KINDS, { type: 'message', dedupeKey: 'video-job:abc' })?.id).toBe('video')
  })

  it('files a module alert under the kind that declared its key, longest prefix first', () => {
    expect(kindOf(KINDS, { type: 'message', dedupeKey: 'shop:order:1' })?.id).toBe('shop:orders')
    expect(kindOf(KINDS, { type: 'alert', dedupeKey: 'shop:stale-refunds' })?.id).toBe('shop:everything')
  })

  it('falls back to the type, so an undeclared alert still has a switch', () => {
    expect(kindOf(KINDS, { type: 'message', dedupeKey: 'mystery:1' })?.id).toBe('message')
    expect(kindOf(KINDS, { type: 'alert', dedupeKey: null })?.id).toBe('alert')
  })

  it('gives the deployment notice no kind, so it can never be switched off', () => {
    expect(kindOf(KINDS, { type: 'deployment' })).toBeNull()
  })
})

describe('defaults', () => {
  it('match the behaviour from before the setting existed', () => {
    const d = defaultPrefs(KINDS)
    expect(Object.values(d).every((p) => p.show)).toBe(true)
    expect(d.message?.browser).toBe(true)
    expect(d.alert?.browser).toBe(true)
    expect(d.video?.browser).toBe(true)
    expect(d.core_update?.browser).toBe(false)
    expect(d.module_update?.browser).toBe(false)
    expect(d['shop:orders']?.browser).toBe(true)
  })
})

describe('resolvePrefs', () => {
  it('lays stored choices over the defaults and ignores junk', () => {
    expect(resolvePrefs(null, KINDS)).toEqual(defaultPrefs(KINDS))
    expect(resolvePrefs('nonsense', KINDS)).toEqual(defaultPrefs(KINDS))
    const r = resolvePrefs({ message: { browser: false }, core_update: { show: false }, 'shop:orders': { show: false }, bogus: { show: false } }, KINDS)
    expect(r.message).toEqual({ show: true, browser: false })
    expect(r.core_update).toEqual({ show: false, browser: false })
    expect(r['shop:orders']).toEqual({ show: false, browser: true })
    expect(r.bogus).toBeUndefined()
  })
})

describe('wantsBrowserAlert', () => {
  it('needs the kind to be shown as well as alerted', () => {
    const prefs = resolvePrefs({ message: { show: false, browser: true }, 'shop:orders': { browser: false } }, KINDS)
    expect(wantsBrowserAlert(prefs, KINDS, { type: 'message', dedupeKey: 'x' })).toBe(false)
    expect(wantsBrowserAlert(prefs, KINDS, { type: 'message', dedupeKey: 'shop:order:9' })).toBe(false)
    expect(wantsBrowserAlert(defaultPrefs(KINDS), KINDS, { type: 'message', dedupeKey: 'x' })).toBe(true)
    expect(wantsBrowserAlert(defaultPrefs(KINDS), KINDS, { type: 'module_update', dedupeKey: 'module-update:a' })).toBe(false)
    expect(wantsBrowserAlert(defaultPrefs(KINDS), KINDS, { type: 'deployment' })).toBe(false)
  })
})

describe('SavePrefsSchema', () => {
  it('wants each kind it names fully spelled out', () => {
    expect(SavePrefsSchema.safeParse(defaultPrefs(KINDS)).success).toBe(true)
    expect(SavePrefsSchema.safeParse({ message: { show: true } }).success).toBe(false)
  })
})

describe('visibleNotificationsWhere', () => {
  it('adds no clause when nothing is switched off', () => {
    expect(visibleNotificationsWhere(KINDS, defaultPrefs(KINDS))).toEqual({})
  })

  it('hides a prefix kind but keeps rows a longer prefix claims', () => {
    const prefs = resolvePrefs({ 'shop:everything': { show: false } }, KINDS)
    const where = visibleNotificationsWhere(KINDS, prefs)
    const clause = JSON.stringify(where)
    expect(clause).toContain('"startsWith":"shop:"')
    expect(clause).toContain('"startsWith":"shop:order:"')
    expect(clause).toContain('"startsWith":"shop:product-questions"')
  })

  it('hides an undeclared message by type without hiding declared ones', () => {
    const prefs = resolvePrefs({ message: { show: false } }, KINDS)
    const clause = JSON.stringify(visibleNotificationsWhere(KINDS, prefs))
    expect(clause).toContain('"type":{"not":"message"}')
    expect(clause).toContain('"startsWith":"video-job:"')
  })
})
