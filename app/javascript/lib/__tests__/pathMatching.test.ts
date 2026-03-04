import { describe, expect, it } from 'vitest'

import {
  fileIsInSubfolder,
  normalizeForMatch,
  pathContainsYear,
  pathYearMatchesMetadata,
  titleMatchesFilename,
  titleMatchesPath,
} from '@/lib/pathMatching'
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

describe('pathMatching helpers', () => {
  it('normalizes punctuation and year tokens', () => {
    expect(normalizeForMatch('Alien (1979).Director\'s Cut')).toBe('alien director s cut')
  })

  it('matches movie title against filename', () => {
    const row = movie({
      title: 'The Matrix',
      file_path: '/media/Movies/The Matrix (1999)/The.Matrix.1999.4k.mkv',
    })

    expect(titleMatchesFilename(row)).toBe(true)
  })

  it('returns false when filename does not match title and true for missing path/title', () => {
    expect(titleMatchesFilename(movie({
      title: 'The Matrix',
      file_path: '/media/Movies/Other/CompletelyDifferent.mkv',
    }))).toBe(false)
    expect(titleMatchesFilename(movie({ title: 'The Matrix', file_path: null }))).toBe(true)
    expect(titleMatchesFilename(movie({ title: '', file_path: '/x/file.mkv' }))).toBe(true)
  })

  it('matches movie title against parent folder', () => {
    const row = movie({
      title: 'The Matrix',
      file_path: '/media/Movies/The Matrix (1999)/matrix.mkv',
    })

    expect(titleMatchesPath(row)).toBe(true)
  })

  it('returns false when folder does not match and true for missing path/title', () => {
    expect(titleMatchesPath(movie({
      title: 'The Matrix',
      file_path: '/media/Movies/Another Folder/matrix.mkv',
    }))).toBe(false)
    expect(titleMatchesPath(movie({ title: 'The Matrix', file_path: null }))).toBe(true)
    expect(titleMatchesPath(movie({ title: '', file_path: '/x/file.mkv' }))).toBe(true)
  })

  it('detects and validates year inside the path', () => {
    const row = movie({
      title: 'The Matrix',
      year: 1999,
      file_path: '/media/Movies/The Matrix (1999)/matrix.mkv',
    })

    expect(pathContainsYear(row)).toBe(true)
    expect(pathYearMatchesMetadata(row)).toBe(true)
  })

  it('handles year mismatch and no-year path cases', () => {
    expect(pathContainsYear(movie({ file_path: '/media/Movies/NoYear/movie.mkv' }))).toBe(false)
    expect(pathYearMatchesMetadata(movie({
      year: 2001,
      file_path: '/media/Movies/Film (1999)/film.mkv',
    }))).toBe(false)
    expect(pathYearMatchesMetadata(movie({
      year: 2001,
      file_path: '/media/Movies/NoYear/film.mkv',
    }))).toBe(true)
    expect(pathYearMatchesMetadata(movie({ year: null, file_path: '/media/Movies/Film (1999)/film.mkv' }))).toBe(true)
  })

  it('detects when the file is not in a year-based movie subfolder', () => {
    const row = movie({ file_path: '/media/matrix.mkv' })

    expect(fileIsInSubfolder(row)).toBe(false)
  })

  it('detects year-based subfolders and missing path handling', () => {
    expect(fileIsInSubfolder(movie({ file_path: '/media/Movies/Film (1999)/film.mkv' }))).toBe(true)
    expect(fileIsInSubfolder(movie({ file_path: null }))).toBe(true)
  })
})
