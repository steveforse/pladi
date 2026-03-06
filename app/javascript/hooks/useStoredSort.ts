import { useCallback, useState } from 'react'
import type { SortDir, SortKey } from '@/lib/types'
import { loadStoredJson, saveStoredJson, type StorageScope } from '@/lib/storage'

export function useStoredSort({
  storageKey,
  defaultSortKey,
  validSortKeys,
  storage = 'local',
}: {
  storageKey: string
  defaultSortKey: SortKey
  validSortKeys: Set<SortKey>
  storage?: StorageScope
}) {
  const saved = loadStoredJson(storage, storageKey, { sortKey: defaultSortKey, sortDir: 'asc' as SortDir })
  const [sortKey, setSortKey] = useState<SortKey>(validSortKeys.has(saved.sortKey) ? saved.sortKey : defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDir>(saved.sortDir === 'desc' ? 'desc' : 'asc')

  const handleSort = useCallback((nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDir('asc')
  }, [sortKey])

  const persistSort = useCallback((nextSortKey: SortKey, nextSortDir: SortDir) => {
    saveStoredJson(storage, storageKey, { sortKey: nextSortKey, sortDir: nextSortDir })
  }, [storage, storageKey])

  return {
    sortKey,
    sortDir,
    setSortKey,
    setSortDir,
    handleSort,
    persistSort,
  }
}
