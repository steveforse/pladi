import type { Movie, Section } from '@/lib/types'

export const TAG_FIELDS = ['genres', 'directors', 'writers', 'producers', 'collections', 'labels', 'country'] as const

export function normalizeTagPatch(patch: Record<string, unknown>) {
  const apiPatch: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(patch)) {
    if ((TAG_FIELDS as readonly string[]).includes(key)) {
      apiPatch[key] = typeof val === 'string' && val
        ? val.split(', ').map((t) => t.trim()).filter(Boolean)
        : []
    } else {
      apiPatch[key] = val
    }
  }
  return apiPatch
}

export function resolveInitialServerId(servers: Array<{ id: number }>, storageKey: string): number {
  const savedId = Number(localStorage.getItem(storageKey))
  return (savedId && servers.some((server) => server.id === savedId)) ? savedId : servers[0].id
}

export function resolveInitialLibrary(sections: Section[], storageKey: string): string | null {
  if (sections.length === 0) return null
  const savedLibrary = localStorage.getItem(storageKey)
  return savedLibrary && sections.some((section) => section.title === savedLibrary) ? savedLibrary : sections[0].title
}

export function mergeEnrichedRows({
  previousSections,
  enrichedSections,
  fields,
}: {
  previousSections: Section[]
  enrichedSections: Section[]
  fields: (keyof Movie)[]
}): Section[] {
  const rowKey = (row: Pick<Movie, 'id' | 'file_path'>) => `${row.id}|${row.file_path ?? ''}`
  const previousByRow = new Map<string, Movie>()
  for (const section of previousSections) {
    for (const row of section.items) previousByRow.set(rowKey(row), row)
  }
  return enrichedSections.map((section) => ({
    ...section,
    items: section.items.map((row) => {
      const existing = previousByRow.get(rowKey(row))
      if (!existing) return row
      const changed = fields.some((field) => row[field] !== existing[field])
      return changed ? row : existing
    }),
  }))
}
