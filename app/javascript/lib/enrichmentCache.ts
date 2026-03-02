import type { Movie, Section } from './types'

export const ENRICHMENT_FIELDS: (keyof Movie)[] = [
  'summary',
  'content_rating',
  'genres',
  'directors',
  'writers',
  'studio',
  'tagline',
  'critic_rating',
  'audience_rating',
  'sort_title',
  'edition',
  'originally_available',
  'country',
  'producers',
  'collections',
  'labels',
]

const VERSION = 1

function cacheKey(serverId: number) {
  return `pladi_enrichment_v${VERSION}_${serverId}`
}

type EnrichmentData = Record<string, Partial<Movie>>

export function saveEnrichmentCache(serverId: number, sections: Section[]): void {
  try {
    const data: EnrichmentData = {}
    for (const section of sections) {
      for (const movie of section.movies) {
        const enriched: Partial<Movie> = {}
        for (const field of ENRICHMENT_FIELDS) {
          enriched[field] = movie[field] as never
        }
        data[movie.id] = enriched
      }
    }
    localStorage.setItem(cacheKey(serverId), JSON.stringify(data))
  } catch {
    // localStorage quota exceeded or unavailable; silently ignore
  }
}

export function mergeEnrichmentCache(serverId: number, sections: Section[]): Section[] {
  try {
    const raw = localStorage.getItem(cacheKey(serverId))
    if (!raw) return sections
    const data: EnrichmentData = JSON.parse(raw)
    return sections.map((section) => ({
      ...section,
      movies: section.movies.map((movie) => {
        const cached = data[movie.id]
        return cached ? { ...movie, ...cached } : movie
      }),
    }))
  } catch {
    return sections
  }
}

export function savePosterReadyCache(serverId: number, ids: string[]): void {
  try {
    localStorage.setItem(`pladi_poster_ready_v${VERSION}_${serverId}`, JSON.stringify(ids))
  } catch {
    // localStorage quota exceeded or unavailable; silently ignore
  }
}

export function loadPosterReadyCache(serverId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`pladi_poster_ready_v${VERSION}_${serverId}`)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function saveBackgroundReadyCache(serverId: number, ids: string[]): void {
  try {
    localStorage.setItem(`pladi_background_ready_v${VERSION}_${serverId}`, JSON.stringify(ids))
  } catch {
    // localStorage quota exceeded or unavailable; silently ignore
  }
}

export function loadBackgroundReadyCache(serverId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`pladi_background_ready_v${VERSION}_${serverId}`)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function updateEnrichmentCacheMovie(serverId: number, movieId: string, patch: Partial<Movie>): void {
  try {
    const key = cacheKey(serverId)
    const raw = localStorage.getItem(key)
    const data: EnrichmentData = raw ? (JSON.parse(raw) as EnrichmentData) : {}
    const enrichedPatch: Partial<Movie> = {}
    for (const field of ENRICHMENT_FIELDS) {
      if (field in patch) {
        enrichedPatch[field] = patch[field] as never
      }
    }
    if (Object.keys(enrichedPatch).length > 0) {
      data[movieId] = { ...data[movieId], ...enrichedPatch }
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch {
    // localStorage quota exceeded or unavailable; silently ignore
  }
}
