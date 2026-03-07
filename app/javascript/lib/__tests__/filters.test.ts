import { describe, expect, it } from 'vitest'

import { defaultOp, matchesFilter } from '@/lib/filters'
import type { ActiveFilter, FilterFieldId, FilterOp, Movie } from '@/lib/types'

function movie(overrides: Partial<Movie>): Movie {
  return {
    id: '1',
    title: 'Movie',
    original_title: null,
    year: 2000,
    file_path: '/movies/Movie (2000)/movie.mkv',
    container: null,
    video_codec: null,
    video_resolution: null,
    width: null,
    height: null,
    aspect_ratio: null,
    frame_rate: 'NTSC',
    audio_codec: null,
    audio_channels: null,
    overall_bitrate: 4_000,
    size: 2_097_152,
    duration: 7_200_000,
    added_at: 1_704_067_200,
    updated_at: 1_735_689_600,
    thumb: '/thumb.jpg',
    plex_url: null,
    summary: null,
    content_rating: null,
    imdb_rating: null,
    rt_critics_rating: null,
    rt_audience_rating: null,
    tmdb_rating: null,
    genres: null,
    directors: null,
    sort_title: null,
    edition: null,
    originally_available: '2000-04-10',
    studio: null,
    tagline: null,
    country: null,
    writers: null,
    producers: null,
    collections: null,
    labels: null,
    art: '/art.jpg',
    subtitles: null,
    audio_tracks: null,
    audio_language: null,
    audio_bitrate: null,
    video_bitrate: null,
    ...overrides,
  }
}

function filter(field: FilterFieldId, op: FilterOp, value: string): ActiveFilter {
  return {
    id: 1,
    field,
    op,
    value,
  }
}

describe('defaultOp', () => {
  it('returns includes for string fields and gte otherwise', () => {
    expect(defaultOp('string')).toBe('includes')
    expect(defaultOp('numeric')).toBe('gte')
    expect(defaultOp('date')).toBe('gte')
  })
})

describe('matchesFilter', () => {
  it('handles null checks for derived poster/background fields', () => {
    expect(matchesFilter(movie({ thumb: null }), filter('poster', 'missing', ''))).toBe(true)
    expect(matchesFilter(movie({ art: '/bg.jpg' }), filter('background', 'present', ''))).toBe(true)
  })

  it('applies numeric unit conversions before comparing', () => {
    expect(matchesFilter(movie({ size: 10_485_760 }), filter('size', 'gt', '9'))).toBe(true)
    expect(matchesFilter(movie({ duration: 3_600_000 }), filter('duration', 'eq', '60'))).toBe(true)
    expect(matchesFilter(movie({ overall_bitrate: 6_000 }), filter('overall_bitrate', 'eq', '6'))).toBe(true)
    expect(matchesFilter(movie({ year: 2020 }), filter('year', 'lte', '2020'))).toBe(true)
    expect(matchesFilter(movie({ year: 2020 }), filter('year', 'lt', '2020'))).toBe(false)
    expect(matchesFilter(movie({ year: 2020 }), filter('year', 'neq', '2020'))).toBe(false)
    expect(matchesFilter(movie({ year: 2020 }), filter('year', 'gte', 'not-number'))).toBe(true)
  })

  it('supports string matching against display values', () => {
    expect(matchesFilter(movie({ frame_rate: 'NTSC Film' }), filter('frame_rate', 'includes', '23.976'))).toBe(true)
    expect(matchesFilter(movie({ title: 'Alpha Beta' }), filter('title', 'starts', 'alpha'))).toBe(true)
    expect(matchesFilter(movie({ title: 'Alpha Beta' }), filter('title', 'ends', 'beta'))).toBe(true)
    expect(matchesFilter(movie({ title: 'Alpha Beta' }), filter('title', 'eq', 'alpha beta'))).toBe(true)
    expect(matchesFilter(movie({ title: 'Alpha Beta' }), filter('title', 'neq', 'alpha beta'))).toBe(false)
    expect(matchesFilter(movie({ title: 'Alpha Beta' }), filter('title', 'excludes', 'alpha'))).toBe(false)
  })

  it('compares date filters by local calendar day', () => {
    const row = movie({ originally_available: '2022-01-15' })

    expect(matchesFilter(row, filter('originally_available', 'eq', '2022-01-15'))).toBe(true)
    expect(matchesFilter(row, filter('originally_available', 'lt', '2023-01-01'))).toBe(true)
    expect(matchesFilter(row, filter('originally_available', 'gt', '2023-01-01'))).toBe(false)
    expect(matchesFilter(row, filter('originally_available', 'lte', '2022-01-15'))).toBe(true)
    expect(matchesFilter(row, filter('originally_available', 'gte', '2022-01-15'))).toBe(true)
    expect(matchesFilter(row, filter('originally_available', 'neq', '2022-01-15'))).toBe(false)
    expect(matchesFilter(row, filter('originally_available', 'eq', 'bad-date'))).toBe(true)
    expect(matchesFilter(movie({ originally_available: null }), filter('originally_available', 'eq', '2022-01-15'))).toBe(false)
  })

  it('supports unix timestamp date filters for added dates', () => {
    const row = movie({ added_at: 1_704_067_200 })

    expect(matchesFilter(row, filter('added_at', 'eq', '2024-01-01'))).toBe(true)
    expect(matchesFilter(row, filter('added_at', 'lt', '2024-02-01'))).toBe(true)
    expect(matchesFilter(row, filter('added_at', 'gt', '2024-02-01'))).toBe(false)
    expect(matchesFilter(movie({ added_at: null }), filter('added_at', 'eq', '2024-01-01'))).toBe(false)
  })
})
