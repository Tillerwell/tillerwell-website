import { headers } from 'next/headers'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermissions } from '@/lib/permissions/check'
import { prisma } from '@/lib/db/prisma'
import { getInstalledModules } from '@/lib/modules/live-status'
import { getSiteConfig } from '@/lib/config/site'
import { getModuleOverviews } from '@/lib/admin/dashboard-modules'
import { moduleExtensionPointComponents } from '@/lib/modules/extension-points'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — Admin' }

type ExtensionPointEntry = { point: string; id: string; permission?: string }

export default async function AdminDashboard() {
  const headersList = await headers()
  const adminPath = headersList.get('x-cactus-admin-path') ?? ''

  // Modules can contribute their own dashboard summary widget here (e.g.
  // Boards' thread/post/queue counts) via the generic "core.admin-dashboard-widgets"
  // extension point, permission-filtered live from Module.manifest - the
  // dashboard knows the point name only, never any module name.
  const [user, config, widgetModules, overviews] = await Promise.all([
    getSessionFromCookie(),
    getSiteConfig(),
    getInstalledModules(),
    getModuleOverviews(),
  ])

  const widgetEntries: ExtensionPointEntry[] = []
  for (const mod of widgetModules) {
    const manifest = mod.manifest as { extensionPoints?: ExtensionPointEntry[] } | null
    if (!manifest?.extensionPoints) continue
    for (const entry of manifest.extensionPoints) {
      if (entry.point === 'core.admin-dashboard-widgets') widgetEntries.push(entry)
    }
  }

  // Every permission this page needs - the members stat bar plus one per widget -
  // resolved in a single batch query rather than a round-trip apiece.
  const permissionKeys = [
    ...new Set([
      'members.list',
      ...widgetEntries.map((e) => e.permission).filter((p): p is string => !!p),
      ...overviews.map((o) => o.linkPermission).filter((p): p is string => !!p),
    ]),
  ]
  const permissions = user ? await hasPermissions(user, permissionKeys) : {}

  const widgetIds = user
    ? widgetEntries.filter((e) => !e.permission || permissions[e.permission]).map((e) => e.id)
    : []
  const widgetComponents = moduleExtensionPointComponents['core.admin-dashboard-widgets'] ?? {}

  const canViewMembers = permissions['members.list'] === true

  const [pageCount, userCount, mediaCount, memberCounts] = await Promise.all([
    prisma.infoPage.count(),
    prisma.user.count(),
    prisma.media.count(),
    canViewMembers
      ? Promise.all([
          prisma.member.count(),
          prisma.member.count({ where: { status: 'ACTIVE' } }),
          prisma.member.count({ where: { status: 'PENDING_APPROVAL' } }),
          prisma.member.count({ where: { status: 'PENDING_VERIFICATION' } }),
          prisma.member.count({ where: { status: 'SUSPENDED' } }),
          prisma.member.count({ where: { deletionScheduledAt: { not: null } } }),
        ])
      : Promise.resolve(null),
  ])

  const statusLabel = config?.status === 'live' ? 'Live' : config?.status === 'comingSoon' ? 'Coming soon' : 'Maintenance'
  const statusTone = config?.status === 'live' ? 'green' : config?.status === 'comingSoon' ? 'yellow' : 'red'

  const stats: Array<{ label: string; value: number; tone?: 'warn' }> = [
    { label: 'Pages', value: pageCount },
    { label: 'Media files', value: mediaCount },
    { label: 'Admin users', value: userCount },
  ]
  const memberStats = memberCounts
    ? [
        { label: 'Members', value: memberCounts[0] },
        { label: 'Active', value: memberCounts[1] },
        { label: 'Awaiting approval', value: memberCounts[2], tone: memberCounts[2] > 0 ? ('warn' as const) : undefined },
        { label: 'Unverified', value: memberCounts[3], tone: memberCounts[3] > 0 ? ('warn' as const) : undefined },
        { label: 'Suspended', value: memberCounts[4] },
        { label: 'Leaving', value: memberCounts[5] },
      ]
    : []

  return (
    <div className="dash">
      <header className="dash-hero">
        <div>
          <p className="dash-eyebrow">{config?.siteName ?? 'Your site'}</p>
          <h1 className="dash-title">Welcome back, {user?.username}</h1>
          <p className="dash-sub">
            {user?.role.name} &middot; {overviews.length} {overviews.length === 1 ? 'module' : 'modules'} installed
          </p>
        </div>
        <a href={`/${adminPath}/config?tab=general`} className={`badge badge-${statusTone}`} style={{ textDecoration: 'none' }}>
          Site status: {statusLabel}
        </a>
      </header>

      <section aria-label="Site at a glance" className="dash-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="dash-stat">
            <div className="dash-stat-value">{stat.value.toLocaleString('en-GB')}</div>
            <div className="dash-stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      {memberStats.length > 0 && (
        <section aria-label="Members" className="dash-section">
          <h2 className="dash-heading">Members</h2>
          <div className="dash-stats dash-stats-compact">
            {memberStats.map((stat) => (
              <div key={stat.label} className={`dash-stat${stat.tone === 'warn' ? ' dash-stat-warn' : ''}`}>
                <div className="dash-stat-value">{stat.value.toLocaleString('en-GB')}</div>
                <div className="dash-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {widgetIds.length > 0 && (
        <section aria-label="Live summaries" className="dash-section">
          <h2 className="dash-heading">Live summaries</h2>
          <div className="dash-widgets">
            {widgetIds.map((id) => {
              const Widget = widgetComponents[id]
              return Widget ? <Widget key={id} /> : null
            })}
          </div>
        </section>
      )}

      {overviews.length > 0 && (
        <section aria-label="Modules" className="dash-section">
          <h2 className="dash-heading">Modules</h2>
          <div className="dash-modules">
            {overviews.map((m) => {
              const canOpen = !!m.linkPath && (!m.linkPermission || permissions[m.linkPermission] === true)
              const body = (
                <>
                  <div className="dash-mod-top">
                    <span className="dash-mod-icon" aria-hidden="true">
                      {m.icon ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: m.icon }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 3 7.5 12 12l9-4.5z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></svg>
                      )}
                    </span>
                    <span className={`dash-mod-status dash-mod-status-${m.status}`}>
                      {m.status === 'ok' ? 'Active' : m.status === 'update' ? 'Update ready' : 'Updating'}
                    </span>
                  </div>
                  <h3 className="dash-mod-title">{m.title}</h3>
                  {m.description && <p className="dash-mod-desc">{m.description}</p>}
                  <dl className="dash-mod-meta">
                    <div><dt>Version</dt><dd>{m.version}{m.updateTo ? ` \u2192 ${m.updateTo}` : ''}</dd></div>
                    {m.rowEstimate > 0 && <div><dt>Records</dt><dd>~{m.rowEstimate.toLocaleString('en-GB')}</dd></div>}
                    {m.tableCount > 0 && <div><dt>Tables</dt><dd>{m.tableCount}</dd></div>}
                  </dl>
                </>
              )
              return canOpen ? (
                <a key={m.name} href={`/${adminPath}${m.linkPath}`} className="dash-mod dash-mod-link">{body}</a>
              ) : (
                <div key={m.name} className="dash-mod">{body}</div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
