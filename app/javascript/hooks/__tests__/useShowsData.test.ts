import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useShowsData } from '@/hooks/useShowsData'
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

function show(id: string, title: string) {
  return {
    id,
    title,
    original_title: null,
    show_title: null,
    episode_number: null,
    year: 2024,
    file_path: null,
    container: null,
    video_codec: null,
    video_resolution: null,
    width: null,
    height: null,
    aspect_ratio: null,
    frame_rate: null,
    audio_codec: null,
    audio_channels: null,
    overall_bitrate: null,
    size: null,
    duration: null,
    updated_at: 1_700_000_000,
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
    season_count: 2,
    episode_count: 20,
    viewed_episode_count: 5,
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

describe('useShowsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
  })

  it('loads initial server and sections on mount', async () => {
    const baseSections = [{ title: 'TV Shows', movies: [show('s1', 'Severance')] }]
    const enrichedSections = [{ title: 'TV Shows', movies: [{ ...show('s1', 'Severance'), summary: 'Refined details' }] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/enrich') return { ok: true, status: 200, data: { sections: enrichedSections } }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.selectedServerId).toBe(1)
      expect(result.current.sections[0].movies[0].summary).toBe('Refined details')
    })
  })

  it('restores saved TV server and library selections', async () => {
    localStorage.setItem('pladi_selected_show_server_id', '2')
    localStorage.setItem('pladi_selected_show_library_shows', 'Anime')

    const sections = [{ title: 'Anime', movies: [show('s1', 'Frieren')] }, { title: 'TV Shows', movies: [] }]

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
      if (path === '/api/shows') return { ok: true, status: 200, data: sections }
      if (path === '/api/shows/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/shows/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.selectedServerId).toBe(2)
    expect(result.current.selectedTitle).toBe('Anime')
  })

  it('handles explicit server and library changes', async () => {
    const sectionsA = [{ title: 'TV Shows', movies: [show('s1', 'Severance')] }]
    const sectionsB = [{ title: 'Anime', movies: [show('s2', 'Dandadan')] }]

    mockedApi.get.mockImplementation(async (path: string, options?: { query?: Record<string, unknown> }) => {
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
      if (path === '/api/shows' && options?.query?.server_id === 1) return { ok: true, status: 200, data: sectionsA }
      if (path === '/api/shows' && options?.query?.server_id === 2) return { ok: true, status: 200, data: sectionsB }
      if (path === '/api/shows/refresh') return { ok: true, status: 200, data: sectionsB }
      if (path === '/api/shows/enrich') return { ok: true, status: 200, data: { sections: sectionsB } }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleLibraryChange('TV Shows')
      result.current.handleServerChange(2)
    })

    await waitFor(() => expect(result.current.selectedServerId).toBe(2))
    expect(localStorage.getItem('pladi_selected_show_server_id')).toBe('2')
    expect(localStorage.getItem('pladi_selected_show_library_shows')).toBe('TV Shows')
  })

  it('converts tag patches to arrays when updating show', async () => {
    const baseSections = [{ title: 'TV Shows', movies: [show('s1', 'Severance')] }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/enrich') return { ok: true, status: 200, data: { sections: baseSections } }
      return { ok: false, status: 404, data: null }
    })
    mockedApi.patch.mockResolvedValue({ ok: true, status: 204, data: null })

    const { result } = renderHook(() => useShowsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateShow('s1', { genres: 'Drama, Mystery' })
    })

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/api/shows/s1',
      { show: expect.objectContaining({ genres: ['Drama', 'Mystery'] }) },
      expect.objectContaining({ query: { server_id: 1, view_mode: 'shows' } })
    )
  })

  it('applies cached show enrichment before enrich response', async () => {
    const baseSections = [{ title: 'TV Shows', movies: [show('s1', 'Severance')] }]
    localStorage.setItem('pladi_show_enrichment_v1_shows_1', JSON.stringify({ s1: { summary: 'Cached summary' } }))

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/shows/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.sections[0].movies[0].summary).toBe('Cached summary')
  })

  it('does not let legacy cached count fields override live show counts', async () => {
    const baseSections = [{ title: 'TV Shows', movies: [show('s1', 'Severance')] }]
    localStorage.setItem(
      'pladi_show_enrichment_v1_shows_1',
      JSON.stringify({
        s1: {
          summary: 'Cached summary',
          season_count: null,
          episode_count: null,
          viewed_episode_count: null,
        },
      })
    )

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/shows/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const loadedShow = result.current.sections[0].movies[0]
    expect(loadedShow.summary).toBe('Cached summary')
    expect(loadedShow.season_count).toBe(2)
    expect(loadedShow.episode_count).toBe(20)
    expect(loadedShow.viewed_episode_count).toBe(5)
  })

  it('applies cached episode enrichment before enrich response', async () => {
    const baseSections = [{ title: 'TV Shows', movies: [{ ...show('e1', 'Pilot'), show_title: 'Show A', episode_number: 'S01E01' }] }]
    localStorage.setItem('pladi_show_enrichment_v1_episodes_1', JSON.stringify({
      'e1|': { audio_language: 'English', subtitles: 'English, Spanish', video_bitrate: 4500 },
    }))

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/shows/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData('episodes'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const cachedEpisode = result.current.sections[0].movies[0]
    expect(cachedEpisode.audio_language).toBe('English')
    expect(cachedEpisode.subtitles).toBe('English, Spanish')
    expect(cachedEpisode.video_bitrate).toBe(4500)
  })

  it('hydrates distinct cached enrichment for episode rows with the same id but different files', async () => {
    const baseSections = [{
      title: 'TV Shows',
      movies: [
        { ...show('e1', 'Pilot'), show_title: 'Show A', episode_number: 'S01E01', file_path: '/tv/Show/ep-a.mkv' },
        { ...show('e1', 'Pilot'), show_title: 'Show A', episode_number: 'S01E01', file_path: '/tv/Show/ep-b.mkv' },
      ],
    }]
    localStorage.setItem('pladi_show_enrichment_v1_episodes_1', JSON.stringify({
      'e1|/tv/Show/ep-a.mkv': { subtitles: 'English' },
      'e1|/tv/Show/ep-b.mkv': { subtitles: 'Spanish' },
    }))

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/shows/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData('episodes'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.sections[0].movies[0].subtitles).toBe('English')
    expect(result.current.sections[0].movies[1].subtitles).toBe('Spanish')
  })

  it('loads episode mode sections and runs enrich', async () => {
    const baseSections = [{ title: 'TV Shows', movies: [{ ...show('e1', 'Pilot'), show_title: 'Show A', episode_number: 'S01E01' }] }]
    const observedViewModes: string[] = []

    mockedApi.get.mockImplementation(async (path: string, options?: { query?: Record<string, unknown> }) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') {
        observedViewModes.push(String(options?.query?.view_mode ?? ''))
        return { ok: true, status: 200, data: baseSections }
      }
      if (path === '/api/shows/refresh') {
        observedViewModes.push(String(options?.query?.view_mode ?? ''))
        return { ok: true, status: 200, data: baseSections }
      }
      if (path === '/api/shows/enrich') return { ok: true, status: 200, data: { sections: baseSections } }
      return { ok: false, status: 404, data: null }
    })

    const { result } = renderHook(() => useShowsData('episodes'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.sections[0].movies[0].id).toBe('e1')
    expect(observedViewModes).toEqual(['episodes', 'episodes'])
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/api/shows/enrich',
      expect.objectContaining({ query: expect.objectContaining({ view_mode: 'episodes' }) })
    )
  })

  it('hydrates episode enrich values on a fresh mount before enrich reruns', async () => {
    const baseSections = [{
      title: 'TV Shows',
      movies: [{
        ...show('41014', 'Pilot'),
        show_title: 'Show A',
        episode_number: 'S01E01',
        file_path: '/tv/Show A/Season 01/Show A - S01E01.mkv',
        writers: 'Stacie Lipp, Michael G. Moye',
        subtitles: null,
      }],
    }]
    const enrichedSections = [{
      title: 'TV Shows',
      movies: [{
        ...baseSections[0].movies[0],
        writers: 'Stacie Lipp, Michael G. Moye, Ron Leavitt, Larry Jacobson',
        subtitles: 'English',
      }],
    }]

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/enrich') return { ok: true, status: 200, data: { sections: enrichedSections } }
      return { ok: false, status: 404, data: null }
    })

    const { result: firstResult, unmount } = renderHook(() => useShowsData('episodes'))
    await waitFor(() => {
      expect(firstResult.current.loading).toBe(false)
      expect(firstResult.current.sections[0].movies[0].writers).toContain('Ron Leavitt')
      expect(firstResult.current.sections[0].movies[0].subtitles).toBe('English')
    })
    unmount()

    mockedApi.get.mockImplementation(async (path: string) => {
      if (path === '/api/plex_servers') {
        return { ok: true, status: 200, data: [{ id: 1, name: 'Main', url: 'http://plex.local' }] }
      }
      if (path === '/api/shows') return { ok: true, status: 200, data: baseSections }
      if (path === '/api/shows/refresh') return { ok: false, status: 500, data: null }
      if (path === '/api/shows/enrich') return { ok: false, status: 500, data: null }
      return { ok: false, status: 404, data: null }
    })

    const { result: secondResult } = renderHook(() => useShowsData('episodes'))
    await waitFor(() => expect(secondResult.current.loading).toBe(false))

    expect(secondResult.current.sections[0].movies[0].writers).toContain('Ron Leavitt')
    expect(secondResult.current.sections[0].movies[0].subtitles).toBe('English')
  })
})
