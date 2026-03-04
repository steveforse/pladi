import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImageModal } from '@/components/movies/ImageModal'
import type { Movie } from '@/lib/types'

function movie(): Movie {
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
  }
}

describe('ImageModal', () => {
  it('renders image info and handles button actions', async () => {
    const onClose = vi.fn()
    const onPrev = vi.fn()
    const onNext = vi.fn()

    const view = render(
      <ImageModal
        movie={movie()}
        imageUrl="/image.jpg"
        hasPrev={true}
        hasNext={true}
        position={2}
        total={4}
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
      />
    )

    expect(screen.getByText('Alpha (2020)')).toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    expect(screen.getByAltText('Alpha')).toHaveAttribute('src', '/image.jpg')

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('handles keyboard navigation and backdrop close', () => {
    const onClose = vi.fn()
    const onPrev = vi.fn()
    const onNext = vi.fn()

    const view = render(
      <ImageModal
        movie={movie()}
        imageUrl="/image.jpg"
        hasPrev={false}
        hasNext={true}
        position={1}
        total={2}
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
      />
    )

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onPrev).not.toHaveBeenCalled()
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    view.unmount()
  })
})
