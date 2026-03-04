import { describe, expect, it } from 'vitest'

import { sortMovies } from '@/lib/sorting'
import type { Movie } from '@/lib/types'

function movie(overrides: Partial<Movie>): Movie {
  return {
    id: '1',
    title: 'Movie',
    original_title: null,
    year: null,
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
    updated_at: null,
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
    sort_title: null,
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

describe('sortMovies', () => {
  it('sorts string IDs numerically', () => {
    const movies = [movie({ id: '10' }), movie({ id: '2' }), movie({ id: '1' })]

    const sorted = sortMovies(movies, 'id', 'asc')

    expect(sorted.map((m) => m.id)).toEqual(['1', '2', '10'])
  })

  it('sorts with null values last in ascending mode', () => {
    const movies = [movie({ year: 2001 }), movie({ year: null }), movie({ year: 1999 })]

    const sorted = sortMovies(movies, 'year', 'asc')

    expect(sorted.map((m) => m.year)).toEqual([1999, 2001, null])
  })

  it('sorts numeric values descending', () => {
    const movies = [movie({ year: 2001 }), movie({ year: 1994 }), movie({ year: 2023 })]

    const sorted = sortMovies(movies, 'year', 'desc')

    expect(sorted.map((m) => m.year)).toEqual([2023, 2001, 1994])
  })
})
