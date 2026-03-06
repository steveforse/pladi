import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMoviesData } from '@/hooks/useMoviesData'
import { api } from '@/lib/apiClient'
import {
  loadBackgroundReadyCache,
  loadPosterReadyCache,
  updateEnrichmentCacheMovie,
} from '@/lib/enrichmentCache'

vi.mock('@/lib/apiClient', () => ({
  ApiError: class extends Error {},
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('@/lib/enrichmentCache', () => ({
  ENRICHMENT_FIELDS: ['summary', 'genres'],
  mergeEnrichmentCache: vi.fn((_serverId: number, sections: unknown) => sections),
  saveEnrichmentCache: vi.fn(),
  saveEnrichmentCacheDelta: vi.fn(),
  updateEnrichmentCacheMovie: vi.fn(),
  savePosterReadyCache: vi.fn(),
  loadPosterReadyCache: vi.fn(() => new Set<string>()),
  saveBackgroundReadyCache: vi.fn(),
  loadBackgroundReadyCache: vi.fn(() => new Set<string>()),
}))

const cableSubscriptionsCreate = vi.fn()
const cableDisconnect = vi.fn()
const cableReceivedHandlers: Record<string, (data: { media_id: string }) => void> = {}

vi.mock('@rails/actioncable', () => ({
  createConsumer: () => ({
    disconnect: cableDisconnect,
    subscriptions: {
      create: cableSubscriptionsCreate,
    },
  }),
}))

const mockedApi = vi.mocked(api)
const mockedLoadPosterReadyCache = vi.mocked(loadPosterReadyCache)
const mockedLoadBackgroundReadyCache = vi.mocked(loadBackgroundReadyCache)
const mockedUpdateEnrichmentCacheMovie = vi.mocked(updateEnrichmentCacheMovie)

function createStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

function movie(id: string, title: string) {
  return {
    id,
    title,
    original_title: null,
    year: 2020,
    file_path: `/movies/${title}.mkv`,
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
    plex_url: 'https://app.plex.tv/x',
    summary: null,
    content_rating: null,
    imdb_rating: null,
    rt_critics_rating: null,
    rt_audience_rating: null,
    tmdb_rating: null,
    genres: null,
    directors: null,
    sort_title: title,
    edition: null,
    originally_available: null,
    studio: null,
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
  }
}

describe('useMoviesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
    cableSubscriptionsCreate.mockImplementation((identifier: { channel: string }, callbacks: { received: (data: { media_id: string }) => void }) => {
      cableReceivedHandlers[identifier.channel] = callbacks.received
      return { unsubscribe: vi.fn() }
    })
  })

  it('loads initial server and sections on mount', async () => {
    const baseSections = [{ title: 'Movies', items: [movie('m1', 'Alpha')] }]
    const enrichedSections = [{ title: 'Movies', items: [{ ...movie('m1', 'Alpha'), summary: 'enriched' }] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: enrichedSections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.selectedServerId).toBe(1)
      expect(result.current.sections).toHaveLength(1)
      expect(result.current.sections[0].items[0].summary).toBe('enriched')
    })
  })

  it('keeps distinct file rows for multi-file movies after enrichment merge', async () => {
    const movieA = { ...movie('m1', 'Alpha'), file_path: '/movies/Alpha/alpha-cut-a.mkv', video_codec: 'h264' }
    const movieB = { ...movie('m1', 'Alpha'), file_path: '/movies/Alpha/alpha-cut-b.mkv', video_codec: 'hevc' }
    const baseSections = [{ title: 'Movies', items: [movieA, movieB] }]
    const enrichedSections = [{ title: 'Movies', items: [{ ...movieA, summary: null }, { ...movieB, summary: null }] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: enrichedSections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => expect(result.current.syncing).toBe(false))

    const rows = result.current.sections[0].items
    expect(rows).toHaveLength(2)
    expect(rows[0].file_path).toBe('/movies/Alpha/alpha-cut-a.mkv')
    expect(rows[1].file_path).toBe('/movies/Alpha/alpha-cut-b.mkv')
    expect(rows[0].video_codec).toBe('h264')
    expect(rows[1].video_codec).toBe('hevc')
  })

  it('restores saved server + library and handles non-ok refresh/enrich gracefully', async () => {
    localStorage.setItem('pladi_selected_server_id', '2')
    localStorage.setItem('pladi_selected_library', 'TV')

    const tvSections = [{ title: 'TV', items: [movie('m2', 'Beta')] }, { title: 'Movies', items: [movie('m3', 'Gamma')] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return {
          ok: true,
          status: 200,
          data: [
            { id: 1, name: 'A', url: 'http://a.local' },
            { id: 2, name: 'B', url: 'http://b.local' },
          ],
        }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: tvSections }
      if (path === '/api/movies/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/movies/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.selectedServerId).toBe(2)
    expect(result.current.selectedTitle).toBe('TV')
    expect(result.current.refreshing).toBe(false)
    expect(result.current.syncing).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.sections[0].title).toBe('TV')
  })

  it('converts tag string patches to arrays when updating movie', async () => {
    const baseSections = [{ title: 'Movies', items: [movie('m1', 'Alpha')] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: baseSections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.patch.mockResolvedValue({ ok: true, status: 204, data: null })

    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateMovie('m1', { genres: 'Action, Drama' })
    })

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/api/movies/m1',
      { movie: expect.objectContaining({ genres: ['Action', 'Drama'] }) },
      expect.objectContaining({ query: { server_id: 1 } })
    )
    expect(mockedUpdateEnrichmentCacheMovie).toHaveBeenCalledWith(1, 'm1', { genres: 'Action, Drama' })
  })

  it('hydrates image readiness from cache, subscribes to cable channels, and warms uncached media', async () => {
    const baseSections = [{ title: 'Movies', items: [movie('m1', 'Alpha')] }]

    mockedLoadPosterReadyCache.mockReturnValue(new Set(['seed-poster']))
    mockedLoadBackgroundReadyCache.mockReturnValue(new Set(['seed-bg']))

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: baseSections,
            cached_poster_media_ids: ['cached-p'],
            uncached_poster_items: [{ id: 'm1', thumb: '/thumb.jpg' }],
            cached_background_media_ids: ['cached-b'],
            uncached_background_items: [{ id: 'm1', art: '/art.jpg' }],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.post.mockResolvedValue({ ok: true, status: 200, data: null })

    const { result } = renderHook(() => useMoviesData(true))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(cableSubscriptionsCreate).toHaveBeenCalledWith(
      { channel: 'PostersChannel', server_id: 1 },
      expect.objectContaining({ received: expect.any(Function) })
    )
    expect(cableSubscriptionsCreate).toHaveBeenCalledWith(
      { channel: 'BackgroundsChannel', server_id: 1 },
      expect.objectContaining({ received: expect.any(Function) })
    )

    act(() => {
      cableReceivedHandlers.PostersChannel?.({ media_id: 'ws-poster' })
      cableReceivedHandlers.BackgroundsChannel?.({ media_id: 'ws-bg' })
    })

    expect(result.current.posterReady.has('ws-poster')).toBe(true)
    expect(result.current.backgroundReady.has('ws-bg')).toBe(true)

    await act(async () => {
      await result.current.warmPosters(['m1'])
      await result.current.warmBackgrounds(['m1'])
    })

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/movies/warm_posters',
      { priority_ids: ['m1'], movies: [{ id: 'm1', thumb: '/thumb.jpg' }] },
      expect.objectContaining({ query: { server_id: 1 } })
    )
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/movies/warm_backgrounds',
      { priority_ids: ['m1'], movies: [{ id: 'm1', art: '/art.jpg' }] },
      expect.objectContaining({ query: { server_id: 1 } })
    )
  })

  it('refreshes movie details and updates cache for successful detail fetches', async () => {
    const baseSections = [{ title: 'Movies', items: [movie('m1', 'Alpha'), movie('m2', 'Beta')] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: baseSections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      if (path === '/api/movies/m1') return { ok: true, status: 200, data: { summary: 'Updated summary' } }
      if (path === '/api/movies/m2') return { ok: false, status: 404, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.refreshMovies(['m1', 'm2'])
    })

    expect(result.current.sections[0].items.find((m) => m.id === 'm1')?.summary).toBe('Updated summary')
    expect(mockedUpdateEnrichmentCacheMovie).toHaveBeenCalledWith(1, 'm1', { summary: 'Updated summary' })
    expect(mockedUpdateEnrichmentCacheMovie).not.toHaveBeenCalledWith(1, 'm2', expect.anything())
  })

  it('aborts active load and disconnects cable consumer on unmount', async () => {
    let moviesSignal: AbortSignal | undefined

    mockedApi.get.mockImplementation(async (path: string, options?: { signal?: AbortSignal }) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') {
        moviesSignal = options?.signal
        return new Promise(() => {})
      }
      return { ok: false, status: 404, data: null }
    })

    const { unmount } = renderHook(() => useMoviesData(false))
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/api/movies', expect.any(Object)))

    unmount()

    expect(moviesSignal?.aborted).toBe(true)
    expect(cableDisconnect).toHaveBeenCalledTimes(1)
  })

  it('maps non-tag patch fields directly and empty tag strings to empty arrays', async () => {
    const baseSections = [{ title: 'Movies', items: [movie('m1', 'Alpha')] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: baseSections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.patch.mockResolvedValue({ ok: true, status: 204, data: null })

    const { result } = renderHook(() => useMoviesData(false))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateMovie('m1', { year: 2024, genres: '' })
    })

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/api/movies/m1',
      { movie: expect.objectContaining({ year: 2024, genres: [] }) },
      expect.objectContaining({ query: { server_id: 1 } })
    )
  })

  it('handles empty server bootstrap state without loading movies', async () => {
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') return { ok: true, status: 200, data: [] }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.plexServers).toEqual([])
      expect(result.current.sections).toEqual([])
    })
    expect(mockedApi.get).not.toHaveBeenCalledWith('/api/movies', expect.any(Object))
  })

  it('stores selected server id and loads movies when switching servers', async () => {
    const sections = [{ title: 'Movies', items: [movie('m1', 'Alpha')] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return {
          ok: true,
          status: 200,
          data: [
            { id: 1, name: 'Main', url: 'http://plex.local' },
            { id: 2, name: 'Backup', url: 'http://backup.local' },
          ],
        }
      }
      if (path === '/api/movies' || path === '/api/movies/refresh') {
        const serverId = options?.query?.server_id
        return { ok: true, status: 200, data: serverId === 2 ? [{ title: 'Movies 2', items: [movie('m2', 'Beta')] }] : sections }
      }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleServerChange(2)
    })

    await waitFor(() => {
      expect(result.current.selectedServerId).toBe(2)
      expect(localStorage.getItem('pladi_selected_server_id')).toBe('2')
      expect(mockedApi.get).toHaveBeenCalledWith('/api/movies', expect.objectContaining({
        query: { server_id: 2 },
      }))
    })
  })

  it('updates selected library state and only persists non-null titles', async () => {
    const sections = [{ title: 'Movies', items: [movie('m1', 'Alpha')] }]
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/movies' || path === '/api/movies/refresh') {
        return { ok: true, status: 200, data: sections }
      }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections,
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSelectedTitle('Movies')
    })
    expect(localStorage.getItem('pladi_selected_library')).toBe('Movies')

    act(() => {
      result.current.setSelectedTitle(null)
    })
    expect(result.current.selectedTitle).toBeNull()
    expect(localStorage.getItem('pladi_selected_library')).toBe('Movies')
  })

  it('sets fallback unknown error when server bootstrap throws non-Error value', async () => {
    mockedApi.get.mockRejectedValue('bad')
    const { result } = renderHook(() => useMoviesData(false))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Unknown error')
    })
  })

  it('handles first server added flow', async () => {
    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') return { ok: true, status: 200, data: [] }
      if (path === '/api/movies' || path === '/api/movies/refresh') {
        return { ok: true, status: 200, data: [{ title: 'Movies', items: [movie('m1', 'Alpha')] }] }
      }
      if (path === '/api/movies/enrich') {
        return {
          ok: true,
          status: 200,
          data: {
            sections: [{ title: 'Movies', items: [movie('m1', 'Alpha')] }],
            cached_poster_media_ids: [],
            uncached_poster_items: [],
            cached_background_media_ids: [],
            uncached_background_items: [],
          },
        }
      }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useMoviesData(false))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleServerAdded({ id: 7, name: 'Added', url: 'http://added.local' })
    })

    await waitFor(() => {
      expect(result.current.selectedServerId).toBe(7)
      expect(result.current.plexServers).toEqual([{ id: 7, name: 'Added', url: 'http://added.local' }])
      expect(mockedApi.get).toHaveBeenCalledWith('/api/movies', expect.objectContaining({
        query: { server_id: 7 },
      }))
    })
  })
})
