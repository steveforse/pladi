import { useEffect, useMemo, useState } from 'react'

type WithId = { id: string }

export function useBulkSelection<T extends WithId>({
  pageItems,
  visibleItems,
}: {
  pageItems: T[]
  visibleItems?: T[]
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = useMemo(
    () => pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id)),
    [pageItems, selectedIds]
  )
  const someSelected = selectedIds.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(pageItems.map((item) => item.id)))
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  useEffect(() => {
    if (!visibleItems) return
    const visibleIds = new Set(visibleItems.map((item) => item.id))
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [visibleItems])

  return {
    selectedIds,
    setSelectedIds,
    allSelected,
    someSelected,
    toggleAll,
    toggleRow,
    clearSelection,
  }
}
