import { useCallback } from 'react'

type BulkTagField = 'genres' | 'directors' | 'writers' | 'producers' | 'collections' | 'labels' | 'country'
type BulkTagValues = Partial<Record<BulkTagField, string[]>>
type BulkMode = 'append' | 'replace'

export function useBulkTagEdit<T extends { id: string } & Record<string, unknown>>({
  rows,
  selectedIds,
  updateItem,
  onComplete,
}: {
  rows: T[]
  selectedIds: Set<string>
  updateItem: (id: string, patch: Record<string, string | null>) => Promise<void>
  onComplete?: (updatedIds: string[]) => Promise<void> | void
}) {
  const handleBulkSave = useCallback(async (tagValues: BulkTagValues, mode: BulkMode) => {
    const selectedIdList = Array.from(selectedIds)
    const rowMap = new Map(rows.map((row) => [row.id, row]))

    for (const id of selectedIdList) {
      const row = rowMap.get(id)
      if (!row) continue
      const patch: Record<string, string | null> = {}
      for (const [field, newTags] of Object.entries(tagValues)) {
        if (mode === 'append') {
          const existing = (row[field as keyof T] as string | null)?.split(', ').filter(Boolean) ?? []
          const merged = [...new Set([...existing, ...newTags])]
          patch[field] = merged.join(', ') || null
        } else {
          patch[field] = newTags.join(', ') || null
        }
      }
      await updateItem(id, patch)
    }

    await onComplete?.(selectedIdList)
  }, [rows, selectedIds, updateItem, onComplete])

  return { handleBulkSave }
}
