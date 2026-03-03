import React from 'react'
import type { Movie, AllColumnId, ColumnId } from '@/lib/types'
import { formatSize, formatBitrate, formatDate, formatISODate, formatFrameRate, formatChannels, formatDuration, formatResolution } from '@/lib/formatters'
import { EditableCell } from './EditableCell'

function PosterCell({ movie, selectedServerId, posterReady, onOpenPoster }: {
  movie: Movie
  selectedServerId: number | null
  posterReady: Set<string>
  onOpenPoster: (movieId: string) => void
}) {
  if (!posterReady.has(movie.id)) {
    return <td className="px-2 py-1"><div className="h-16 w-11 rounded bg-muted animate-pulse" /></td>
  }

  return (
    <td className="px-2 py-1">
      <button onClick={() => onOpenPoster(movie.id)} className="cursor-pointer focus:outline-none">
        <img
          src={`/api/movies/${movie.id}/poster?server_id=${selectedServerId}`}
          alt=""
          className="h-16 w-auto rounded hover:opacity-80 transition-opacity"
        />
      </button>
    </td>
  )
}

function BackgroundCell({ movie, selectedServerId, backgroundReady, onOpenBackground }: {
  movie: Movie
  selectedServerId: number | null
  backgroundReady: Set<string>
  onOpenBackground: (movieId: string) => void
}) {
  if (!movie.art) {
    return <td className="px-4 py-2 text-muted-foreground text-xs">—</td>
  }
  if (!backgroundReady.has(movie.id)) {
    return <td className="px-2 py-1"><div className="h-10 w-[71px] rounded bg-muted animate-pulse" /></td>
  }

  return (
    <td className="px-2 py-1">
      <button onClick={() => onOpenBackground(movie.id)} className="cursor-pointer focus:outline-none">
        <img
          src={`/api/movies/${movie.id}/background?server_id=${selectedServerId}`}
          alt=""
          className="h-10 w-auto rounded hover:opacity-80 transition-opacity"
        />
      </button>
    </td>
  )
}

export function MovieRow({
  movie,
  colOrder,
  visibleCols,
  selectedServerId,
  downloadImages,
  posterReady,
  backgroundReady,
  onUpdate,
  onOpenPoster,
  onOpenBackground,
}: {
  movie: Movie
  colOrder: AllColumnId[]
  visibleCols: Set<ColumnId>
  selectedServerId: number | null
  downloadImages: boolean
  posterReady: Set<string>
  backgroundReady: Set<string>
  onUpdate: (id: string, patch: Partial<Movie>) => Promise<void>
  onOpenPoster: (movieId: string) => void
  onOpenBackground: (movieId: string) => void
}) {
  const col = (id: ColumnId) => visibleCols.has(id)

  return (
    <tr key={`${movie.id}|${movie.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
      {colOrder.filter((id) => id === 'title' || col(id as ColumnId)).map((id) => {
        switch (id) {
          case 'id':             return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">{movie.plex_url ? <a href={movie.plex_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{movie.id}</a> : movie.id}</td>
          case 'title':          return (
            <EditableCell key={id}
              value={movie.title}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { title: v as string })}
              renderView={() => <span className="font-medium whitespace-nowrap">{movie.title}</span>}
              className="px-4 py-2"
            />
          )
          case 'original_title': return (
            <EditableCell key={id}
              value={movie.original_title}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { original_title: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground whitespace-nowrap">{movie.original_title ?? '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'year':           return (
            <EditableCell key={id}
              value={movie.year != null ? String(movie.year) : null}
              fieldType="number"
              onSave={async (v) => {
                const year = (v as string) ? parseInt(v as string, 10) : null
                onUpdate(movie.id, { year: Number.isFinite(year) ? year : null })
              }}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.year ?? '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'content_rating':  return (
            <EditableCell key={id}
              value={movie.content_rating}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { content_rating: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.content_rating ?? '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'imdb_rating':        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.imdb_rating != null ? movie.imdb_rating.toFixed(1) : '—'}</td>
          case 'rt_audience_rating': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.rt_audience_rating != null ? movie.rt_audience_rating.toFixed(1) : '—'}</td>
          case 'rt_critics_rating':  return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.rt_critics_rating != null ? movie.rt_critics_rating.toFixed(1) : '—'}</td>
          case 'tmdb_rating':        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.tmdb_rating != null ? movie.tmdb_rating.toFixed(1) : '—'}</td>
          case 'genres':          return (
            <EditableCell key={id}
              value={movie.genres ? movie.genres.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { genres: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.genres || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'directors':       return (
            <EditableCell key={id}
              value={movie.directors ? movie.directors.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { directors: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.directors || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'summary':         return (
            <EditableCell key={id}
              value={movie.summary}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { summary: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground text-xs" title={movie.summary ?? undefined}>{movie.summary ? movie.summary.slice(0, 120) + (movie.summary.length > 120 ? '…' : '') : '—'}</span>}
              className="px-4 py-2 max-w-xs"
            />
          )
          case 'file_path':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">{movie.file_path ?? <span className="italic">—</span>}</td>
          case 'container':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.container ?? '—'}</td>
          case 'video_codec':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.video_codec ?? '—'}</td>
          case 'video_resolution': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatResolution(movie.video_resolution)}</td>
          case 'video_bitrate':    return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(movie.video_bitrate)}</td>
          case 'width':            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.width != null ? `${movie.width}px` : '—'}</td>
          case 'height':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.height != null ? `${movie.height}px` : '—'}</td>
          case 'aspect_ratio':     return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.aspect_ratio ?? '—'}</td>
          case 'frame_rate':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatFrameRate(movie.frame_rate)}</td>
          case 'audio_codec':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.audio_codec ?? '—'}</td>
          case 'audio_channels': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatChannels(movie.audio_channels)}</td>
          case 'audio_bitrate':   return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(movie.audio_bitrate)}</td>
          case 'audio_language':  return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.audio_language ?? '—'}</td>
          case 'audio_tracks':    return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.audio_tracks ?? '—'}</td>
          case 'subtitles':      return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.subtitles ?? '—'}</td>
          case 'overall_bitrate': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(movie.overall_bitrate)}</td>
          case 'size':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatSize(movie.size)}</td>
          case 'duration':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDuration(movie.duration)}</td>
          case 'updated_at':     return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDate(movie.updated_at)}</td>
          case 'sort_title':           return (
            <EditableCell key={id}
              value={movie.sort_title}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { sort_title: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground whitespace-nowrap">{movie.sort_title ?? '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'edition':              return (
            <EditableCell key={id}
              value={movie.edition}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { edition: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.edition ?? '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'originally_available': return (
            <EditableCell key={id}
              value={movie.originally_available}
              fieldType="date"
              onSave={async (v) => onUpdate(movie.id, { originally_available: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{formatISODate(movie.originally_available)}</span>}
              className="px-4 py-2"
            />
          )
          case 'studio':               return (
            <EditableCell key={id}
              value={movie.studio}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { studio: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.studio ?? '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'tagline':              return (
            <EditableCell key={id}
              value={movie.tagline}
              fieldType="text"
              onSave={async (v) => onUpdate(movie.id, { tagline: (v as string) || null })}
              renderView={() => <span className="text-muted-foreground text-xs" title={movie.tagline ?? undefined}>{movie.tagline ? movie.tagline.slice(0, 120) + (movie.tagline.length > 120 ? '…' : '') : '—'}</span>}
              className="px-4 py-2 max-w-xs"
            />
          )
          case 'country':              return (
            <EditableCell key={id}
              value={movie.country ? movie.country.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { country: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.country || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'writers':              return (
            <EditableCell key={id}
              value={movie.writers ? movie.writers.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { writers: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.writers || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'producers':            return (
            <EditableCell key={id}
              value={movie.producers ? movie.producers.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { producers: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.producers || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'collections':          return (
            <EditableCell key={id}
              value={movie.collections ? movie.collections.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { collections: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.collections || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'labels':               return (
            <EditableCell key={id}
              value={movie.labels ? movie.labels.split(', ').filter(Boolean) : []}
              fieldType="tags"
              onSave={async (v) => onUpdate(movie.id, { labels: (v as string[]).join(', ') || null })}
              renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{movie.labels || '—'}</span>}
              className="px-4 py-2"
            />
          )
          case 'background':     return downloadImages
            ? <BackgroundCell key={id} movie={movie} selectedServerId={selectedServerId} backgroundReady={backgroundReady} onOpenBackground={onOpenBackground} />
            : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.art ? '✓' : '—'}</td>
          case 'poster':         return downloadImages
            ? <PosterCell key={id} movie={movie} selectedServerId={selectedServerId} posterReady={posterReady} onOpenPoster={onOpenPoster} />
            : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.thumb ? '✓' : '—'}</td>
        }
      })}
    </tr>
  )
}
