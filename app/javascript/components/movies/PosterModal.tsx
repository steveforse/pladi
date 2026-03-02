import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Movie } from '@/lib/types'

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

export function PosterModal({ movie, selectedServerId, hasPrev, hasNext, position, total, onClose, onPrev, onNext }: PosterModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hasPrev, hasNext, onClose, onPrev, onNext])

  const posterUrl = `/api/movies/${movie.id}/poster?server_id=${selectedServerId}`

  const goldBtn = 'transition-colors p-2 disabled:invisible' +
    ' text-[#E5A00D] hover:text-[#f0b429]'

  return createPortal(
    <div
      className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center gap-3"
      onClick={onClose}
    >
      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <button className={goldBtn} onClick={onPrev} disabled={!hasPrev} aria-label="Previous poster">
          <ChevronLeft size={40} />
        </button>

        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <button className={goldBtn} onClick={onClose} aria-label="Close">
              <X size={36} />
            </button>
          </div>
          <p className="text-white font-semibold text-lg drop-shadow select-none text-center">
            {movie.title}{movie.year ? ` (${movie.year})` : ''}
          </p>
          <p className="text-white/40 text-xs select-none text-center">{position} / {total}</p>
          <img
            src={posterUrl}
            alt={movie.title}
            className="max-h-[75vh] max-w-[80vw] rounded-lg shadow-2xl"
          />
        </div>

        <button className={goldBtn} onClick={onNext} disabled={!hasNext} aria-label="Next poster">
          <ChevronRight size={40} />
        </button>
      </div>

      <p className="text-white/50 text-xs select-none">← → to navigate · Esc to close</p>
    </div>,
    document.body
  )
}
