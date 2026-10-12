// ---------------------------------------------------------------------------
// The service worker that shows a bell alert when the site pushes one.
//
// A string served by a route (app/api/admin/push/worker) rather than a file in
// /public, so it lives at an address of its own and its scope is that
// address's folder. A worker never needs to control the page that registered
// it to receive a push - it only has to exist - so it is registered well away
// from the admin area and takes over none of it, and it cannot collide with the
// unified-inbox module's own worker for new mail, which sits in another folder.
//
// Plain ES5-ish JavaScript, no build step: it runs in the browser exactly as
// written here. Kept deliberately small, because a broken worker is one the
// browser keeps running until it next checks for an update. Tested by running
// it in a stand-in worker - see worker.test.ts.
//
// Every push shows a notification, without exception. Safari withdraws the
// permission from a site that receives pushes and shows nothing, and Chrome
// puts up a "this site has been updated in the background" of its own.
// ---------------------------------------------------------------------------

/** Where the page finds it. The folder is the worker's scope. */
export const BELL_WORKER_PATH = '/api/admin/push/worker'

/** Where a browser's subscription is kept, told about, and withdrawn. */
export const BELL_SUBSCRIPTION_PATH = '/api/admin/push/subscription'

/** What the worker posts to an open admin window asking it to go to an alert's
 *  page, and what the bell listens for. */
export const BELL_OPEN_MESSAGE_TYPE = 'cactus-bell-open'

/** What the worker posts to every open window when an alert lands, so an open
 *  bell redraws its badge now rather than on its own next round. */
export const BELL_ARRIVED_MESSAGE_TYPE = 'cactus-bell-arrived'

export const BELL_WORKER_SOURCE = `'use strict'
// Cactus: bell alerts. Served by the site (lib/push/worker.ts).

self.addEventListener('install', function () { self.skipWaiting() })
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()) })

// Only addresses on this site, and only paths: a payload is sealed to this
// browser, but a worker that would follow one anywhere is a worker waiting for
// the day something else gets written into it.
function localPath(value) {
  return typeof value === 'string' && value.charAt(0) === '/' && value.charAt(1) !== '/' && value.charAt(1) !== '\\\\'
}

function readAlert(event) {
  var data = null
  try { data = event.data ? event.data.json() : null } catch (e) { data = null }
  if (!data || typeof data !== 'object') data = {}
  return {
    title: typeof data.title === 'string' && data.title ? data.title : 'New notification',
    body: typeof data.body === 'string' ? data.body : '',
    href: localPath(data.href) ? data.href : '/',
    tag: typeof data.tag === 'string' && data.tag ? data.tag : 'cactus-bell',
    icon: localPath(data.icon) ? data.icon : undefined
  }
}

// Best effort: a window that misses it still catches up on its next round, so
// a failure here must never stand between the push and its notification.
function tellOpenWindows() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
    for (var i = 0; i < windows.length; i++) {
      try { windows[i].postMessage({ type: '${BELL_ARRIVED_MESSAGE_TYPE}' }) } catch (e) {}
    }
  }).catch(function () {})
}

self.addEventListener('push', function (event) {
  var alert = readAlert(event)
  event.waitUntil(Promise.all([
    self.registration.showNotification(alert.title, {
      body: alert.body,
      // One per bell entry, and an entry coming back still makes a sound:
      // without renotify a notification that replaces another arrives silently.
      tag: alert.tag,
      renotify: true,
      icon: alert.icon,
      data: { href: alert.href }
    }),
    tellOpenWindows()
  ]))
})

// The first folder of a path - the admin area's own address, on every link the
// site pushes.
function area(pathname) {
  return pathname.split('/')[1] || ''
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var href = event.notification.data && localPath(event.notification.data.href) ? event.notification.data.href : '/'
  var target = new URL(href, self.location.origin)
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
    var i
    // The page already open somewhere: bring that one forward.
    for (i = 0; i < windows.length; i++) {
      if (windows[i].url === target.href && 'focus' in windows[i]) return windows[i].focus()
    }
    // The admin area open on some other page: bring it forward and ask it to
    // go there, rather than opening a second copy of it.
    for (i = 0; i < windows.length; i++) {
      var here = new URL(windows[i].url)
      if (here.origin === target.origin && area(here.pathname) === area(target.pathname) && 'focus' in windows[i]) {
        windows[i].postMessage({ type: '${BELL_OPEN_MESSAGE_TYPE}', href: target.pathname + target.search })
        return windows[i].focus()
      }
    }
    return self.clients.openWindow(target.href)
  }))
})

// The push service replaced this browser's subscription, which Firefox does now
// and then. Take the new one out on the same key and tell the site, so alerts
// keep coming without anybody pressing the bell again.
self.addEventListener('pushsubscriptionchange', function (event) {
  var old = event.oldSubscription
  var key = old && old.options && old.options.applicationServerKey
  if (!key) return
  event.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    .then(function (fresh) {
      return fetch('${BELL_SUBSCRIPTION_PATH}', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fresh.toJSON())
      })
    })
    .catch(function () {}))
})
`
