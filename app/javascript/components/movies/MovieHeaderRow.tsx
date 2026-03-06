import React, { useEffect, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import type { AllColumnId, ColumnId, SortKey, SortDir } from '@/lib/types'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>
  return <span className="ml-1 text-primary">{dir === 'asc' ? '↑' : '↓'}</span>
}

function DragHandle({
  colId,
  onDragStart,
  onDragEnd,
}: {
  colId: AllColumnId
  onDragStart: (id: AllColumnId) => void
  onDragEnd: () => void
}) {
  return (
    <span
      draggable
      onDragStart={() => onDragStart(colId)}
      onDragEnd={onDragEnd}
      onClick={(e) => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0"
    >
      <GripVertical size={14} />
    </span>
  )
}

function Th({
  label, col: sortCol, colId, className, sortKey, sortDir, dragOverCol,
  onSort, onDragStart, onDragOver, onDrop, onDragEnd, width, onResizeStart,
}: {
  label: string
  col: SortKey
  colId: AllColumnId
  className?: string
  sortKey: SortKey
  sortDir: SortDir
  dragOverCol: AllColumnId | null
  onSort: (key: SortKey) => void
  onDragStart: (id: AllColumnId) => void
  onDragOver: (e: React.DragEvent, id: AllColumnId) => void
  onDrop: (id: AllColumnId) => void
  onDragEnd: () => void
  width?: number
  onResizeStart: (id: AllColumnId, e: React.MouseEvent, measuredWidth?: number) => void
}) {
  const isOver = dragOverCol === colId
  return (
    <th
      className={`relative px-4 py-3 text-left font-medium whitespace-nowrap ${isOver ? 'bg-primary/10' : 'hover:bg-muted/70'} ${className ?? ''}`}
      onDragOver={(e) => onDragOver(e, colId)}
      onDrop={() => onDrop(colId)}
      style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
    >
      <div className="flex items-center gap-1">
        <DragHandle colId={colId} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        <span className="cursor-pointer select-none" onClick={() => onSort(sortCol)}>
          {label}<SortIcon active={sortKey === sortCol} dir={sortDir} />
        </span>
      </div>
      <span
        role="separator"
        aria-label={`Resize ${label} column`}
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
        onMouseDown={(e) => onResizeStart(colId, e, e.currentTarget.parentElement?.getBoundingClientRect().width)}
      />
    </th>
  )
}

function ThPlain({
  label, colId, dragOverCol,
  onDragStart, onDragOver, onDrop, onDragEnd, width, onResizeStart,
}: {
  label?: string
  colId: AllColumnId
  dragOverCol: AllColumnId | null
  onDragStart: (id: AllColumnId) => void
  onDragOver: (e: React.DragEvent, id: AllColumnId) => void
  onDrop: (id: AllColumnId) => void
  onDragEnd: () => void
  width?: number
  onResizeStart: (id: AllColumnId, e: React.MouseEvent, measuredWidth?: number) => void
}) {
  const isOver = dragOverCol === colId
  return (
    <th
      className={`relative px-4 py-3 text-left font-medium whitespace-nowrap ${isOver ? 'bg-primary/10' : ''}`}
      onDragOver={(e) => onDragOver(e, colId)}
      onDrop={() => onDrop(colId)}
      style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
    >
      <div className="flex items-center gap-1">
        <DragHandle colId={colId} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        {label && <span>{label}</span>}
      </div>
      <span
        role="separator"
        aria-label={`Resize ${label ?? 'column'}`}
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
        onMouseDown={(e) => onResizeStart(colId, e, e.currentTarget.parentElement?.getBoundingClientRect().width)}
      />
    </th>
  )
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
  const shared = { sortKey, sortDir, dragOverCol, onSort, onDragStart, onDragOver, onDrop, onDragEnd, onResizeStart }
  const col = (id: ColumnId) => visibleCols.has(id)
  const checkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkRef.current) {
      checkRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  return (
    <tr className="border-b bg-muted/50">
      <th className="px-2 py-3 w-8">
        <input type="checkbox" ref={checkRef} checked={allSelected} onChange={onToggleAll} />
      </th>
      {colOrder.filter((id) => id === 'title' || col(id as ColumnId)).map((id) => {
        switch (id) {
          case 'id':             return <Th key={id} label="ID"             col="id"             colId={id} width={colWidths[id]} {...shared} />
          case 'title':          return <Th key={id} label="Title"          col="title"          colId={id} className="w-56" width={colWidths[id]} {...shared} />
          case 'original_title': return <Th key={id} label="Original Title" col="original_title" colId={id} width={colWidths[id]} {...shared} />
          case 'year':           return <Th key={id} label="Year"           col="year"           colId={id} width={colWidths[id]} {...shared} />
          case 'content_rating':     return <Th key={id} label="Content Rating"     col="content_rating"     colId={id} width={colWidths[id]} {...shared} />
          case 'imdb_rating':        return <Th key={id} label="IMDb Rating"        col="imdb_rating"        colId={id} width={colWidths[id]} {...shared} />
          case 'rt_audience_rating': return <Th key={id} label="RT Audience Rating" col="rt_audience_rating" colId={id} width={colWidths[id]} {...shared} />
          case 'rt_critics_rating':  return <Th key={id} label="RT Critics Rating"  col="rt_critics_rating"  colId={id} width={colWidths[id]} {...shared} />
          case 'genres':          return <Th key={id} label="Genres"          col="genres"          colId={id} width={colWidths[id]} {...shared} />
          case 'directors':       return <Th key={id} label="Directors"       col="directors"       colId={id} width={colWidths[id]} {...shared} />
          case 'summary':         return <ThPlain key={id} label="Summary"    colId={id} width={colWidths[id]} {...shared} />
          case 'file_path':      return <Th key={id} label="File Path"      col="file_path"      colId={id} width={colWidths[id]} {...shared} />
          case 'container':      return <Th key={id} label="Container"      col="container"      colId={id} width={colWidths[id]} {...shared} />
          case 'video_codec':      return <Th key={id} label="Video Codec"   col="video_codec"      colId={id} width={colWidths[id]} {...shared} />
          case 'video_resolution': return <Th key={id} label="Resolution"    col="video_resolution" colId={id} width={colWidths[id]} {...shared} />
          case 'video_bitrate':    return <Th key={id} label="Video Bitrate" col="video_bitrate"    colId={id} width={colWidths[id]} {...shared} />
          case 'width':            return <Th key={id} label="Width"         col="width"            colId={id} width={colWidths[id]} {...shared} />
          case 'height':           return <Th key={id} label="Height"        col="height"           colId={id} width={colWidths[id]} {...shared} />
          case 'aspect_ratio':     return <Th key={id} label="Aspect Ratio"  col="aspect_ratio"     colId={id} width={colWidths[id]} {...shared} />
          case 'frame_rate':       return <Th key={id} label="Frame Rate"    col="frame_rate"       colId={id} width={colWidths[id]} {...shared} />
          case 'audio_codec':      return <Th key={id} label="Audio Codec"   col="audio_codec"      colId={id} width={colWidths[id]} {...shared} />
          case 'audio_bitrate':   return <Th key={id} label="Audio Bitrate"  col="audio_bitrate"   colId={id} width={colWidths[id]} {...shared} />
          case 'audio_channels':  return <Th key={id} label="Audio Channels" col="audio_channels"  colId={id} width={colWidths[id]} {...shared} />
          case 'audio_language':  return <Th key={id} label="Audio Language" col="audio_language"  colId={id} width={colWidths[id]} {...shared} />
          case 'audio_tracks':    return <Th key={id} label="Audio Tracks"   col="audio_tracks"    colId={id} width={colWidths[id]} {...shared} />
          case 'subtitles':      return <Th key={id} label="Subtitles"    col="subtitles"      colId={id} width={colWidths[id]} {...shared} />
          case 'overall_bitrate': return <Th key={id} label="Overall Bitrate" col="overall_bitrate" colId={id} width={colWidths[id]} {...shared} />
          case 'size':           return <Th key={id} label="Size"         col="size"           colId={id} width={colWidths[id]} {...shared} />
          case 'duration':       return <Th key={id} label="Duration"     col="duration"       colId={id} width={colWidths[id]} {...shared} />
          case 'updated_at':     return <Th key={id} label="Last Updated" col="updated_at"     colId={id} width={colWidths[id]} {...shared} />
          case 'sort_title':           return <Th key={id} label="Sort Title"           col="sort_title"           colId={id} width={colWidths[id]} {...shared} />
          case 'edition':              return <Th key={id} label="Edition"              col="edition"              colId={id} width={colWidths[id]} {...shared} />
          case 'originally_available': return <Th key={id} label="Originally Available" col="originally_available" colId={id} width={colWidths[id]} {...shared} />
          case 'tmdb_rating':          return <Th key={id} label="TMDb Rating"          col="tmdb_rating"          colId={id} width={colWidths[id]} {...shared} />
          case 'studio':               return <Th key={id} label="Studio"               col="studio"               colId={id} width={colWidths[id]} {...shared} />
          case 'tagline':              return <Th key={id} label="Tagline"              col="tagline"              colId={id} width={colWidths[id]} {...shared} />
          case 'country':              return <Th key={id} label="Country"              col="country"              colId={id} width={colWidths[id]} {...shared} />
          case 'writers':              return <Th key={id} label="Writers"              col="writers"              colId={id} width={colWidths[id]} {...shared} />
          case 'producers':            return <Th key={id} label="Producers"            col="producers"            colId={id} width={colWidths[id]} {...shared} />
          case 'collections':          return <Th key={id} label="Collections"          col="collections"          colId={id} width={colWidths[id]} {...shared} />
          case 'labels':               return <Th key={id} label="Labels"               col="labels"               colId={id} width={colWidths[id]} {...shared} />
          case 'background':           return <ThPlain key={id} label="Background"      colId={id} width={colWidths[id]} {...shared} />
          case 'poster':         return <ThPlain key={id} label="Poster"  colId={id} width={colWidths[id]} {...shared} />
        }
      })}
    </tr>
  )
}
