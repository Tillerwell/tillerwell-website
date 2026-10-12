import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { BELL_ARRIVED_MESSAGE_TYPE, BELL_OPEN_MESSAGE_TYPE, BELL_WORKER_SOURCE } from './worker'

// The worker runs in the browser as written, with no build step and no types,
// so it is run here the same way: in a fresh context with a stand-in `self`
// that records what it was asked to do.

type Shown = { title: string; options: Record<string, unknown> }
type FakeWindow = { url: string; focused: boolean; posted: unknown[]; focus: () => Promise<void>; postMessage: (m: unknown) => void }

function boot(windows: Array<{ url: string }> = []) {
  const listeners = new Map<string, (event: unknown) => void>()
  const shown: Shown[] = []
  const opened: string[] = []
  const clients: FakeWindow[] = windows.map((w) => {
    const client: FakeWindow = {
      url: w.url,
      focused: false,
      posted: [],
      focus: async () => { client.focused = true },
      postMessage: (m) => { client.posted.push(m) },
    }
    return client
  })
  const self = {
    location: { origin: 'https://site.example' },
    addEventListener: (type: string, fn: (event: unknown) => void) => { listeners.set(type, fn) },
    skipWaiting: () => undefined,
    registration: {
      showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({ title, options }) },
    },
    clients: {
      claim: async () => undefined,
      matchAll: async () => clients,
      openWindow: async (url: string) => { opened.push(url) },
    },
  }
  runInNewContext(BELL_WORKER_SOURCE, { self, URL, fetch: async () => new Response(null) })

  async function fire(type: string, event: Record<string, unknown>) {
    let pending: Promise<unknown> = Promise.resolve()
    listeners.get(type)!({ ...event, waitUntil: (p: Promise<unknown>) => { pending = p } })
    await pending
  }
  const push = (data: unknown) => fire('push', {
    data: data === undefined ? null : { json: () => (typeof data === 'string' ? JSON.parse(data) : data) },
  })
  const click = (href: unknown) => {
    let closed = false
    return fire('notificationclick', { notification: { data: { href }, close: () => { closed = true } } })
      .then(() => closed)
  }
  return { shown, opened, clients, push, click }
}

describe('the bell push worker', () => {
  it('shows the alert it was sent, one per bell entry, and still makes a sound on a repeat', async () => {
    const worker = boot()
    await worker.push({
      title: 'Deskwell',
      body: 'New order DW000228 - £499.00 from Ada Lovelace',
      href: '/hq/m/shop/orders/o1',
      tag: 'n1',
      icon: '/web-app-manifest-512x512.png',
    })
    expect(worker.shown).toHaveLength(1)
    const [note] = worker.shown
    expect(note!.title).toBe('Deskwell')
    expect(note!.options).toMatchObject({
      body: 'New order DW000228 - £499.00 from Ada Lovelace',
      tag: 'n1',
      renotify: true,
      icon: '/web-app-manifest-512x512.png',
      data: { href: '/hq/m/shop/orders/o1' },
    })
  })

  it('tells every open window an alert has arrived, so an open bell redraws straight away', async () => {
    const worker = boot([{ url: 'https://site.example/hq/inbox' }, { url: 'https://site.example/shop' }])
    await worker.push({ title: 'Deskwell', href: '/hq/m/shop/orders/o1' })
    expect(worker.shown).toHaveLength(1)
    expect(worker.clients.map((c) => c.posted)).toEqual([[{ type: BELL_ARRIVED_MESSAGE_TYPE }], [{ type: BELL_ARRIVED_MESSAGE_TYPE }]])
  })

  it('still shows something for a push it cannot read, because a silent push costs the permission', async () => {
    const worker = boot()
    await worker.push(undefined)
    await worker.push('"just a string"')
    expect(worker.shown.map((s) => s.title)).toEqual(['New notification', 'New notification'])
    expect(worker.shown[0]!.options.tag).toBe('cactus-bell')
  })

  it('follows nothing off this site', async () => {
    const worker = boot()
    await worker.push({ title: 'x', href: 'https://elsewhere.example/phish', icon: '//elsewhere.example/i.png' })
    await worker.push({ title: 'y', href: '/\\elsewhere.example' })
    expect(worker.shown[0]!.options.data).toEqual({ href: '/' })
    expect(worker.shown[0]!.options.icon).toBeUndefined()
    expect(worker.shown[1]!.options.data).toEqual({ href: '/' })
    expect(await worker.click('https://elsewhere.example/phish')).toBe(true)
    expect(worker.opened).toEqual(['https://site.example/'])
  })

  it('opens the alert\'s page when nothing of the admin area is open', async () => {
    const worker = boot([{ url: 'https://site.example/shop' }])
    expect(await worker.click('/hq/m/shop/orders/o1')).toBe(true)
    expect(worker.opened).toEqual(['https://site.example/hq/m/shop/orders/o1'])
    expect(worker.clients[0]!.posted).toEqual([])
  })

  it('brings forward the window already showing that page', async () => {
    const worker = boot([
      { url: 'https://site.example/hq/pages' },
      { url: 'https://site.example/hq/m/shop/orders/o1' },
    ])
    await worker.click('/hq/m/shop/orders/o1')
    expect(worker.clients[1]!.focused).toBe(true)
    expect(worker.clients[1]!.posted).toEqual([])
    expect(worker.opened).toEqual([])
  })

  it('sends an open admin window to the page rather than opening a second one', async () => {
    const worker = boot([{ url: 'https://site.example/hq/inbox?tab=unified-inbox' }])
    await worker.click('/hq/m/shop/orders/o1')
    expect(worker.clients[0]!.focused).toBe(true)
    expect(worker.clients[0]!.posted).toEqual([{ type: BELL_OPEN_MESSAGE_TYPE, href: '/hq/m/shop/orders/o1' }])
    expect(worker.opened).toEqual([])
  })
})
