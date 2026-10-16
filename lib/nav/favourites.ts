import { z } from 'zod'

// Admin sidebar favourites: an ordered list of nav item ids, saved per person so they
// follow them across browsers and devices. Free of server imports so the sidebar (a
// client component) and the API route share one definition.

export const MAX_FAVOURITES = 200

export const SaveFavouritesSchema = z.object({
  favourites: z.array(z.string().min(1).max(200)).max(MAX_FAVOURITES),
})

/**
 * Coerce the untyped jsonb into a list of ids. null means "never saved" (the sidebar
 * then migrates the browser's own copy up); anything malformed is treated the same.
 */
export function parseFavourites(raw: unknown): string[] | null {
  const parsed = SaveFavouritesSchema.shape.favourites.safeParse(raw)
  return parsed.success ? [...new Set(parsed.data)] : null
}
