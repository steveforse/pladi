import { useCallback, useMemo, useRef, useState } from 'react'
import type { ActiveFilter, FilterFieldDef } from '@/lib/types'
import { loadStoredJson, saveStoredJson, type StorageScope } from '@/lib/storage'

export function useAdvancedFilters({
  storageKey,
  fieldDefs,
  storage = 'local',
  initialField = 'title',
}: {
  storageKey: string
  fieldDefs: FilterFieldDef[]
  storage?: StorageScope
  initialField?: ActiveFilter['field']
}) {
  const [filters, setFilters] = useState<ActiveFilter[]>(() => loadStoredJson(storage, storageKey, [] as ActiveFilter[]))
  const nextId = useRef(filters.length > 0 ? Math.max(...filters.map((filter) => filter.id)) + 1 : 1)
  const validFieldIds = useMemo(() => new Set(fieldDefs.map((field) => field.id)), [fieldDefs])
  const activeFilters = useMemo(
    () => filters.filter((filter) => validFieldIds.has(filter.field)),
    [filters, validFieldIds]
  )

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      { id: nextId.current++, field: initialField, op: 'includes', value: '' },
    ])
  }, [initialField])

  const updateFilter = useCallback((id: number, updated: ActiveFilter) => {
    setFilters((prev) => prev.map((filter) => (filter.id === id ? updated : filter)))
  }, [])

  const removeFilter = useCallback((id: number) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters([])
  }, [])

  const persistFilters = useCallback((nextFilters: ActiveFilter[]) => {
    saveStoredJson(storage, storageKey, nextFilters)
  }, [storage, storageKey])

  return {
    filters,
    setFilters,
    activeFilters,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    persistFilters,
  }
}
