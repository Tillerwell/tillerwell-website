// The kinds of bell entry worth interrupting somebody for: messages (a new
// order, a question, a finished video) and warnings. Update notices and the
// "changes waiting to go live" entry stay in the bell - nobody needs their
// phone to buzz because a module has a new version.
//
// A file of its own with nothing server-side in it, because both roads read
// it: the push sent from the server (lib/notifications/alerts.ts) and the
// in-tab popup an open admin tab shows (components/admin/NotificationBell.tsx).
export function isPushworthy(type: string): boolean {
  return type === 'message' || type === 'alert'
}
