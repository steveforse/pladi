import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FilterFieldDef, FilterFieldId, FilterGroup } from '@/lib/types'
import { FILTER_FIELD_GROUPS, FILTER_FIELDS } from '@/lib/filters'
import { fieldButtonClassName } from '@/components/ui/field'

export function FieldPicker({
  value,
  onChange,
  fieldGroups = FILTER_FIELD_GROUPS,
  fieldDefs = FILTER_FIELDS,
}: {
  value: FilterFieldId
  onChange: (field: FilterFieldId) => void
  fieldGroups?: FilterGroup[]
  fieldDefs?: FilterFieldDef[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = fieldDefs.find((f) => f.id === value)?.label ?? value

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const lowerQuery = query.toLowerCase()
  const filteredGroups = fieldGroups.map((group) => ({
    ...group,
    fields: group.fields.filter((f) => f.label.toLowerCase().includes(lowerQuery)),
  })).filter((group) => group.fields.length > 0)

  function select(id: FilterFieldId) {
    onChange(id)
    setOpen(false)
  }

  function toggleOpen() {
    setOpen((prevOpen) => {
      const nextOpen = !prevOpen
      if (!prevOpen) setQuery('')
      return nextOpen
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className={fieldButtonClassName('min-w-[8rem] justify-between px-2 py-1')}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 text-current/80" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-52 rounded-md border bg-background shadow-lg">
          <div className="p-1 border-b">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fields..."
              className="w-full px-2 py-1 text-sm"
            />
          </div>
          <div className="overflow-y-auto max-h-[32rem]">
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </div>
                {group.fields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => select(f.id)}
                    className={`w-full text-left px-4 py-1 text-sm hover:bg-accent hover:text-accent-foreground ${
                      f.id === value ? 'text-[var(--color-primary)]' : ''
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No fields found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
