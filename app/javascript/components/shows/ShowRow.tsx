import React from 'react'
import { EditableCell } from '@/components/movies/EditableCell'
import { formatBitrate, formatDate, formatDuration, formatFrameRate, formatISODate, formatSize, formatResolution } from '@/lib/formatters'
import { isAlwaysVisibleShowColumn } from '@/lib/mediaColumns'
import type { AllColumnId, ColumnId, MediaPatch, Movie } from '@/lib/types'
import type { ShowsViewMode } from '@/hooks/useShowsData'

export default function ShowRow({
  show,
  viewMode,
  colOrder,
  visibleCols,
  selectedIds,
  downloadImages,
  selectedServerId,
  onToggleRow,
  onUpdateShow,
  onOpenPoster,
  onOpenBackground,
}: {
  show: Movie
  viewMode: ShowsViewMode
  colOrder: AllColumnId[]
  visibleCols: Set<ColumnId>
  selectedIds: Set<string>
  downloadImages: boolean
  selectedServerId: number | null
  onToggleRow: (id: string) => void
  onUpdateShow: (id: string, patch: MediaPatch) => Promise<void>
  onOpenPoster: (id: string) => void
  onOpenBackground: (id: string) => void
}) {
  const activeColumns = colOrder.filter((id) => isAlwaysVisibleShowColumn(viewMode, id) || visibleCols.has(id as ColumnId))

  return (
    <tr key={`${show.id}|${show.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
      <td className="px-2 py-1 w-8">
        <input type="checkbox" checked={selectedIds.has(show.id)} onChange={() => onToggleRow(show.id)} />
      </td>
      {activeColumns.map((id) => {
        switch (id) {
          case 'title':
            return (
              <EditableCell
                key={id}
                value={show.title}
                fieldType="text"
                onSave={async (value) => onUpdateShow(show.id, { title: value as string })}
                renderView={() => <span className="font-medium whitespace-nowrap">{show.title}</span>}
                className="px-4 py-2"
              />
            )
          case 'id':
            return (
              <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                {show.plex_url
                  ? <a href={show.plex_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{show.id}</a>
                  : show.id}
              </td>
            )
          case 'original_title':
            return (
              <EditableCell
                key={id}
                value={show.original_title}
                fieldType="text"
                onSave={async (value) => onUpdateShow(show.id, { original_title: (value as string) || null })}
                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.original_title ?? '—'}</span>}
                className="px-4 py-2"
              />
            )
          case 'show_title':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.show_title ?? '—'}</td>
          case 'year':
            return (
              <EditableCell
                key={id}
                value={show.year != null ? String(show.year) : null}
                fieldType="number"
                onSave={async (value) => {
                  const year = (value as string) ? parseInt(value as string, 10) : null
                  await onUpdateShow(show.id, { year: Number.isFinite(year) ? year : null })
                }}
                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.year ?? '—'}</span>}
                className="px-4 py-2"
              />
            )
          case 'season_count':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.season_count ?? '—'}</td>
          case 'episode_count':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.episode_count ?? '—'}</td>
          case 'viewed_episode_count':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.viewed_episode_count ?? '—'}</td>
          case 'sort_title':
            return (
              <EditableCell
                key={id}
                value={show.sort_title}
                fieldType="text"
                onSave={async (value) => onUpdateShow(show.id, { sort_title: (value as string) || null })}
                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.sort_title ?? '—'}</span>}
                className="px-4 py-2"
              />
            )
          case 'originally_available':
            return (
              <EditableCell
                key={id}
                value={show.originally_available}
                fieldType="date"
                onSave={async (value) => onUpdateShow(show.id, { originally_available: (value as string) || null })}
                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{formatISODate(show.originally_available)}</span>}
                className="px-4 py-2"
              />
            )
          case 'updated_at':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDate(show.updated_at)}</td>
          case 'studio':
            return viewMode === 'shows'
              ? (
                  <EditableCell
                    key={id}
                    value={show.studio}
                    fieldType="text"
                    onSave={async (value) => onUpdateShow(show.id, { studio: (value as string) || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.studio ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.studio ?? '—'}</td>
          case 'genres':
            return viewMode === 'shows'
              ? (
                  <EditableCell
                    key={id}
                    value={show.genres ? show.genres.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { genres: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.genres ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.genres ?? '—'}</td>
          case 'summary':
            return (
              <EditableCell
                key={id}
                value={show.summary}
                fieldType="text"
                onSave={async (value) => onUpdateShow(show.id, { summary: (value as string) || null })}
                renderView={() => (
                  <span className="text-muted-foreground text-xs" title={show.summary ?? undefined}>
                    {show.summary ? show.summary.slice(0, 160) + (show.summary.length > 160 ? '…' : '') : '—'}
                  </span>
                )}
                className="px-4 py-2"
              />
            )
          case 'content_rating':
            return (
              <EditableCell
                key={id}
                value={show.content_rating}
                fieldType="text"
                onSave={async (value) => onUpdateShow(show.id, { content_rating: (value as string) || null })}
                renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.content_rating ?? '—'}</span>}
                className="px-4 py-2"
              />
            )
          case 'imdb_rating':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.imdb_rating != null ? show.imdb_rating.toFixed(1) : '—'}</td>
          case 'rt_audience_rating':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.rt_audience_rating != null ? show.rt_audience_rating.toFixed(1) : '—'}</td>
          case 'rt_critics_rating':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.rt_critics_rating != null ? show.rt_critics_rating.toFixed(1) : '—'}</td>
          case 'tmdb_rating':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.tmdb_rating != null ? show.tmdb_rating.toFixed(1) : '—'}</td>
          case 'tagline':
            return (
              <EditableCell
                key={id}
                value={show.tagline}
                fieldType="text"
                onSave={async (value) => onUpdateShow(show.id, { tagline: (value as string) || null })}
                renderView={() => (
                  <span className="text-muted-foreground text-xs" title={show.tagline ?? undefined}>
                    {show.tagline ? show.tagline.slice(0, 120) + (show.tagline.length > 120 ? '…' : '') : '—'}
                  </span>
                )}
                className="px-4 py-2"
              />
            )
          case 'collections':
            return viewMode === 'shows'
              ? (
                  <EditableCell
                    key={id}
                    value={show.collections ? show.collections.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { collections: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.collections ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.collections ?? '—'}</td>
          case 'labels':
            return viewMode === 'shows'
              ? (
                  <EditableCell
                    key={id}
                    value={show.labels ? show.labels.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { labels: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.labels ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.labels ?? '—'}</td>
          case 'country':
            return viewMode === 'shows'
              ? (
                  <EditableCell
                    key={id}
                    value={show.country ? show.country.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { country: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.country ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.country ?? '—'}</td>
          case 'directors':
            return viewMode === 'episodes'
              ? (
                  <EditableCell
                    key={id}
                    value={show.directors ? show.directors.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { directors: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.directors ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.directors ?? '—'}</td>
          case 'producers':
            return viewMode === 'shows'
              ? (
                  <EditableCell
                    key={id}
                    value={show.producers ? show.producers.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { producers: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.producers ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.producers ?? '—'}</td>
          case 'writers':
            return viewMode === 'episodes'
              ? (
                  <EditableCell
                    key={id}
                    value={show.writers ? show.writers.split(', ').filter(Boolean) : []}
                    fieldType="tags"
                    onSave={async (value) => onUpdateShow(show.id, { writers: (value as string[]).join(', ') || null })}
                    renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.writers ?? '—'}</span>}
                    className="px-4 py-2"
                  />
                )
              : <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.writers ?? '—'}</td>
          case 'file_path':
            return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">{show.file_path ?? '—'}</td>
          case 'container':
            return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{show.container ?? '—'}</td>
          case 'video_codec':
            return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{show.video_codec ?? '—'}</td>
          case 'video_resolution':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatResolution(show.video_resolution)}</td>
          case 'video_bitrate':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(show.video_bitrate)}</td>
          case 'width':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.width != null ? `${show.width}px` : '—'}</td>
          case 'height':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.height != null ? `${show.height}px` : '—'}</td>
          case 'aspect_ratio':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.aspect_ratio ?? '—'}</td>
          case 'frame_rate':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatFrameRate(show.frame_rate)}</td>
          case 'audio_codec':
            return <td key={id} className="px-4 py-2 text-muted-foreground font-mono text-xs uppercase whitespace-nowrap">{show.audio_codec ?? '—'}</td>
          case 'audio_channels':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.audio_channels ?? '—'}</td>
          case 'audio_bitrate':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(show.audio_bitrate)}</td>
          case 'audio_tracks':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.audio_tracks ?? '—'}</td>
          case 'audio_language':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.audio_language ?? '—'}</td>
          case 'subtitles':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.subtitles ?? '—'}</td>
          case 'overall_bitrate':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatBitrate(show.overall_bitrate)}</td>
          case 'size':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatSize(show.size)}</td>
          case 'duration':
            return <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{formatDuration(show.duration)}</td>
          case 'poster':
            return downloadImages && show.thumb
              ? (
                  <td key={id} className="px-2 py-1">
                    <button
                      onClick={() => onOpenPoster(show.id)}
                      className="cursor-pointer focus:outline-none"
                      aria-label={`Open poster for ${show.title}`}
                    >
                      <img
                        src={`/api/shows/${show.id}/poster?server_id=${selectedServerId}`}
                        alt=""
                        className="h-16 w-auto rounded hover:opacity-80 transition-opacity"
                      />
                    </button>
                  </td>
                )
              : (
                  <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {show.thumb ? '✓' : '—'}
                  </td>
                )
          case 'background':
            return downloadImages && show.art
              ? (
                  <td key={id} className="px-2 py-1">
                    <button
                      onClick={() => onOpenBackground(show.id)}
                      className="cursor-pointer focus:outline-none"
                      aria-label={`Open background for ${show.title}`}
                    >
                      <img
                        src={`/api/shows/${show.id}/background?server_id=${selectedServerId}`}
                        alt=""
                        className="h-10 w-auto rounded hover:opacity-80 transition-opacity"
                      />
                    </button>
                  </td>
                )
              : (
                  <td key={id} className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {show.art ? '✓' : '—'}
                  </td>
                )
        }
      })}
    </tr>
  )
}
