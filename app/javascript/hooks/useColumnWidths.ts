import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { AllColumnId } from '@/lib/types'

type ColumnWidths = Partial<Record<AllColumnId, number>>

const MIN_COL_WIDTH = 96
const MAX_COL_WIDTH = 1400

function loadWidths(storageKey: string): ColumnWidths {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    return JSON.parse(raw) as ColumnWidths
  } catch {
    return {}
  }
}

export function useColumnWidths(storageKey: string) {
  const [colWidths, setColWidths] = useState<ColumnWidths>(() => loadWidths(storageKey))

  useEffect(() => {
    setColWidths(loadWidths(storageKey))
  }, [storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(colWidths))
    } catch {
      // storage unavailable
    }
  }, [storageKey, colWidths])

  function startResize(id: AllColumnId, e: ReactMouseEvent, measuredWidth?: number) {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startWidth = colWidths[id] ?? measuredWidth ?? 180

    function onMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX
      const next = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, Math.round(startWidth + delta)))
      setColWidths((prev) => ({ ...prev, [id]: next }))
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function resetWidths() {
    setColWidths({})
  }

  return { colWidths, startResize, resetWidths }
}
