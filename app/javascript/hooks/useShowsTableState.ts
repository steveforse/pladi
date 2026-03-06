import { useEffect, useMemo, useState } from 'react'
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters'
import { useColumnWidths } from '@/hooks/useColumnWidths'
import { usePagination } from '@/hooks/usePagination'
import { usePersistedTableState } from '@/hooks/usePersistedTableState'
import { useStoredSort } from '@/hooks/useStoredSort'
import { matchesFilterWithFields } from '@/lib/filters'
import {
  EPISODE_DEFAULT_COL_ORDER,
  EPISODE_DEFAULT_VISIBLE_COLUMNS,
  SHOW_DEFAULT_COL_ORDER,
  SHOW_DEFAULT_VISIBLE_COLUMNS,
  SHOW_TABLE_COLUMNS,
  SHOW_VALID_COLUMN_IDS,
} from '@/lib/mediaColumns'
import { fileIsInSubfolder, pathContainsYear, pathYearMatchesMetadata, titleMatchesFilename, titleMatchesPath } from '@/lib/pathMatching'
import { loadStoredBoolean, saveStoredString } from '@/lib/storage'
import { EPISODE_FILTER_FIELD_GROUPS, EPISODE_FILTER_FIELDS, SHOW_FILTER_FIELD_GROUPS, SHOW_FILTER_FIELDS } from '@/lib/showFilters'
import { sortMovies } from '@/lib/sorting'
import type { FilterGroup, Movie, SortKey } from '@/lib/types'
import type { ShowsViewMode } from '@/hooks/useShowsData'

const FILTERS_OPEN_STORAGE_KEY = 'pladi.shows.filters_open'
const SORT_STORAGE_KEY = 'pladi.shows.sort'
const VIEW_MODE_STORAGE_KEY = 'pladi.shows.view_mode'
const COLUMNS_STORAGE_KEY = 'pladi.shows.columns'
const FILTERS_STORAGE_KEY = 'pladi.shows.filters'

type QuickFilters = {
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

const SHOW_SORT_KEYS = new Set<SortKey>(SHOW_TABLE_COLUMNS.flatMap((column) => column.sortKey ? [column.sortKey] : []))

function resetQuickFilters(): QuickFilters {
  return {
    unwatchedOnly: false,
    partiallyWatchedOnly: false,
    fullyWatchedOnly: false,
    multiOnly: false,
    unmatchedOnly: false,
    filenameMismatch: false,
    noYearInPath: false,
    yearPathMismatch: false,
    notInSubfolder: false,
  }
}

export function useShowsTableState({
  sections,
  selectedTitle,
  viewMode,
}: {
  sections: Array<{ title: string; movies: Movie[] }>
  selectedTitle: string | null
  viewMode: ShowsViewMode
}) {
  const [quickFilters, setQuickFilters] = useState<QuickFilters>(resetQuickFilters)
  const [filtersOpen, setFiltersOpen] = useState(() => loadStoredBoolean('local', FILTERS_OPEN_STORAGE_KEY))
  const filterFields = useMemo(() => viewMode === 'episodes' ? EPISODE_FILTER_FIELDS : SHOW_FILTER_FIELDS, [viewMode])
  const filterFieldGroups: FilterGroup[] = viewMode === 'episodes' ? EPISODE_FILTER_FIELD_GROUPS : SHOW_FILTER_FIELD_GROUPS
  const {
    activeFilters,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    persistFilters,
  } = useAdvancedFilters({
    storageKey: FILTERS_STORAGE_KEY,
    fieldDefs: filterFields,
  })
  const { sortKey, sortDir, handleSort, persistSort } = useStoredSort({
    storageKey: SORT_STORAGE_KEY,
    defaultSortKey: 'title',
    validSortKeys: SHOW_SORT_KEYS,
  })
  const {
    visibleCols,
    setVisibleCols,
    colOrder,
    setColOrder,
    dragOverCol,
    handleColChange,
    resetColumns: resetPersistedColumns,
    handleColDragStart,
    handleColDragOver,
    handleColDrop,
    handleColDragEnd,
  } = usePersistedTableState({
    storageKey: COLUMNS_STORAGE_KEY,
    defaultVisible: viewMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : SHOW_DEFAULT_VISIBLE_COLUMNS,
    defaultOrder: viewMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER,
    validIds: SHOW_VALID_COLUMN_IDS,
    storage: 'local',
  })
  const { colWidths, startResize, resetWidths } = useColumnWidths(`pladi.shows.column_widths.${viewMode}`)

  useEffect(() => {
    persistFilters(activeFilters)
  }, [activeFilters, persistFilters])

  useEffect(() => {
    persistSort(sortKey, sortDir)
  }, [persistSort, sortDir, sortKey])

  useEffect(() => {
    saveStoredString('local', VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  function setQuickFilter<K extends keyof QuickFilters>(key: K, value: QuickFilters[K]) {
    setQuickFilters((prev) => ({ ...prev, [key]: value }))
  }

  function toggleFiltersOpen() {
    setFiltersOpen((open) => {
      const next = !open
      saveStoredString('local', FILTERS_OPEN_STORAGE_KEY, String(next))
      return next
    })
  }

  function clearAllFilters() {
    setQuickFilters(resetQuickFilters())
    clearFilters()
  }

  function resetColumns() {
    resetPersistedColumns()
    resetWidths()
  }

  function handleViewModeChange(nextMode: ShowsViewMode) {
    if (nextMode === viewMode) return
    saveStoredString('local', VIEW_MODE_STORAGE_KEY, nextMode)
    setQuickFilters(resetQuickFilters())
    clearFilters()
    setVisibleCols(new Set(nextMode === 'episodes' ? EPISODE_DEFAULT_VISIBLE_COLUMNS : SHOW_DEFAULT_VISIBLE_COLUMNS))
    setColOrder([...(nextMode === 'episodes' ? EPISODE_DEFAULT_COL_ORDER : SHOW_DEFAULT_COL_ORDER)])
  }

  const filteredShows = useMemo(() => {
    const rows = selectedTitle === null
      ? sections.flatMap((section) => section.movies)
      : (sections.find((section) => section.title === selectedTitle)?.movies ?? [])

    const watchFiltered = rows.filter((row) => {
      if (viewMode === 'episodes') return true
      if (quickFilters.unwatchedOnly && (row.viewed_episode_count ?? 0) > 0) return false
      if (quickFilters.partiallyWatchedOnly) {
        const viewed = row.viewed_episode_count ?? 0
        const total = row.episode_count ?? 0
        if (!(viewed > 0 && total > 0 && viewed < total)) return false
      }
      if (quickFilters.fullyWatchedOnly) {
        const viewed = row.viewed_episode_count ?? 0
        const total = row.episode_count ?? 0
        if (!(total > 0 && viewed >= total)) return false
      }
      return true
    })

    const pathFiltered = viewMode === 'episodes'
      ? (() => {
          let nextRows = watchFiltered
          if (quickFilters.multiOnly) {
            const counts = new Map<string, number>()
            for (const row of nextRows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1)
            nextRows = nextRows.filter((row) => (counts.get(row.id) ?? 0) > 1)
          }
          if (quickFilters.unmatchedOnly) nextRows = nextRows.filter((row) => !titleMatchesPath(row))
          if (quickFilters.filenameMismatch) nextRows = nextRows.filter((row) => !titleMatchesFilename(row))
          if (quickFilters.noYearInPath) nextRows = nextRows.filter((row) => !pathContainsYear(row))
          if (quickFilters.yearPathMismatch) nextRows = nextRows.filter((row) => !pathYearMatchesMetadata(row))
          if (quickFilters.notInSubfolder) nextRows = nextRows.filter((row) => !fileIsInSubfolder(row))
          return nextRows
        })()
      : watchFiltered

    const advancedFiltered = activeFilters.length > 0
      ? pathFiltered.filter((row) => activeFilters.every((filter) => matchesFilterWithFields(filterFields, row, filter)))
      : pathFiltered

    return sortMovies(advancedFiltered, sortKey, sortDir)
  }, [activeFilters, filterFields, quickFilters, sections, selectedTitle, sortDir, sortKey, viewMode])

  const { page, setPage, pageSize, totalPages, handlePageSize } = usePagination(filteredShows.length)
  const pagedShows = pageSize === 0 ? filteredShows : filteredShows.slice((page - 1) * pageSize, page * pageSize)
  const activeFilterCount = Object.values(quickFilters).filter(Boolean).length + activeFilters.length

  return {
    viewMode,
    handleViewModeChange,
    filtersOpen,
    toggleFiltersOpen,
    quickFilters,
    setQuickFilter,
    filterFields,
    filterFieldGroups,
    filters: activeFilters,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
    activeFilterCount,
    sortKey,
    sortDir,
    handleSort,
    visibleCols,
    colOrder,
    dragOverCol,
    handleColChange,
    resetColumns,
    handleColDragStart,
    handleColDragOver,
    handleColDrop,
    handleColDragEnd,
    colWidths,
    startResize,
    filteredShows,
    pagedShows,
    page,
    setPage,
    pageSize,
    totalPages,
    handlePageSize,
  }
}
