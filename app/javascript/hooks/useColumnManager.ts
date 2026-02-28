import React, { useEffect, useRef, useState } from 'react'
import type { AllColumnId, ColumnId } from '@/lib/types'
import { ALL_COLUMNS, DEFAULT_COL_ORDER } from '@/lib/columns'

const STORAGE_KEY = 'pladi.columns'

const DEFAULT_VISIBLE = new Set(
  ALL_COLUMNS.map((c) => c.id).filter(
    (id) => !['original_title', 'width', 'height', 'aspect_ratio', 'frame_rate', 'updated_at', 'audience_rating', 'genres', 'directors', 'summary'].includes(id)
  )
)

function loadColumnsFromStorage(): { visibleCols: Set<ColumnId>; colOrder: AllColumnId[] } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        visibleCols: new Set<ColumnId>(parsed.visibleCols),
        colOrder: parsed.colOrder,
      }
    }
  } catch {}
  return { visibleCols: DEFAULT_VISIBLE, colOrder: DEFAULT_COL_ORDER }
}

export function useColumnManager() {
  const saved = loadColumnsFromStorage()
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(saved.visibleCols)
  const [colOrder, setColOrder] = useState<AllColumnId[]>(saved.colOrder)
  const dragColRef = useRef<AllColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<AllColumnId | null>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ visibleCols: [...visibleCols], colOrder }))
    } catch {}
  }, [visibleCols, colOrder])

  function handleColChange(id: ColumnId, checked: boolean) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function col(id: ColumnId) { return visibleCols.has(id) }

  function handleColDragStart(id: AllColumnId) {
    dragColRef.current = id
  }

  function handleColDragOver(e: React.DragEvent, id: AllColumnId) {
    e.preventDefault()
    setDragOverCol(id)
  }

  function handleColDrop(targetId: AllColumnId) {
    const src = dragColRef.current
    if (!src || src === targetId) { setDragOverCol(null); return }
    setColOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(src)
      const to   = next.indexOf(targetId)
      next.splice(from, 1)
      next.splice(to, 0, src)
      return next
    })
    dragColRef.current = null
    setDragOverCol(null)
  }

  function handleColDragEnd() {
    dragColRef.current = null
    setDragOverCol(null)
  }

  return {
    visibleCols, colOrder, dragOverCol,
    handleColChange, col,
    handleColDragStart, handleColDragOver, handleColDrop, handleColDragEnd,
  }
}
