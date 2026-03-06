import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMoviesFilter } from '@/hooks/useMoviesFilter'

function createStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

function movie(overrides: Record<string, unknown>) {
  return {
    id: 'm1',
    title: 'Alpha',
    original_title: null,
    year: 2020,
    file_path: '/movies/Alpha (2020)/Alpha (2020).mkv',
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
    summary: null,
    content_rating: null,
    imdb_rating: null,
    rt_critics_rating: null,
    rt_audience_rating: null,
    tmdb_rating: null,
    genres: null,
    directors: null,
    sort_title: 'Alpha',
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
    ...overrides,
  }
}

describe('useMoviesFilter', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  it('filters by selected library and sorts', () => {
    const sections = [
      { title: 'A', movies: [movie({ id: 'a2', title: 'Zulu' }), movie({ id: 'a1', title: 'Alpha' })] },
      { title: 'B', movies: [movie({ id: 'b1', title: 'Beta' })] },
    ]

    const { result } = renderHook(() => useMoviesFilter(sections, 'A'))
    expect(result.current.visibleMovies.map((m) => m.title)).toEqual(['Alpha', 'Zulu'])
  })

  it('applies quick filters and can clear all', () => {
    const sections = [{
      title: 'A',
      movies: [
        movie({ id: 'm1', title: 'Good', file_path: '/movies/Good (2020)/Good (2020).mkv', year: 2020 }),
        movie({ id: 'm2', title: 'Bad', file_path: '/movies/Mismatch/OtherName.mkv', year: 2021 }),
      ],
    }]

    const { result } = renderHook(() => useMoviesFilter(sections, null))

    act(() => {
      result.current.setUnmatchedOnly(true)
      result.current.setFilenameMismatch(true)
    })
    expect(result.current.visibleMovies).toHaveLength(1)
    expect(result.current.visibleMovies[0].id).toBe('m2')

    act(() => result.current.clearAllFilters())
    expect(result.current.visibleMovies).toHaveLength(2)
    expect(result.current.unmatchedOnly).toBe(false)
    expect(result.current.filenameMismatch).toBe(false)
  })

  it('manages advanced filters add/update/remove', () => {
    const sections = [{
      title: 'A',
      movies: [movie({ id: 'm1', title: 'Alpha' }), movie({ id: 'm2', title: 'Beta' })],
    }]
    const { result } = renderHook(() => useMoviesFilter(sections, null))

    act(() => {
      result.current.addFilter()
    })
    expect(result.current.filters).toHaveLength(1)

    const f = result.current.filters[0]
    act(() => {
      result.current.updateFilter(f.id, { ...f, field: 'title', op: 'includes', value: 'alp' })
    })
    expect(result.current.visibleMovies.map((m) => m.id)).toEqual(['m1'])

    act(() => {
      result.current.removeFilter(f.id)
    })
    expect(result.current.filters).toHaveLength(0)
    expect(result.current.visibleMovies).toHaveLength(2)
  })

  it('toggles sort direction and changes sort key', () => {
    const sections = [{
      title: 'A',
      movies: [movie({ id: 'm1', title: 'Alpha', year: 2020 }), movie({ id: 'm2', title: 'Beta', year: 2019 })],
    }]
    const { result } = renderHook(() => useMoviesFilter(sections, null))

    expect(result.current.sortKey).toBe('title')
    expect(result.current.sortDir).toBe('asc')

    act(() => result.current.handleSort('title'))
    expect(result.current.sortDir).toBe('desc')

    act(() => result.current.handleSort('year'))
    expect(result.current.sortKey).toBe('year')
    expect(result.current.sortDir).toBe('asc')
  })

  it('loads initial state from localStorage and applies additional quick filters', () => {
    const storage = createStorageMock()
    storage.setItem('pladi.filters', JSON.stringify({
      multiOnly: false,
      unmatchedOnly: false,
      filenameMismatch: false,
      originalTitleMismatch: true,
      noYearInPath: true,
      yearPathMismatch: false,
      notInSubfolder: true,
      sortKey: 'title',
      sortDir: 'asc',
      filters: [],
    }))
    vi.stubGlobal('localStorage', storage)

    const sections = [{
      title: 'A',
      movies: [
        movie({ id: 'm1', title: 'Alpha', original_title: 'Alpha', year: 2020, file_path: '/movies/Alpha (2020)/Alpha (2020).mkv' }),
        movie({ id: 'm2', title: 'Beta', original_title: 'Different', year: 2021, file_path: '/Beta.mkv' }),
      ],
    }]

    const { result } = renderHook(() => useMoviesFilter(sections, null))

    expect(result.current.originalTitleMismatch).toBe(true)
    expect(result.current.noYearInPath).toBe(true)
    expect(result.current.yearPathMismatch).toBe(false)
    expect(result.current.notInSubfolder).toBe(true)
    expect(result.current.visibleMovies.map((m) => m.id)).toEqual(['m2'])
  })

  it('handles storage parse/set failures without crashing', () => {
    const badStorage = {
      getItem: () => '{bad-json',
      setItem: () => { throw new Error('storage down') },
      removeItem: () => {},
      clear: () => {},
    }
    vi.stubGlobal('localStorage', badStorage)

    const sections = [{ title: 'A', movies: [movie({ id: 'm1', title: 'Alpha' })] }]
    const { result } = renderHook(() => useMoviesFilter(sections, null))

    expect(result.current.visibleMovies).toHaveLength(1)
    act(() => result.current.setMultiOnly(true))
    expect(result.current.visibleMovies).toHaveLength(0)
  })
})
