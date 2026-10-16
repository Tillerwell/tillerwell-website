import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { SaveFavouritesSchema } from '@/lib/nav/favourites'

// The signed-in admin's own sidebar favourites. Personal and cosmetic, so any
// signed-in admin may save theirs; it always writes the caller's own row. Which
// links they can actually see is still decided by the server-built menu.

export async function PUT(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const parsed = SaveFavouritesSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const favourites = [...new Set(parsed.data.favourites)]
  await prisma.user.update({ where: { id: user.id }, data: { sidebarFavourites: favourites } })
  return NextResponse.json({ ok: true, favourites })
}
