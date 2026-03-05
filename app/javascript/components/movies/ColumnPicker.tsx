import React, { useEffect, useRef, useState } from 'react'
import type { ColumnGroup, ColumnId } from '@/lib/types'

export function ColumnPicker({
  groups,
  visible,
  onChange,
  onReset,
  openDirection = 'down',
}: {
  groups: ColumnGroup[]
  visible: Set<ColumnId>
  onChange: (id: ColumnId, checked: boolean) => void
  onReset: () => void
  openDirection?: 'down' | 'up'
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

  function toggleGroup(group: ColumnGroup) {
    const allOn = group.columns.every((col) => visible.has(col.id))
    for (const col of group.columns) {
      onChange(col.id, !allOn)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="border rounded px-3 py-1.5 text-sm gap-1.5 inline-flex items-center bg-background cursor-pointer"
      >
        Toggle Columns
        <span className="text-muted-foreground text-xs">({visible.size}/{totalCols})</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className={`absolute right-0 z-10 bg-card border rounded-md shadow-lg p-2 w-[32rem] ${
          openDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          <div className="grid grid-cols-3 gap-x-2">
            {groups.map((group, i) => {
              const allOn = group.columns.every((col) => visible.has(col.id))
              const someOn = group.columns.some((col) => visible.has(col.id))
              return (
                <div key={group.label} className="col-span-3">
                  {i > 0 && <div className="my-1 border-t col-span-3" />}
                  <label className="flex items-center gap-2 px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={allOn}
                      ref={(el) => { if (el) el.indeterminate = someOn && !allOn }}
                      onChange={() => toggleGroup(group)}
                    />
                    {group.label}
                  </label>
                  <div className="grid grid-cols-3 gap-x-2">
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
                </div>
              )
            })}
          </div>
          <div className="mt-2 pt-2 border-t">
            <button
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
