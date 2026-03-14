import {
  loadIndexedDbEnrichmentRecords,
  saveIndexedDbEnrichmentRecords,
  updateIndexedDbMovieRecords,
  type EnrichmentScope,
} from './enrichmentIndexedDb'
import type { Movie, Section } from './types'

type ShowsViewMode = 'shows' | 'episodes'
const VERSION = 1
const LEGACY_SHOW_CACHE_PREFIX = `pladi_show_enrichment_v${VERSION}_`

export const ENRICHMENT_FIELDS: (keyof Movie)[] = [
  'summary',
  'content_rating',
  'genres',
  'directors',
  'writers',
  'studio',
  'tagline',
  'imdb_rating',
  'rt_critics_rating',
  'rt_audience_rating',
  'tmdb_rating',
  'sort_title',
  'edition',
  'originally_available',
  'country',
  'producers',
  'collections',
  'labels',
  'subtitles',
  'audio_tracks',
  'audio_language',
  'audio_bitrate',
  'video_bitrate',
]

export const SHOW_ENRICHMENT_FIELDS: (keyof Movie)[] = [
  'summary',
  'content_rating',
  'directors',
  'genres',
  'writers',
  'studio',
  'tagline',
  'imdb_rating',
  'rt_critics_rating',
  'rt_audience_rating',
  'tmdb_rating',
  'sort_title',
  'originally_available',
  'country',
  'producers',
  'collections',
  'labels',
  'subtitles',
  'audio_tracks',
  'audio_language',
  'audio_bitrate',
  'video_bitrate',
]

export const EPISODE_ENRICHMENT_FIELDS: (keyof Movie)[] = [
  'directors',
  'writers',
  'producers',
  'imdb_rating',
  'rt_critics_rating',
  'rt_audience_rating',
  'tmdb_rating',
  'subtitles',
  'audio_tracks',
  'audio_language',
  'audio_bitrate',
  'video_bitrate',
]

type EnrichmentData = Record<string, Partial<Movie>>

function cacheKey(serverId: number) {
  return `pladi_enrichment_v${VERSION}_${serverId}`
}

function showCacheKey(serverId: number, viewMode: ShowsViewMode = 'shows') {
  return `pladi_show_enrichment_v${VERSION}_${viewMode}_${serverId}`
}

function rowCacheKey(row: Pick<Movie, 'id' | 'file_path'>) {
  return `${row.id}|${hashString(row.file_path ?? '')}`
}

function legacyRowCacheKey(row: Pick<Movie, 'id' | 'file_path'>) {
  return `${row.id}|${row.file_path ?? ''}`
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function cleanupLegacyShowCache(serverId: number) {
  try {
    const legacyKey = `${LEGACY_SHOW_CACHE_PREFIX}${serverId}`
    if (localStorage.getItem(legacyKey) != null) localStorage.removeItem(legacyKey)
  } catch {
    // storage unavailable
  }
}

function removeStorageKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // storage unavailable
  }
}

function persistWithEviction({
  storageKey,
  serialized,
  evictionKeys,
}: {
  storageKey: string
  serialized: string
  evictionKeys: string[]
}) {
  try {
    localStorage.setItem(storageKey, serialized)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.toLowerCase().includes('quota')) throw error
  }

  for (const key of evictionKeys) {
    if (key === storageKey) continue
    removeStorageKey(key)
    try {
      localStorage.setItem(storageKey, serialized)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.toLowerCase().includes('quota')) throw error
    }
  }

  return false
}

function buildCachedFields(row: Movie, fields: (keyof Movie)[]): Partial<Movie> {
  const cached: Partial<Movie> = {}
  for (const field of fields) {
    const value = row[field]
    if (value !== null && value !== undefined && value !== '') cached[field] = value as never
  }
  return cached
}

function mergeCachedFields(movie: Movie, cached: Partial<Movie> | undefined, fields: (keyof Movie)[]): Movie {
  if (!cached) return movie
  const merged = { ...movie }
  for (const field of fields) {
    if (field in cached) merged[field] = cached[field] as never
  }
  return merged
}

function cachedRow(data: EnrichmentData, row: Pick<Movie, 'id' | 'file_path'>) {
  return data[rowCacheKey(row)] ?? data[legacyRowCacheKey(row)] ?? data[row.id]
}

function diffCachedFields(current: Movie, previous: Movie | undefined, fields: (keyof Movie)[]): Partial<Movie> {
  if (!previous) return buildCachedFields(current, fields)

  const cached: Partial<Movie> = {}
  for (const field of fields) {
    if (current[field] === previous[field]) continue
    cached[field] = current[field] as never
  }
  return cached
}

function previousRowsByKey(sections?: Section[]) {
  const previousByRow = new Map<string, Movie>()
  for (const section of sections ?? []) {
    for (const row of section.items) previousByRow.set(rowCacheKey(row), row)
  }
  return previousByRow
}

function showEnrichmentFields(viewMode: ShowsViewMode) {
  return viewMode === 'episodes' ? EPISODE_ENRICHMENT_FIELDS : SHOW_ENRICHMENT_FIELDS
}

function scopeForViewMode(viewMode: ShowsViewMode): EnrichmentScope {
  return viewMode === 'episodes' ? 'episodes' : 'shows'
}

function showCacheEvictionKeys(serverId: number, viewMode: ShowsViewMode, storageKey: string) {
  return [
    `${LEGACY_SHOW_CACHE_PREFIX}${serverId}`,
    showCacheKey(serverId, viewMode === 'episodes' ? 'shows' : 'episodes'),
    cacheKey(serverId),
    `pladi_poster_ready_v${VERSION}_${serverId}`,
    `pladi_background_ready_v${VERSION}_${serverId}`,
    storageKey,
  ]
}

function movieCacheEvictionKeys(serverId: number, storageKey: string) {
  return [
    `${LEGACY_SHOW_CACHE_PREFIX}${serverId}`,
    showCacheKey(serverId, 'shows'),
    showCacheKey(serverId, 'episodes'),
    `pladi_poster_ready_v${VERSION}_${serverId}`,
    `pladi_background_ready_v${VERSION}_${serverId}`,
    storageKey,
  ]
}

export function saveEnrichmentCache(serverId: number, sections: Section[]): void {
  void saveEnrichmentCacheDelta(serverId, sections)
}

export async function saveEnrichmentCacheDelta(serverId: number, sections: Section[], previousSections?: Section[]): Promise<void> {
  const previousByRow = previousRowsByKey(previousSections)
  const indexedDbEntries = sections.flatMap((section) =>
    section.items.flatMap((movie) => {
      const rowKey = rowCacheKey(movie)
      const diff = diffCachedFields(movie, previousByRow.get(rowKey), ENRICHMENT_FIELDS)
      if (Object.keys(diff).length === 0) return []
      const fullData = buildCachedFields(movie, ENRICHMENT_FIELDS)
      return Object.keys(fullData).length > 0
        ? [{ library: section.title, movieId: movie.id, rowKey, data: fullData }]
        : []
    })
  )

  if (indexedDbEntries.length > 0) {
    const persisted = await saveIndexedDbEnrichmentRecords(serverId, 'movies', indexedDbEntries)
    if (persisted) return
  }

  try {
    cleanupLegacyShowCache(serverId)
    const storageKey = cacheKey(serverId)
    const raw = localStorage.getItem(storageKey)
    const data: EnrichmentData = raw ? JSON.parse(raw) as EnrichmentData : {}
    for (const section of sections) {
      for (const movie of section.items) {
        const rowKey = rowCacheKey(movie)
        const enriched = diffCachedFields(movie, previousByRow.get(rowKey), ENRICHMENT_FIELDS)
        if (Object.keys(enriched).length === 0) continue
        data[rowKey] = { ...(data[rowKey] ?? {}), ...enriched }
      }
    }
    const serialized = JSON.stringify(data)
    if (!persistWithEviction({ storageKey, serialized, evictionKeys: movieCacheEvictionKeys(serverId, storageKey) })) {
      throw new Error('The quota has been exceeded.')
    }
  } catch {
    // localStorage fallback unavailable
  }
}

export async function mergeEnrichmentCache(serverId: number, sections: Section[]): Promise<Section[]> {
  const indexedDbRecords = await loadIndexedDbEnrichmentRecords(serverId, 'movies', sections.map((section) => section.title))
  if (indexedDbRecords) {
    return sections.map((section) => ({
      ...section,
      items: section.items.map((movie) => {
        const cached = indexedDbRecords.get(section.title)?.[rowCacheKey(movie)]
        return mergeCachedFields(movie, cached, ENRICHMENT_FIELDS)
      }),
    }))
  }

  try {
    const raw = localStorage.getItem(cacheKey(serverId))
    if (!raw) return sections
    const data: EnrichmentData = JSON.parse(raw)
    return sections.map((section) => ({
      ...section,
      items: section.items.map((movie) => mergeCachedFields(movie, cachedRow(data, movie), ENRICHMENT_FIELDS)),
    }))
  } catch {
    return sections
  }
}

export function saveShowEnrichmentCache(serverId: number, sections: Section[], viewMode: ShowsViewMode = 'shows'): void {
  void saveShowEnrichmentCacheDelta(serverId, sections, undefined, viewMode)
}

export async function saveShowEnrichmentCacheDelta(
  serverId: number,
  sections: Section[],
  previousSections?: Section[],
  viewMode: ShowsViewMode = 'shows'
): Promise<void> {
  cleanupLegacyShowCache(serverId)
  const storageKey = showCacheKey(serverId, viewMode)
  const fields = showEnrichmentFields(viewMode)
  const previousByRow = previousRowsByKey(previousSections)
  const indexedDbEntries = sections.flatMap((section) =>
    section.items.flatMap((show) => {
      const rowKey = rowCacheKey(show)
      const diff = diffCachedFields(show, previousByRow.get(rowKey), fields)
      if (Object.keys(diff).length === 0) return []
      const fullData = buildCachedFields(show, fields)
      return Object.keys(fullData).length > 0
        ? [{ library: section.title, movieId: show.id, rowKey, data: fullData }]
        : []
    })
  )

  if (indexedDbEntries.length > 0) {
    try {
      const persisted = await saveIndexedDbEnrichmentRecords(serverId, scopeForViewMode(viewMode), indexedDbEntries)
      if (persisted) return
    } catch {
      // fall through to localStorage fallback
    }
  }

  try {
    const raw = localStorage.getItem(storageKey)
    const data: EnrichmentData = raw ? JSON.parse(raw) as EnrichmentData : {}
    for (const section of sections) {
      for (const show of section.items) {
        const rowKey = rowCacheKey(show)
        const enriched = diffCachedFields(show, previousByRow.get(rowKey), fields)
        if (Object.keys(enriched).length === 0) continue
        data[rowKey] = { ...(data[rowKey] ?? {}), ...enriched }
      }
    }
    const serialized = JSON.stringify(data)
    if (!persistWithEviction({ storageKey, serialized, evictionKeys: showCacheEvictionKeys(serverId, viewMode, storageKey) })) {
      throw new Error('The quota has been exceeded.')
    }
  } catch {
    // storage fallback unavailable
  }
}

export async function mergeShowEnrichmentCache(serverId: number, sections: Section[], viewMode: ShowsViewMode = 'shows'): Promise<Section[]> {
  cleanupLegacyShowCache(serverId)
  const indexedDbRecords = await loadIndexedDbEnrichmentRecords(serverId, scopeForViewMode(viewMode), sections.map((section) => section.title))
  if (indexedDbRecords) {
    return sections.map((section) => ({
      ...section,
      items: section.items.map((show) => {
        const cached = indexedDbRecords.get(section.title)?.[rowCacheKey(show)]
        return mergeCachedFields(show, cached, showEnrichmentFields(viewMode))
      }),
    }))
  }

  try {
    const storageKey = showCacheKey(serverId, viewMode)
    const raw = localStorage.getItem(storageKey)
    if (!raw) return sections
    const data: EnrichmentData = JSON.parse(raw)
    return sections.map((section) => ({
      ...section,
      items: section.items.map((show) => {
        const cached = cachedRow(data, show)
        return mergeCachedFields(show, cached, showEnrichmentFields(viewMode))
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
    // storage unavailable
  }
}

export function loadPosterReadyCache(serverId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`pladi_poster_ready_v${VERSION}_${serverId}`)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function saveBackgroundReadyCache(serverId: number, ids: string[]): void {
  try {
    localStorage.setItem(`pladi_background_ready_v${VERSION}_${serverId}`, JSON.stringify(ids))
  } catch {
    // storage unavailable
  }
}

export function loadBackgroundReadyCache(serverId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`pladi_background_ready_v${VERSION}_${serverId}`)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export async function updateEnrichmentCacheMovie(serverId: number, movieId: string, patch: Partial<Movie>): Promise<void> {
  const enrichedPatch: Partial<Movie> = {}
  for (const field of ENRICHMENT_FIELDS) {
    if (field in patch) enrichedPatch[field] = patch[field] as never
  }
  if (Object.keys(enrichedPatch).length === 0) return
  if (Object.keys(enrichedPatch).length > 0) {
    const updated = await updateIndexedDbMovieRecords(serverId, 'movies', movieId, enrichedPatch)
    if (updated) return
  }

  try {
    const key = cacheKey(serverId)
    const raw = localStorage.getItem(key)
    const data: EnrichmentData = raw ? JSON.parse(raw) as EnrichmentData : {}
    const matchingKeys = Object.keys(data).filter((entryKey) => entryKey === movieId || entryKey.startsWith(`${movieId}|`))
    if (matchingKeys.length === 0) {
      data[movieId] = { ...(data[movieId] ?? {}), ...enrichedPatch }
    } else {
      for (const entryKey of matchingKeys) data[entryKey] = { ...data[entryKey], ...enrichedPatch }
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // storage unavailable
  }
}
