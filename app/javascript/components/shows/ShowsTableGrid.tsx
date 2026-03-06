import React from 'react'
import { ColumnPicker } from '@/components/movies/ColumnPicker'
import { DraggableSortableHeaderRow } from '@/components/movies/DraggableSortableHeaderRow'
import { Paginator } from '@/components/movies/Paginator'
import ShowRow from '@/components/shows/ShowRow'
import { EPISODE_COLUMN_GROUPS, SHOW_COLUMN_GROUPS } from '@/lib/showColumns'
import { getShowHeaderColumn, isAlwaysVisibleShowColumn } from '@/lib/mediaColumns'
import type { AllColumnId, ColumnId, MediaPatch, Movie, SortDir, SortKey } from '@/lib/types'
import type { ShowsViewMode } from '@/hooks/useShowsData'

export default function ShowsTableGrid({
  viewMode,
  filteredShows,
  pagedShows,
  page,
  totalPages,
  pageSize,
  onPage,
  onPageSize,
  visibleCols,
  colOrder,
  dragOverCol,
  sortKey,
  sortDir,
  colWidths,
  selectedIds,
  allSelected,
  someSelected,
  downloadImages,
  selectedServerId,
  onToggleAll,
  onToggleRow,
  onSort,
  onResetColumns,
  onColumnChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onResizeStart,
  onOpenBulkEdit,
  onClearSelection,
  onUpdateShow,
  onOpenPoster,
  onOpenBackground,
}: {
  viewMode: ShowsViewMode
  filteredShows: Movie[]
  pagedShows: Movie[]
  page: number
  totalPages: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (pageSize: number) => void
  visibleCols: Set<ColumnId>
  colOrder: AllColumnId[]
  dragOverCol: AllColumnId | null
  sortKey: SortKey
  sortDir: SortDir
  colWidths: Partial<Record<AllColumnId, number>>
  selectedIds: Set<string>
  allSelected: boolean
  someSelected: boolean
  downloadImages: boolean
  selectedServerId: number | null
  onToggleAll: () => void
  onToggleRow: (id: string) => void
  onSort: (key: SortKey) => void
  onResetColumns: () => void
  onColumnChange: (id: ColumnId, checked: boolean) => void
  onDragStart: (id: AllColumnId) => void
  onDragOver: (event: React.DragEvent, id: AllColumnId) => void
  onDrop: (id: AllColumnId) => void
  onDragEnd: () => void
  onResizeStart: (id: AllColumnId, event: React.MouseEvent, measuredWidth?: number) => void
  onOpenBulkEdit: () => void
  onClearSelection: () => void
  onUpdateShow: (id: string, patch: MediaPatch) => Promise<void>
  onOpenPoster: (id: string) => void
  onOpenBackground: (id: string) => void
}) {
  const activeColumns = colOrder.filter((id) => isAlwaysVisibleShowColumn(viewMode, id) || visibleCols.has(id as ColumnId))
  const emptyStateColSpan = Math.max(2, activeColumns.length + 1)

  return (
    <>
      <Paginator
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={filteredShows.length}
        itemLabel={viewMode === 'episodes' ? 'episodes' : 'shows'}
        onPage={onPage}
        onPageSize={onPageSize}
        leftSlot={<ColumnPicker groups={viewMode === 'episodes' ? EPISODE_COLUMN_GROUPS : SHOW_COLUMN_GROUPS} visible={visibleCols} onChange={onColumnChange} onReset={onResetColumns} />}
        centerSlot={selectedIds.size > 0 ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenBulkEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border font-medium"
              style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}
            >
              Bulk Edit ({selectedIds.size})
            </button>
            <button onClick={onClearSelection} className="text-xs text-muted-foreground hover:text-foreground">
              Clear selection
            </button>
          </div>
        ) : undefined}
      />

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-8" />
            {activeColumns.map((id) => (
              <col
                key={id}
                style={colWidths[id] ? { width: `${colWidths[id]}px`, minWidth: `${colWidths[id]}px` } : undefined}
              />
            ))}
          </colgroup>
          <thead>
            <DraggableSortableHeaderRow
              columns={activeColumns.flatMap((id) => {
                const column = getShowHeaderColumn(viewMode, id)
                return column ? [{ id, label: column.label, sortKey: column.sortKey, width: colWidths[id] }] : []
              })}
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
              rowClassName="border-b bg-muted/30"
            />
          </thead>
          <tbody className="[&_td]:align-top [&_td]:break-words [&_td]:!whitespace-normal">
            {pagedShows.map((show) => (
              <ShowRow
                key={`${show.id}|${show.file_path ?? ''}`}
                show={show}
                viewMode={viewMode}
                colOrder={colOrder}
                visibleCols={visibleCols}
                selectedIds={selectedIds}
                downloadImages={downloadImages}
                selectedServerId={selectedServerId}
                onToggleRow={onToggleRow}
                onUpdateShow={onUpdateShow}
                onOpenPoster={onOpenPoster}
                onOpenBackground={onOpenBackground}
              />
            ))}
            {pagedShows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground text-sm" colSpan={emptyStateColSpan}>
                  No shows found in this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginator
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={filteredShows.length}
        itemLabel={viewMode === 'episodes' ? 'episodes' : 'shows'}
        onPage={onPage}
        onPageSize={onPageSize}
        leftSlot={<ColumnPicker groups={viewMode === 'episodes' ? EPISODE_COLUMN_GROUPS : SHOW_COLUMN_GROUPS} visible={visibleCols} onChange={onColumnChange} onReset={onResetColumns} openDirection="up" />}
      />
    </>
  )
}
