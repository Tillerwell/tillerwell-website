import { z } from 'zod'
import { getInstalledManifests } from '@/lib/modules/live-status'
import { CORE_NOTIFICATION_KINDS, type NotificationKind } from './preferences'

// Core's own kinds plus whatever each installed module declares in its manifest
// (`notificationKinds`). Pure data read live, like memberExtensions - no codegen,
// nothing for a module to import.
//
// A manifest comes straight out of the database, so each entry is checked here
// and a bad one is skipped rather than allowed to take the bell down.

const DeclarationSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  description: z.string().default(''),
  dedupePrefix: z.string().min(1),
  browserDefault: z.boolean().default(true),
})

function titleCase(name: string): string {
  return name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function getNotificationKinds(): Promise<NotificationKind[]> {
  const manifests = await getInstalledManifests().catch(() => [])
  const modules: NotificationKind[] = []
  for (const { manifest } of manifests) {
    const m = manifest as { name?: unknown; navGroupLabel?: unknown; notificationKinds?: unknown } | null
    if (!m || typeof m.name !== 'string' || !Array.isArray(m.notificationKinds)) continue
    const groupLabel = typeof m.navGroupLabel === 'string' && m.navGroupLabel ? m.navGroupLabel : titleCase(m.name)
    for (const raw of m.notificationKinds) {
      const parsed = DeclarationSchema.safeParse(raw)
      if (!parsed.success) continue
      const d = parsed.data
      modules.push({
        id: `${m.name}:${d.id}`,
        label: d.label,
        description: d.description,
        group: m.name,
        groupLabel,
        dedupePrefix: d.dedupePrefix,
        browserDefault: d.browserDefault,
      })
    }
  }
  modules.sort((a, b) => (a.groupLabel ?? '').localeCompare(b.groupLabel ?? '') || a.label.localeCompare(b.label))
  return [...CORE_NOTIFICATION_KINDS, ...modules]
}
