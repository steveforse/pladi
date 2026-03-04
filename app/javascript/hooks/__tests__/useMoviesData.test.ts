import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMoviesData } from '@/hooks/useMoviesData'
import { api } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => ({
  ApiError: class extends Error {},
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('@rails/actioncable', () => ({
  createConsumer: () => ({
    disconnect: vi.fn(),
    subscriptions: {
      create: vi.fn(() => ({ unsubscribe: vi.fn() })),
    },
  }),
}))

const mockedApi = vi.mocked(api)

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
  })

  it('loads initial server and sections on mount', async () => {
    const baseSections = [{ title: 'Movies', movies: [movie('m1', 'Alpha')] }]
    const enrichedSections = [{ title: 'Movies', movies: [{ ...movie('m1', 'Alpha'), summary: 'enriched' }] }]

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
            cached_poster_ids: [],
            uncached_poster_movies: [],
            cached_background_ids: [],
            uncached_background_movies: [],
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
      expect(result.current.sections[0].movies[0].summary).toBe('enriched')
    })
  })

  it('converts tag string patches to arrays when updating movie', async () => {
    const baseSections = [{ title: 'Movies', movies: [movie('m1', 'Alpha')] }]

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
            cached_poster_ids: [],
            uncached_poster_movies: [],
            cached_background_ids: [],
            uncached_background_movies: [],
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
  })
})
