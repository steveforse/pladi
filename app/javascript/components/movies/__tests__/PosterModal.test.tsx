import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PosterModal } from '@/components/movies/PosterModal'
import type { Movie } from '@/lib/types'

vi.mock('@/components/movies/ImageModal', () => ({
  ImageModal: ({ imageUrl, position, total }: { imageUrl: string; position: number; total: number }) => (
    <div>
      <span>image-url:{imageUrl}</span>
      <span>pos:{position}</span>
      <span>total:{total}</span>
    </div>
  ),
}))

function movie(): Movie {
  return {
    id: 'm1',
    title: 'Alpha',
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
  }
}

describe('PosterModal', () => {
  it('builds poster URL from movie id and server id', () => {
    const view = render(
      <PosterModal
        movie={movie()}
        selectedServerId={7}
        hasPrev={false}
        hasNext={false}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
      />
    )

    expect(screen.getByText('image-url:/api/movies/m1/poster?server_id=7')).toBeInTheDocument()
    expect(screen.getByText('pos:1')).toBeInTheDocument()
    expect(screen.getByText('total:1')).toBeInTheDocument()
    view.unmount()
  })
})
