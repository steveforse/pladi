import { describe, expect, it } from 'vitest'
import { MovieDetailSchema, MovieListItemSchema } from '@/lib/apiSchemas'

function buildMovie() {
  return {
    id: '1',
    title: 'Movie',
    original_title: null,
    year: 2024,
    file_path: null,
    added_at: null,
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
    view_count: null,
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
  }
}

describe('MovieSchema', () => {
  it('accepts full movie payload shape', () => {
    expect(() => MovieListItemSchema.parse(buildMovie())).not.toThrow()
  })

  it('rejects unknown keys in strict mode', () => {
    const payload = { ...buildMovie(), extra_field: 'unexpected' }
    const parsed = MovieListItemSchema.safeParse(payload)
    expect(parsed.success).toBe(false)
  })

  it('validates detail-only movie payload shape', () => {
    const detail = {
      summary: null,
      content_rating: null,
      edition: null,
      imdb_rating: null,
      rt_critics_rating: null,
      rt_audience_rating: null,
      tmdb_rating: null,
      genres: null,
      directors: null,
      country: null,
      writers: null,
      producers: null,
      collections: null,
      labels: null,
      subtitles: null,
      audio_tracks: null,
      audio_language: null,
      audio_bitrate: null,
      video_bitrate: null,
    }
    expect(() => MovieDetailSchema.parse(detail)).not.toThrow()
  })
})
