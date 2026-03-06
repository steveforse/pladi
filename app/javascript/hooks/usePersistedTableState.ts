import React, { useEffect, useRef, useState } from 'react'
import type { AllColumnId, ColumnId } from '@/lib/types'

function loadFromStorage({
  storageKey,
  defaultVisible,
  defaultOrder,
  validIds,
  storage,
}: {
  storageKey: string
  defaultVisible: ColumnId[]
  defaultOrder: AllColumnId[]
  validIds?: Set<ColumnId>
  storage: Storage
}) {
  try {
    const raw = storage.getItem(storageKey)
    if (!raw) {
      return {
        visibleCols: new Set<ColumnId>(defaultVisible),
        colOrder: [...defaultOrder],
      }
    }
    const parsed = JSON.parse(raw) as ColumnId[] | { visibleCols?: ColumnId[]; colOrder?: AllColumnId[] }
    const storedVisible = Array.isArray(parsed) ? parsed : (parsed.visibleCols ?? defaultVisible)
    const normalizedVisible = validIds
      ? storedVisible.filter((id): id is ColumnId => validIds.has(id as ColumnId))
      : storedVisible
    const storedOrder = Array.isArray(parsed) ? [] : (parsed.colOrder ?? [])
    const normalizedOrder = storedOrder.filter((id): id is AllColumnId => defaultOrder.includes(id as AllColumnId))
    const dedupedOrder = Array.from(new Set(normalizedOrder))
    return {
      visibleCols: new Set<ColumnId>(normalizedVisible),
      colOrder: [...dedupedOrder, ...defaultOrder.filter((id) => !dedupedOrder.includes(id))],
    }
  } catch {
    return {
      visibleCols: new Set<ColumnId>(defaultVisible),
      colOrder: [...defaultOrder],
    }
  }
}

export function usePersistedTableState({
  storageKey,
  defaultVisible,
  defaultOrder,
  validIds,
  storage = 'session',
}: {
  storageKey: string
  defaultVisible: ColumnId[]
  defaultOrder: AllColumnId[]
  validIds?: Set<ColumnId>
  storage?: 'session' | 'local'
}) {
  const storageObject = storage === 'local' ? localStorage : sessionStorage
  const saved = loadFromStorage({ storageKey, defaultVisible, defaultOrder, validIds, storage: storageObject })
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(saved.visibleCols)
  const [colOrder, setColOrder] = useState<AllColumnId[]>(saved.colOrder)
  const dragColRef = useRef<AllColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<AllColumnId | null>(null)

  useEffect(() => {
    try {
      storageObject.setItem(storageKey, JSON.stringify({ visibleCols: Array.from(visibleCols), colOrder }))
    } catch {
      // storage unavailable
    }
  }, [storageObject, storageKey, visibleCols, colOrder])

  function handleColChange(id: ColumnId, checked: boolean) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function resetColumns() {
    setVisibleCols(new Set(defaultVisible))
    setColOrder([...defaultOrder])
  }

  function handleColDragStart(id: AllColumnId) {
    dragColRef.current = id
  }

  function handleColDragOver(e: React.DragEvent, id: AllColumnId) {
    e.preventDefault()
    setDragOverCol(id)
  }

  function handleColDrop(targetId: AllColumnId) {
    const src = dragColRef.current
    if (!src || src === targetId) {
      setDragOverCol(null)
      return
    }
    setColOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(src)
      const to = next.indexOf(targetId)
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
    visibleCols,
    setVisibleCols,
    colOrder,
    setColOrder,
    dragOverCol,
    handleColChange,
    resetColumns,
    handleColDragStart,
    handleColDragOver,
    handleColDrop,
    handleColDragEnd,
  }
}
