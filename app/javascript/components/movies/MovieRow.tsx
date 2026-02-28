import React from 'react'
import type { Movie, AllColumnId, ColumnId } from '@/lib/types'
import { formatSize, formatBitrate, formatDate, formatISODate, formatFrameRate, formatChannels, formatDuration } from '@/lib/formatters'

export function MovieRow({
  movie,
  colOrder,
  visibleCols,
  selectedServerId,
  posterReady,
}: {
  movie: Movie
  colOrder: AllColumnId[]
  visibleCols: Set<ColumnId>
  selectedServerId: number | null
  posterReady: Set<string>
}) {
  const col = (id: ColumnId) => visibleCols.has(id)

  return (
    <tr key={`${movie.id}|${movie.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
      {colOrder.filter((id) => id === 'title' || col(id as ColumnId)).map((id) => {
        switch (id) {
          case 'id':             return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">{movie.plex_url ? <a href={movie.plex_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{movie.id}</a> : movie.id}</td>
          case 'title':          return <td key={id} className="px-4 py-2 font-medium whitespace-nowrap">{movie.title}</td>
          case 'original_title': return <td key={id} className="px-4 py-2 text-muted-foreground whitespace-nowrap">{movie.original_title ?? '—'}</td>
          case 'year':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.year ?? '—'}</td>
          case 'content_rating':  return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.content_rating ?? '—'}</td>
          case 'audience_rating': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.audience_rating != null ? movie.audience_rating.toFixed(1) : '—'}</td>
          case 'genres':          return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.genres || '—'}</td>
          case 'directors':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.directors || '—'}</td>
          case 'summary':         return <td key={id} className="px-4 py-2 text-muted-foreground text-xs max-w-xs" title={movie.summary ?? undefined}>{movie.summary ? movie.summary.slice(0, 120) + (movie.summary.length > 120 ? '…' : '') : '—'}</td>
          case 'file_path':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">{movie.file_path ?? <span className="italic">—</span>}</td>
          case 'container':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.container ?? '—'}</td>
          case 'video_codec':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.video_codec ?? '—'}</td>
          case 'video_resolution': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.video_resolution ?? '—'}</td>
          case 'width':            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.width != null ? `${movie.width}px` : '—'}</td>
          case 'height':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.height != null ? `${movie.height}px` : '—'}</td>
          case 'aspect_ratio':     return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.aspect_ratio ?? '—'}</td>
          case 'frame_rate':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatFrameRate(movie.frame_rate)}</td>
          case 'audio_codec':      return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{movie.audio_codec ?? '—'}</td>
          case 'audio_channels': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatChannels(movie.audio_channels)}</td>
          case 'bitrate':        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(movie.bitrate)}</td>
          case 'size':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatSize(movie.size)}</td>
          case 'duration':       return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDuration(movie.duration)}</td>
          case 'updated_at':     return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDate(movie.updated_at)}</td>
          case 'sort_title':           return <td key={id} className="px-4 py-2 text-muted-foreground whitespace-nowrap">{movie.sort_title ?? '—'}</td>
          case 'edition':              return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.edition ?? '—'}</td>
          case 'originally_available': return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatISODate(movie.originally_available)}</td>
          case 'critic_rating':        return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.critic_rating != null ? movie.critic_rating.toFixed(1) : '—'}</td>
          case 'studio':               return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.studio ?? '—'}</td>
          case 'tagline':              return <td key={id} className="px-4 py-2 text-muted-foreground text-xs max-w-xs" title={movie.tagline ?? undefined}>{movie.tagline ? movie.tagline.slice(0, 120) + (movie.tagline.length > 120 ? '…' : '') : '—'}</td>
          case 'country':              return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.country || '—'}</td>
          case 'writers':              return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.writers || '—'}</td>
          case 'producers':            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.producers || '—'}</td>
          case 'collections':          return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.collections || '—'}</td>
          case 'labels':               return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.labels || '—'}</td>
          case 'background':           return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{movie.art ? '✓' : '—'}</td>
          case 'poster':         return (
            <td key={id} className="px-2 py-1">
              {posterReady.has(movie.id) ? (
                <img
                  src={`/api/movies/${movie.id}/poster?server_id=${selectedServerId}`}
                  alt=""
                  className="h-16 w-auto rounded"
                />
              ) : (
                <div className="h-16 w-11 rounded bg-muted animate-pulse" />
              )}
            </td>
          )
        }
      })}
    </tr>
  )
}
