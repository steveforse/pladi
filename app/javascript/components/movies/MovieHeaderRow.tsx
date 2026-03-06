import React from 'react'
import type { AllColumnId, ColumnId, SortDir, SortKey } from '@/lib/types'
import { DraggableSortableHeaderRow } from '@/components/movies/DraggableSortableHeaderRow'

function headerMeta(id: AllColumnId): { label: string; sortKey?: SortKey; className?: string } | null {
  switch (id) {
    case 'id': return { label: 'ID', sortKey: 'id' }
    case 'title': return { label: 'Title', sortKey: 'title', className: 'w-56' }
    case 'original_title': return { label: 'Original Title', sortKey: 'original_title' }
    case 'year': return { label: 'Year', sortKey: 'year' }
    case 'content_rating': return { label: 'Content Rating', sortKey: 'content_rating' }
    case 'imdb_rating': return { label: 'IMDb Rating', sortKey: 'imdb_rating' }
    case 'rt_audience_rating': return { label: 'RT Audience Rating', sortKey: 'rt_audience_rating' }
    case 'rt_critics_rating': return { label: 'RT Critics Rating', sortKey: 'rt_critics_rating' }
    case 'genres': return { label: 'Genres', sortKey: 'genres' }
    case 'directors': return { label: 'Directors', sortKey: 'directors' }
    case 'summary': return { label: 'Summary' }
    case 'file_path': return { label: 'File Path', sortKey: 'file_path' }
    case 'container': return { label: 'Container', sortKey: 'container' }
    case 'video_codec': return { label: 'Video Codec', sortKey: 'video_codec' }
    case 'video_resolution': return { label: 'Resolution', sortKey: 'video_resolution' }
    case 'video_bitrate': return { label: 'Video Bitrate', sortKey: 'video_bitrate' }
    case 'width': return { label: 'Width', sortKey: 'width' }
    case 'height': return { label: 'Height', sortKey: 'height' }
    case 'aspect_ratio': return { label: 'Aspect Ratio', sortKey: 'aspect_ratio' }
    case 'frame_rate': return { label: 'Frame Rate', sortKey: 'frame_rate' }
    case 'audio_codec': return { label: 'Audio Codec', sortKey: 'audio_codec' }
    case 'audio_bitrate': return { label: 'Audio Bitrate', sortKey: 'audio_bitrate' }
    case 'audio_channels': return { label: 'Audio Channels', sortKey: 'audio_channels' }
    case 'audio_language': return { label: 'Audio Language', sortKey: 'audio_language' }
    case 'audio_tracks': return { label: 'Audio Tracks', sortKey: 'audio_tracks' }
    case 'subtitles': return { label: 'Subtitles', sortKey: 'subtitles' }
    case 'overall_bitrate': return { label: 'Overall Bitrate', sortKey: 'overall_bitrate' }
    case 'size': return { label: 'Size', sortKey: 'size' }
    case 'duration': return { label: 'Duration', sortKey: 'duration' }
    case 'updated_at': return { label: 'Last Updated', sortKey: 'updated_at' }
    case 'sort_title': return { label: 'Sort Title', sortKey: 'sort_title' }
    case 'edition': return { label: 'Edition', sortKey: 'edition' }
    case 'originally_available': return { label: 'Originally Available', sortKey: 'originally_available' }
    case 'tmdb_rating': return { label: 'TMDb Rating', sortKey: 'tmdb_rating' }
    case 'studio': return { label: 'Studio', sortKey: 'studio' }
    case 'tagline': return { label: 'Tagline', sortKey: 'tagline' }
    case 'country': return { label: 'Country', sortKey: 'country' }
    case 'writers': return { label: 'Writers', sortKey: 'writers' }
    case 'producers': return { label: 'Producers', sortKey: 'producers' }
    case 'collections': return { label: 'Collections', sortKey: 'collections' }
    case 'labels': return { label: 'Labels', sortKey: 'labels' }
    case 'background': return { label: 'Background' }
    case 'poster': return { label: 'Poster' }
    default: return null
  }
}

export function MovieHeaderRow({
  colOrder,
  visibleCols,
  sortKey,
  sortDir,
  dragOverCol,
  allSelected,
  someSelected,
  onToggleAll,
  onSort,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  colWidths,
  onResizeStart,
}: {
  colOrder: AllColumnId[]
  visibleCols: Set<ColumnId>
  sortKey: SortKey
  sortDir: SortDir
  dragOverCol: AllColumnId | null
  allSelected: boolean
  someSelected: boolean
  onToggleAll: () => void
  onSort: (key: SortKey) => void
  onDragStart: (id: AllColumnId) => void
  onDragOver: (e: React.DragEvent, id: AllColumnId) => void
  onDrop: (id: AllColumnId) => void
  onDragEnd: () => void
  colWidths: Partial<Record<AllColumnId, number>>
  onResizeStart: (id: AllColumnId, e: React.MouseEvent, measuredWidth?: number) => void
}) {
  const columns = colOrder
    .filter((id) => id === 'title' || visibleCols.has(id as ColumnId))
    .map((id) => {
      const meta = headerMeta(id)
      if (!meta) return null
      return { id, ...meta, width: colWidths[id] }
    })
    .filter((col): col is NonNullable<typeof col> => col !== null)

  return (
    <DraggableSortableHeaderRow
      columns={columns}
      sortKey={sortKey}
      sortDir={sortDir}
      dragOverCol={dragOverCol}
      onSort={onSort}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onResizeStart={onResizeStart}
      leadingCheckbox={{ checked: allSelected, indeterminate: someSelected, onChange: onToggleAll }}
      rowClassName="border-b bg-muted/50"
    />
  )
}
