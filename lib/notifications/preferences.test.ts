import { describe, expect, it } from 'vitest'
import { categoryOf, defaultPrefs, resolvePrefs, SavePrefsSchema, wantsBrowserAlert } from './preferences'

describe('categoryOf', () => {
  it('files a video job under video even though it rides the message type', () => {
    expect(categoryOf({ type: 'message', dedupeKey: 'video-job:abc' })).toBe('video')
    expect(categoryOf({ type: 'message', dedupeKey: 'shop:order:1' })).toBe('message')
  })

  it('gives the deployment notice no category, so it can never be switched off', () => {
    expect(categoryOf({ type: 'deployment' })).toBeNull()
  })
})

describe('defaults', () => {
  it('match the behaviour from before the setting existed', () => {
    const d = defaultPrefs()
    expect(Object.values(d).every((p) => p.show)).toBe(true)
    expect(d.message.browser).toBe(true)
    expect(d.alert.browser).toBe(true)
    expect(d.video.browser).toBe(true)
    expect(d.core_update.browser).toBe(false)
    expect(d.module_update.browser).toBe(false)
  })
})

describe('resolvePrefs', () => {
  it('lays stored choices over the defaults and ignores junk', () => {
    expect(resolvePrefs(null)).toEqual(defaultPrefs())
    expect(resolvePrefs('nonsense')).toEqual(defaultPrefs())
    const r = resolvePrefs({ message: { browser: false }, core_update: { show: false }, bogus: { show: false } })
    expect(r.message).toEqual({ show: true, browser: false })
    expect(r.core_update).toEqual({ show: false, browser: false })
  })
})

describe('wantsBrowserAlert', () => {
  it('needs the kind to be shown as well as alerted', () => {
    const prefs = resolvePrefs({ message: { show: false, browser: true } })
    expect(wantsBrowserAlert(prefs, { type: 'message', dedupeKey: 'x' })).toBe(false)
    expect(wantsBrowserAlert(defaultPrefs(), { type: 'message', dedupeKey: 'x' })).toBe(true)
    expect(wantsBrowserAlert(defaultPrefs(), { type: 'module_update' })).toBe(false)
    expect(wantsBrowserAlert(defaultPrefs(), { type: 'deployment' })).toBe(false)
  })
})

describe('SavePrefsSchema', () => {
  it('wants every category, fully spelled out', () => {
    expect(SavePrefsSchema.safeParse(defaultPrefs()).success).toBe(true)
    expect(SavePrefsSchema.safeParse({ message: { show: true, browser: true } }).success).toBe(false)
  })
})
