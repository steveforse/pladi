import { useCallback } from 'react'
import type { Movie } from '@/lib/types'
import type { TagField, TagPatch } from '@/lib/types'

type BulkTagValues = Partial<Record<TagField, string[]>>
type BulkMode = 'append' | 'replace'

type RowIdentity = Pick<Movie, 'id' | 'file_path'>

export function useBulkTagEdit<T extends RowIdentity & Record<string, unknown>>({
  rows,
  selectedIds,
  updateItem,
  onComplete,
}: {
  rows: T[]
  selectedIds: Set<string>
  updateItem: (row: RowIdentity, patch: TagPatch) => Promise<void>
  onComplete?: (updatedIds: string[]) => Promise<void> | void
}) {
  const handleBulkSave = useCallback(async (tagValues: BulkTagValues, mode: BulkMode) => {
    const selectedIdList = Array.from(selectedIds)
    const rowMap = new Map(rows.map((row) => [row.id, row]))

    for (const id of selectedIdList) {
      const row = rowMap.get(id)
      if (!row) continue
      const patch: TagPatch = {}
      for (const [field, newTags] of Object.entries(tagValues)) {
        if (mode === 'append') {
          const existing = (row[field as keyof T] as string | null)?.split(', ').filter(Boolean) ?? []
          const merged = [...new Set([...existing, ...newTags])]
          patch[field] = merged.join(', ') || null
        } else {
          patch[field] = newTags.join(', ') || null
        }
      }
      await updateItem({ id: row.id, file_path: row.file_path ?? null }, patch)
    }

    await onComplete?.(selectedIdList)
  }, [rows, selectedIds, updateItem, onComplete])

  return { handleBulkSave }
}
