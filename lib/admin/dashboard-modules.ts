import { prisma } from '@/lib/db/prisma'
import { INSTALLED_MODULE_WHERE } from '@/lib/modules/live-status'
import { sanitizeSvgFragment } from '@/lib/sanitize'

// Generic "overview" row per installed module for the admin dashboard. Built only
// from what every module already declares (manifest + table prefix), so the
// dashboard never names a module.

type ManifestShape = {
  description?: string
  navEntries?: Array<{ label: string; path: string; icon?: string; permission?: string }>
}

export type ModuleOverview = {
  name: string
  title: string
  description: string
  version: string
  status: 'ok' | 'update' | 'busy'
  /** Newer tag available, when status is 'update'. */
  updateTo: string | null
  /** Permission gating the link; null when the module has no admin page. */
  linkPermission: string | null
  linkPath: string | null
  icon: string | null
  tableCount: number
  /** Planner row estimate across the module's tables (pg_stat, not an exact count). */
  rowEstimate: number
}

function titleCase(name: string): string {
  return name
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function firstSentence(text: string): string {
  const trimmed = text.trim()
  const end = trimmed.search(/[.!?](\s|$)/)
  const sentence = end === -1 ? trimmed : trimmed.slice(0, end + 1)
  return sentence.length > 140 ? `${sentence.slice(0, 137).trimEnd()}...` : sentence
}

export async function getModuleOverviews(): Promise<ModuleOverview[]> {
  const [modules, stats] = await Promise.all([
    prisma.module.findMany({
      where: INSTALLED_MODULE_WHERE,
      select: { name: true, version: true, status: true, tablePrefix: true, updateAvailable: true, manifest: true },
      orderBy: { name: 'asc' },
    }),
    prisma.$queryRaw<Array<{ relname: string; n: bigint }>>`
      SELECT relname, GREATEST(n_live_tup, 0)::bigint AS n FROM pg_stat_user_tables
    `.catch(() => [] as Array<{ relname: string; n: bigint }>),
  ])

  return modules.map((m) => {
    const manifest = m.manifest as ManifestShape | null
    const nav = manifest?.navEntries?.[0]
    const tables = stats.filter((s) => s.relname.startsWith(m.tablePrefix))
    return {
      name: m.name,
      title: nav?.label ?? titleCase(m.name),
      description: firstSentence(manifest?.description ?? ''),
      version: m.version.replace(/^v/, ''),
      status:
        m.status === 'update_available' ? 'update' : m.status === 'active' ? 'ok' : 'busy',
      updateTo: m.updateAvailable ? m.updateAvailable.replace(/^v/, '') : null,
      linkPermission: nav?.permission ?? null,
      linkPath: nav?.path ?? null,
      icon: nav?.icon ? sanitizeSvgFragment(nav.icon) : null,
      tableCount: tables.length,
      rowEstimate: tables.reduce((sum, t) => sum + Number(t.n), 0),
    }
  })
}
