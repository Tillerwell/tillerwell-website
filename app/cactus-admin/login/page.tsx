import { resolveBranding } from '@/lib/config/branding'
import { prisma } from '@/lib/db/prisma'
import { parseAdminMenuConfig } from '@/lib/nav/admin-menu'
import { buildAdminThemeStyles, buildFontHref } from '@/lib/design/tokens'
import LoginForm from './LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in — Admin' }

export default async function LoginPage() {
  // Both reads are best-effort. This is the page every locked-out session lands on,
  // including the one SessionExpiryWatcher sends an idle tab to after 24 hours - i.e.
  // often the first request a cold instance serves. Losing the site's colours is a
  // cosmetic disappointment; a 500 in place of the sign-in form is a locked door, so
  // neither query is allowed to take the page down. resolveBranding already defends
  // itself the same way.
  const [branding, config] = await Promise.all([
    resolveBranding(),
    prisma.siteConfig
      .findUnique({ where: { id: 'singleton' }, select: { designTokens: true, adminMenuConfig: true, logoMediaId: true, logoDarkMediaId: true } })
      .catch(() => null),
  ])

  // Login page is excluded from AdminLayout's shell (see app/cactus-admin/layout.tsx),
  // so it must inject the same site-brand theme itself to match the rest of admin.
  // Optional: the site logo pair (Appearance > Styles) in place of the favicon. Best-effort
  // like everything above - a failed lookup just leaves the favicon showing.
  const logoIds = parseAdminMenuConfig(config?.adminMenuConfig).useSiteLogoOnLogin === true && config?.logoMediaId
    ? [config.logoMediaId, config.logoDarkMediaId].filter((v): v is string => !!v)
    : []
  const logoRows = logoIds.length > 0
    ? await prisma.media.findMany({ where: { id: { in: logoIds } }, select: { id: true, url: true } }).catch(() => [])
    : []
  const logoUrl = logoRows.find((r) => r.id === config?.logoMediaId)?.url ?? null
  const logoDarkUrl = logoRows.find((r) => r.id === config?.logoDarkMediaId)?.url ?? null

  const adminThemeStyles = buildAdminThemeStyles(config?.designTokens)
  const fontHref = buildFontHref(config?.designTokens)

  return (
    <>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {adminThemeStyles && <style dangerouslySetInnerHTML={{ __html: adminThemeStyles }} />}
      <LoginForm
        siteName={branding.name}
        faviconUrl={branding.faviconUrl}
        faviconDarkUrl={branding.faviconDarkUrl}
        logoUrl={logoUrl}
        logoDarkUrl={logoDarkUrl}
      />
    </>
  )
}
