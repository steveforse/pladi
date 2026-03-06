import React from 'react'
import FilterPanel from '@/components/FilterPanel'
import { FilterRow } from '@/components/movies/FilterRow'
import type { ActiveFilter, FilterFieldDef, FilterGroup } from '@/lib/types'
import type { ShowsViewMode } from '@/hooks/useShowsData'

export default function ShowsFiltersPanel({
  viewMode,
  filtersOpen,
  activeFilterCount,
  quickFilters,
  onQuickFilterChange,
  filters,
  onToggleOpen,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAll,
  fieldDefs,
  fieldGroups,
}: {
  viewMode: ShowsViewMode
  filtersOpen: boolean
  activeFilterCount: number
  quickFilters: {
    unwatchedOnly: boolean
    partiallyWatchedOnly: boolean
    fullyWatchedOnly: boolean
    multiOnly: boolean
    unmatchedOnly: boolean
    filenameMismatch: boolean
    noYearInPath: boolean
    yearPathMismatch: boolean
    notInSubfolder: boolean
  }
  onQuickFilterChange: (key: string, value: boolean) => void
  filters: ActiveFilter[]
  onToggleOpen: () => void
  onAddFilter: () => void
  onUpdateFilter: (id: number, updated: ActiveFilter) => void
  onRemoveFilter: (id: number) => void
  onClearAll: () => void
  fieldDefs: FilterFieldDef[]
  fieldGroups: FilterGroup[]
}) {
  return (
    <FilterPanel open={filtersOpen} activeCount={activeFilterCount} onToggle={onToggleOpen}>
          {viewMode === 'shows' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick filters</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Watch Status</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.unwatchedOnly} onChange={(e) => onQuickFilterChange('unwatchedOnly', e.target.checked)} />
                    Unwatched only
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.partiallyWatchedOnly} onChange={(e) => onQuickFilterChange('partiallyWatchedOnly', e.target.checked)} />
                    Partially watched
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.fullyWatchedOnly} onChange={(e) => onQuickFilterChange('fullyWatchedOnly', e.target.checked)} />
                    Fully watched
                  </label>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'episodes' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick filters</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Title</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.unmatchedOnly} onChange={(e) => onQuickFilterChange('unmatchedOnly', e.target.checked)} />
                    Mismatches file path
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.filenameMismatch} onChange={(e) => onQuickFilterChange('filenameMismatch', e.target.checked)} />
                    Mismatches filename
                  </label>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Year</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.noYearInPath} onChange={(e) => onQuickFilterChange('noYearInPath', e.target.checked)} />
                    Missing from file path
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.yearPathMismatch} onChange={(e) => onQuickFilterChange('yearPathMismatch', e.target.checked)} />
                    File path mismatches metadata
                  </label>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">File</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.multiOnly} onChange={(e) => onQuickFilterChange('multiOnly', e.target.checked)} />
                    Multiple files only
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={quickFilters.notInSubfolder} onChange={(e) => onQuickFilterChange('notInSubfolder', e.target.checked)} />
                    Not in show subfolder
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advanced filters</p>
            {filters.map((filter) => (
              <FilterRow
                key={filter.id}
                filter={filter}
                onChange={(updated) => onUpdateFilter(filter.id, updated)}
                onRemove={() => onRemoveFilter(filter.id)}
                fieldDefs={fieldDefs}
                fieldGroups={fieldGroups}
              />
            ))}
            <div className="flex items-center gap-2">
              <button onClick={onAddFilter} className="btn px-3 py-1.5 text-sm">
                + Add Filter
              </button>
              {activeFilterCount > 0 && (
                <button onClick={onClearAll} className="btn px-3 py-1.5 text-sm text-destructive">
                  Clear all
                </button>
              )}
            </div>
          </div>
    </FilterPanel>
  )
}
