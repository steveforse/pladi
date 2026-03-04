import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mergeEnrichmentCache,
  loadBackgroundReadyCache,
  loadPosterReadyCache,
  saveBackgroundReadyCache,
  saveEnrichmentCache,
  savePosterReadyCache,
  updateEnrichmentCacheMovie,
} from '@/lib/enrichmentCache'
import type { Section } from '@/lib/types'

function createStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

function sections(): Section[] {
  return [{
    title: 'Movies',
    movies: [{
      id: 'm1',
      title: 'Alpha',
      original_title: null,
      year: 2020,
      file_path: '/movies/Alpha.mkv',
      container: 'mkv',
      video_codec: 'h264',
      video_resolution: '1080',
      width: 1920,
      height: 1080,
      aspect_ratio: 1.78,
      frame_rate: '24p',
      audio_codec: 'aac',
      audio_channels: 2,
      overall_bitrate: 1200,
      size: 1000,
      duration: 100000,
      updated_at: 1700000000,
      thumb: null,
      plex_url: null,
      summary: 'Summary',
      content_rating: 'PG',
      imdb_rating: 7.4,
      rt_critics_rating: null,
      rt_audience_rating: null,
      tmdb_rating: null,
      genres: 'Action',
      directors: 'Director',
      sort_title: 'Alpha',
      edition: null,
      originally_available: null,
      studio: 'Studio',
      tagline: null,
      country: null,
      writers: null,
      producers: null,
      collections: null,
      labels: null,
      art: null,
      subtitles: null,
      audio_tracks: null,
      audio_language: null,
      audio_bitrate: null,
      video_bitrate: null,
    }],
  }]
}

describe('enrichmentCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('saves and merges enrichment fields for sections', () => {
    const storage = createStorageMock()
    vi.stubGlobal('localStorage', storage)

    const input = sections()
    saveEnrichmentCache(7, input)

    const merged = mergeEnrichmentCache(7, [{
      ...input[0],
      movies: [{ ...input[0].movies[0], summary: null, genres: null }],
    }])

    expect(merged[0].movies[0].summary).toBe('Summary')
    expect(merged[0].movies[0].genres).toBe('Action')
    expect(merged[0].movies[0].title).toBe('Alpha')
  })

  it('returns original sections when cache is missing or malformed', () => {
    const storage = createStorageMock()
    vi.stubGlobal('localStorage', storage)

    const input = sections()
    expect(mergeEnrichmentCache(1, input)).toEqual(input)

    storage.setItem('pladi_enrichment_v1_1', '{not-json')
    expect(mergeEnrichmentCache(1, input)).toEqual(input)
  })

  it('saves and loads poster/background readiness sets', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    savePosterReadyCache(3, ['a', 'b'])
    saveBackgroundReadyCache(3, ['x', 'y'])

    expect(loadPosterReadyCache(3)).toEqual(new Set(['a', 'b']))
    expect(loadBackgroundReadyCache(3)).toEqual(new Set(['x', 'y']))
  })

  it('handles invalid readiness cache payloads with empty sets', () => {
    const storage = createStorageMock()
    vi.stubGlobal('localStorage', storage)

    storage.setItem('pladi_poster_ready_v1_9', 'bad-json')
    storage.setItem('pladi_background_ready_v1_9', 'bad-json')

    expect(loadPosterReadyCache(9)).toEqual(new Set())
    expect(loadBackgroundReadyCache(9)).toEqual(new Set())
  })

  it('updates only enrichment fields in cache and skips non-enrichment-only patches', () => {
    const storage = createStorageMock()
    vi.stubGlobal('localStorage', storage)

    storage.setItem('pladi_enrichment_v1_5', JSON.stringify({ m1: { summary: 'Old' } }))

    updateEnrichmentCacheMovie(5, 'm1', { summary: 'New', title: 'Ignored title', genres: 'Drama' })
    const updated = JSON.parse(storage.getItem('pladi_enrichment_v1_5') ?? '{}')

    expect(updated.m1.summary).toBe('New')
    expect(updated.m1.genres).toBe('Drama')
    expect(updated.m1.title).toBeUndefined()

    const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem')
    updateEnrichmentCacheMovie(5, 'm1', { title: 'Only title change' })
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it('silently ignores storage write errors', () => {
    const failingStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => { throw new Error('quota exceeded') }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    vi.stubGlobal('localStorage', failingStorage)

    expect(() => savePosterReadyCache(1, ['x'])).not.toThrow()
    expect(() => saveBackgroundReadyCache(1, ['x'])).not.toThrow()
    expect(() => saveEnrichmentCache(1, sections())).not.toThrow()
    expect(() => updateEnrichmentCacheMovie(1, 'm1', { summary: 'safe' })).not.toThrow()
  })
})
