import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MovieRow } from '@/components/movies/MovieRow'
import type { AllColumnId, ColumnId, Movie } from '@/lib/types'

vi.mock('@/components/movies/EditableCell', () => ({
  EditableCell: ({ className, renderView, onSave, fieldType, value }: {
    className?: string
    renderView: () => React.ReactNode
    onSave: (value: string | string[]) => Promise<void>
    fieldType: 'text' | 'number' | 'date' | 'tags'
    value: string | string[] | null
  }) => {
    const nextValue = Array.isArray(value)
      ? [...value, 'NewTag']
      : fieldType === 'number'
        ? '1999'
        : 'Edited'

    return (
      <td className={className}>
        {renderView()}
        <button type="button" aria-label={`save-${fieldType}`} onClick={() => void onSave(nextValue)}>
          save
        </button>
      </td>
    )
  },
}))

function movie(overrides?: Partial<Movie>): Movie {
  return {
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
    thumb: '/thumb.jpg',
    plex_url: 'https://app.plex.tv/m1',
    summary: null,
    content_rating: null,
    imdb_rating: null,
    rt_critics_rating: null,
    rt_audience_rating: null,
    tmdb_rating: null,
    genres: 'Action',
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
    art: '/art.jpg',
    subtitles: null,
    audio_tracks: null,
    audio_language: null,
    audio_bitrate: null,
    video_bitrate: null,
    ...overrides,
  }
}

function renderRow({
  colOrder,
  visibleCols,
  downloadImages,
  rowMovie,
  posterReady = new Set<string>(),
  backgroundReady = new Set<string>(),
}: {
  colOrder: AllColumnId[]
  visibleCols: Set<ColumnId>
  downloadImages: boolean
  rowMovie: Movie
  posterReady?: Set<string>
  backgroundReady?: Set<string>
}) {
  const onToggle = vi.fn()
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onOpenPoster = vi.fn()
  const onOpenBackground = vi.fn()

  const view = render(
    <table>
      <tbody>
        <MovieRow
          movie={rowMovie}
          colOrder={colOrder}
          visibleCols={visibleCols}
          selectedServerId={1}
          downloadImages={downloadImages}
          posterReady={posterReady}
          backgroundReady={backgroundReady}
          selected={false}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onOpenPoster={onOpenPoster}
          onOpenBackground={onOpenBackground}
        />
      </tbody>
    </table>
  )

  return { onToggle, onUpdate, onOpenPoster, onOpenBackground, view }
}

describe('MovieRow', () => {
  it('renders id link, non-image poster/background indicators, and selection toggle', async () => {
    const rowMovie = movie()
    const { onToggle, view } = renderRow({
      rowMovie,
      colOrder: ['title', 'id', 'poster', 'background'],
      visibleCols: new Set<ColumnId>(['id', 'poster', 'background']),
      downloadImages: false,
    })

    const idLink = screen.getByRole('link', { name: 'm1' })
    expect(idLink).toHaveAttribute('href', 'https://app.plex.tv/m1')
    expect(screen.getAllByText('✓')).toHaveLength(2)

    await userEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('m1')
    view.unmount()
  })

  it('renders loading placeholders for uncached images and fallback background dash', () => {
    const { view } = renderRow({
      rowMovie: movie({ art: null }),
      colOrder: ['title', 'poster', 'background'],
      visibleCols: new Set<ColumnId>(['poster', 'background']),
      downloadImages: true,
      posterReady: new Set<string>(),
      backgroundReady: new Set<string>(),
    })

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryAllByAltText('')).toHaveLength(0)
    view.unmount()
  })

  it('opens image modals and maps editable saves to update patches', async () => {
    const rowMovie = movie()
    const { onUpdate, onOpenPoster, onOpenBackground, view } = renderRow({
      rowMovie,
      colOrder: ['title', 'year', 'genres', 'poster', 'background'],
      visibleCols: new Set<ColumnId>(['year', 'genres', 'poster', 'background']),
      downloadImages: true,
      posterReady: new Set(['m1']),
      backgroundReady: new Set(['m1']),
    })

    await userEvent.click(screen.getByRole('button', { name: 'save-number' }))
    await userEvent.click(screen.getByRole('button', { name: 'save-tags' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('m1', { year: 1999 }))
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('m1', { genres: 'Action, NewTag' }))

    const images = screen.getAllByAltText('')
    await userEvent.click(images[0])
    await userEvent.click(images[1])

    expect(onOpenPoster).toHaveBeenCalledWith('m1')
    expect(onOpenBackground).toHaveBeenCalledWith('m1')
    view.unmount()
  })

  it('renders a broad column set for metadata and media details', () => {
    const rowMovie = movie({
      content_rating: 'PG-13',
      imdb_rating: 7.1,
      rt_audience_rating: 85.4,
      rt_critics_rating: 82.2,
      tmdb_rating: 7.6,
      summary: 'A long summary',
      video_bitrate: 1800,
      audio_bitrate: 256,
      audio_language: 'English',
      audio_tracks: 'English (AAC)',
      subtitles: 'English',
      edition: 'Director Cut',
      originally_available: '2020-02-02',
      studio: 'StudioX',
      tagline: 'Tagline here',
      country: 'US',
      writers: 'Writer One',
      producers: 'Producer One',
      collections: 'Collection A',
      labels: 'Favorite',
      directors: 'Director One',
    })
    const { view } = renderRow({
      rowMovie,
      colOrder: [
        'title', 'id', 'content_rating', 'imdb_rating', 'rt_audience_rating', 'rt_critics_rating', 'tmdb_rating',
        'summary', 'file_path', 'container', 'video_codec', 'video_resolution', 'video_bitrate', 'width', 'height',
        'aspect_ratio', 'frame_rate', 'audio_codec', 'audio_channels', 'audio_bitrate', 'audio_language', 'audio_tracks',
        'subtitles', 'overall_bitrate', 'size', 'duration', 'updated_at', 'sort_title', 'edition', 'originally_available',
        'studio', 'tagline', 'country', 'writers', 'producers', 'collections', 'labels', 'directors', 'poster', 'background',
      ],
      visibleCols: new Set<ColumnId>([
        'id', 'content_rating', 'imdb_rating', 'rt_audience_rating', 'rt_critics_rating', 'tmdb_rating',
        'summary', 'file_path', 'container', 'video_codec', 'video_resolution', 'video_bitrate', 'width', 'height',
        'aspect_ratio', 'frame_rate', 'audio_codec', 'audio_channels', 'audio_bitrate', 'audio_language', 'audio_tracks',
        'subtitles', 'overall_bitrate', 'size', 'duration', 'updated_at', 'sort_title', 'edition', 'originally_available',
        'studio', 'tagline', 'country', 'writers', 'producers', 'collections', 'labels', 'directors', 'poster', 'background',
      ]),
      downloadImages: false,
    })

    expect(screen.getByText('PG-13')).toBeInTheDocument()
    expect(screen.getByText('/movies/Alpha.mkv')).toBeInTheDocument()
    expect(screen.getByText('StudioX')).toBeInTheDocument()
    expect(screen.getByText('Favorite')).toBeInTheDocument()
    expect(screen.getAllByText('✓')).toHaveLength(2)
    view.unmount()
  })
})
