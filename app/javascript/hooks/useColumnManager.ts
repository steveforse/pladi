import type { ColumnId } from '@/lib/types'
import { DEFAULT_COL_ORDER } from '@/lib/columns'
import { usePersistedTableState } from '@/hooks/usePersistedTableState'

const STORAGE_KEY = 'pladi.columns'

export const DEFAULT_VISIBLE = new Set<ColumnId>(
  ['id', 'title', 'year', 'view_count', 'duration', 'video_codec', 'audio_codec', 'audio_channels', 'overall_bitrate', 'container', 'file_path', 'size', 'width', 'height']
)

export function useColumnManager() {
  const {
    visibleCols, colOrder, dragOverCol,
    handleColChange, resetColumns,
    handleColDragStart, handleColDragOver, handleColDrop, handleColDragEnd,
  } = usePersistedTableState({
    storageKey: STORAGE_KEY,
    defaultVisible: [...DEFAULT_VISIBLE],
    defaultOrder: DEFAULT_COL_ORDER,
  })

  function col(id: ColumnId) { return visibleCols.has(id) }

  return {
    visibleCols, colOrder, dragOverCol,
    handleColChange, col, resetColumns,
    handleColDragStart, handleColDragOver, handleColDrop, handleColDragEnd,
  }
}
