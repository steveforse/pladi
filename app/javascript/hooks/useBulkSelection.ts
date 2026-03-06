import { useMemo, useState } from 'react'

type WithId = { id: string }

export function useBulkSelection<T extends WithId>({
  pageItems,
  visibleItems,
}: {
  pageItems: T[]
  visibleItems?: T[]
}) {
  const [rawSelectedIds, setRawSelectedIds] = useState<Set<string>>(new Set())
  const visibleIds = useMemo(
    () => (visibleItems ? new Set(visibleItems.map((item) => item.id)) : null),
    [visibleItems]
  )
  const selectedIds = useMemo(() => {
    if (!visibleIds) return rawSelectedIds
    const filtered = new Set(Array.from(rawSelectedIds).filter((id) => visibleIds.has(id)))
    return filtered.size === rawSelectedIds.size ? rawSelectedIds : filtered
  }, [rawSelectedIds, visibleIds])

  const allSelected = useMemo(
    () => pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id)),
    [pageItems, selectedIds]
  )
  const someSelected = selectedIds.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setRawSelectedIds(new Set())
      return
    }
    setRawSelectedIds(new Set(pageItems.map((item) => item.id)))
  }

  function toggleRow(id: string) {
    setRawSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setRawSelectedIds(new Set())
  }

  return {
    selectedIds,
    setSelectedIds: setRawSelectedIds,
    allSelected,
    someSelected,
    toggleAll,
    toggleRow,
    clearSelection,
  }
}
