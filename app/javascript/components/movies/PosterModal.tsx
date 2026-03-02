import React from 'react'
import type { Movie } from '@/lib/types'
import { ImageModal } from './ImageModal'

interface PosterModalProps {
  movie: Movie
  selectedServerId: number | null
  hasPrev: boolean
  hasNext: boolean
  position: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function PosterModal({ movie, selectedServerId, ...rest }: PosterModalProps) {
  const imageUrl = `/api/movies/${movie.id}/poster?server_id=${selectedServerId}`
  return <ImageModal movie={movie} imageUrl={imageUrl} {...rest} />
}
