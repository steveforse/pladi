import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BulkEditModal } from '@/components/movies/BulkEditModal'
import type { Movie } from '@/lib/types'

function movie(id: string, title: string): Movie {
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
    plex_url: null,
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

describe('BulkEditModal', () => {
  it('closes on Escape and cancel action', async () => {
    const onClose = vi.fn()

    const view = render(
      <BulkEditModal
        selectedItems={[movie('m1', 'One')]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={onClose}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(2)
    view.unmount()
  })

  it('closes immediately when submit has no tag values', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = render(
      <BulkEditModal
        selectedItems={[movie('m1', 'One'), movie('m2', 'Two')]}
        onSave={onSave}
        onClose={onClose}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Apply to 2 movies' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
    view.unmount()
  })

  it('submits selected tags in append mode', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = render(
      <BulkEditModal
        selectedItems={[movie('m1', 'One'), movie('m2', 'Two')]}
        onSave={onSave}
        onClose={vi.fn()}
      />
    )

    const genresInput = screen.getAllByPlaceholderText('Type and press Enter…')[0]
    await userEvent.type(genresInput, 'Drama{enter}')
    await userEvent.type(genresInput, 'Action,')

    await userEvent.click(screen.getByRole('button', { name: 'Apply to 2 movies' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ genres: ['Drama', 'Action'] }, 'append')
    })
    view.unmount()
  })

  it('shows error for failed replace submission', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Bulk update failed'))

    const view = render(
      <BulkEditModal
        selectedItems={[movie('m1', 'One')]}
        onSave={onSave}
        onClose={vi.fn()}
      />
    )

    await userEvent.click(screen.getAllByRole('radio', { name: 'Replace' })[0])
    const genresInput = screen.getAllByPlaceholderText('Type and press Enter…')[0]
    await userEvent.type(genresInput, 'Noir{enter}')

    await userEvent.click(screen.getByRole('button', { name: 'Apply to 1 movie' }))

    expect(await screen.findByText('Bulk update failed')).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({ genres: ['Noir'] }, 'replace')
    view.unmount()
  })
})
