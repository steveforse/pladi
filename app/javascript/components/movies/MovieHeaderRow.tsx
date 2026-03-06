import React from 'react'
import type { AllColumnId, ColumnId, SortDir, SortKey } from '@/lib/types'
import { DraggableSortableHeaderRow } from '@/components/movies/DraggableSortableHeaderRow'
import { MOVIE_HEADER_COLUMN_META } from '@/lib/mediaColumns'

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
  colWidths = {},
  onResizeStart = () => {},
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
  colWidths?: Partial<Record<AllColumnId, number>>
  onResizeStart?: (id: AllColumnId, e: React.MouseEvent, measuredWidth?: number) => void
}) {
  const columns = colOrder
    .filter((id) => id === 'title' || visibleCols.has(id as ColumnId))
    .map((id) => {
      const meta = MOVIE_HEADER_COLUMN_META.get(id)
      if (!meta) return null
      return {
        id,
        label: meta.label,
        sortKey: meta.sortKey,
        className: id === 'title' ? 'w-56' : undefined,
        width: colWidths[id],
      }
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
