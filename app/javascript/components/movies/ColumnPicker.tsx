import React, { useEffect, useRef, useState } from 'react'
import type { ColumnGroup, ColumnId } from '@/lib/types'

export function ColumnPicker({
  groups,
  visible,
  onChange,
}: {
  groups: ColumnGroup[]
  visible: Set<ColumnId>
  onChange: (id: ColumnId, checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const totalCols = groups.reduce((sum, g) => sum + g.columns.length, 0)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn px-3 py-1.5 text-sm gap-1.5"
      >
        Toggle Columns
        <span className="text-muted-foreground text-xs">({visible.size}/{totalCols})</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 bg-card border rounded-md shadow-lg p-2 min-w-44">
          {groups.map((group, i) => (
            <div key={group.label}>
              {i > 0 && <div className="my-1 border-t" />}
              <div className="px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </div>
              {group.columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visible.has(col.id)}
                    onChange={(e) => onChange(col.id, e.target.checked)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
