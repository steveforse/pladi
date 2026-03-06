import React, { useEffect, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import type { AllColumnId, SortDir, SortKey } from '@/lib/types'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>
  return <span className="ml-1 text-primary">{dir === 'asc' ? '↑' : '↓'}</span>
}

interface HeaderColumn {
  id: AllColumnId
  label: string
  sortKey?: SortKey
  width?: number
  className?: string
}

export function DraggableSortableHeaderRow({
  columns,
  sortKey,
  sortDir,
  dragOverCol,
  onSort,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onResizeStart,
  leadingCheckbox,
  rowClassName = 'border-b bg-muted/50',
}: {
  columns: HeaderColumn[]
  sortKey: SortKey
  sortDir: SortDir
  dragOverCol: AllColumnId | null
  onSort: (key: SortKey) => void
  onDragStart: (id: AllColumnId) => void
  onDragOver: (e: React.DragEvent, id: AllColumnId) => void
  onDrop: (id: AllColumnId) => void
  onDragEnd: () => void
  onResizeStart: (id: AllColumnId, e: React.MouseEvent, measuredWidth?: number) => void
  leadingCheckbox?: {
    checked: boolean
    indeterminate: boolean
    onChange: () => void
    className?: string
  }
  rowClassName?: string
}) {
  const checkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!checkRef.current || !leadingCheckbox) return
    checkRef.current.indeterminate = leadingCheckbox.indeterminate
  }, [leadingCheckbox])

  return (
    <tr className={rowClassName}>
      {leadingCheckbox && (
        <th className={leadingCheckbox.className ?? 'px-2 py-3 w-8'}>
          <input type="checkbox" ref={checkRef} checked={leadingCheckbox.checked} onChange={leadingCheckbox.onChange} />
        </th>
      )}
      {columns.map((col) => {
        const isOver = dragOverCol === col.id
        return (
          <th
            key={col.id}
            className={`relative px-4 py-3 text-left font-medium whitespace-nowrap ${isOver ? 'bg-primary/10' : 'hover:bg-muted/70'} ${col.className ?? ''}`}
            onDragOver={(e) => onDragOver(e, col.id)}
            onDrop={() => onDrop(col.id)}
            style={col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : undefined}
          >
            <div className="flex items-center gap-1">
              <span
                draggable
                aria-label={`Drag ${col.label} column`}
                onDragStart={() => onDragStart(col.id)}
                onDragEnd={onDragEnd}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0"
              >
                <GripVertical size={14} />
              </span>
              {col.sortKey ? (
                <span className="cursor-pointer select-none" onClick={() => onSort(col.sortKey as SortKey)}>
                  {col.label}
                  <SortIcon active={sortKey === col.sortKey} dir={sortDir} />
                </span>
              ) : (
                <span>{col.label}</span>
              )}
            </div>
            <span
              role="separator"
              aria-label={`Resize ${col.label} column`}
              className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
              onMouseDown={(e) => onResizeStart(col.id, e, e.currentTarget.parentElement?.getBoundingClientRect().width)}
            />
          </th>
        )
      })}
    </tr>
  )
}
