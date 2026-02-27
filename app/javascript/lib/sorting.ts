import type { Movie, SortKey, SortDir } from '@/lib/types'

export function sortMovies(movies: Movie[], key: SortKey, dir: SortDir): Movie[] {
  return [...movies].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    let cmp: number
    if (av == null && bv == null) cmp = 0
    else if (av == null) cmp = 1
    else if (bv == null) cmp = -1
    else if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
    else cmp = (av as number) - (bv as number)
    return dir === 'asc' ? cmp : -cmp
  })
}
