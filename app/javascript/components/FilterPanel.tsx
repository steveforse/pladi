import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function FilterPanel({
  open,
  activeCount,
  onToggle,
  children,
}: {
  open: boolean
  activeCount: number
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border rounded-md w-fit">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Filters
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold" style={{ backgroundColor: '#E5A00D', color: '#161b1f' }}>
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          {children}
        </div>
      )}
    </div>
  )
}
