import { describe, expect, it } from 'vitest'
import { parseFavourites } from './favourites'

describe('parseFavourites', () => {
  it('returns null when nothing was ever saved', () => {
    expect(parseFavourites(null)).toBeNull()
    expect(parseFavourites(undefined)).toBeNull()
  })
  it('keeps an empty list distinct from never saved', () => {
    expect(parseFavourites([])).toEqual([])
  })
  it('keeps order and drops duplicates', () => {
    expect(parseFavourites(['b', 'a', 'b'])).toEqual(['b', 'a'])
  })
  it('treats malformed data as never saved', () => {
    expect(parseFavourites({ a: 1 })).toBeNull()
    expect(parseFavourites([1, 2])).toBeNull()
  })
})
