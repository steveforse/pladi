import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'
import { EditableCell } from '@/components/movies/EditableCell'
import { FilterRow } from '@/components/movies/FilterRow'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'
import { ColumnPicker } from '@/components/movies/ColumnPicker'
import { Paginator } from '@/components/movies/Paginator'
import { usePagination } from '@/hooks/usePagination'
import { matchesFilterWithFields } from '@/lib/filters'
import { SHOW_FILTER_FIELDS, SHOW_FILTER_FIELD_GROUPS } from '@/lib/showFilters'
import { SHOW_COLUMN_GROUPS } from '@/lib/showColumns'
import { useShowsData } from '@/hooks/useShowsData'
import { sortMovies } from '@/lib/sorting'
import type { ActiveFilter, ColumnId, SortDir, SortKey } from '@/lib/types'

const FILTERS_STORAGE_KEY = 'pladi.shows.filters'
const COLUMNS_STORAGE_KEY = 'pladi.shows.columns'
const FILTERS_OPEN_STORAGE_KEY = 'pladi.shows.filters_open'

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'year',
  'season_count',
  'episode_count',
  'viewed_episode_count',
  'studio',
  'genres',
  'summary',
]

export default function ShowsTable({
  onMovies,
  onLogout,
  onSettings,
  onHistory,
}: {
  onMovies: () => void
  onLogout: () => void
  onSettings: () => void
  onHistory: () => void
}) {
  const {
    plexServers,
    selectedServerId,
    sections,
    selectedTitle,
    loading,
    refreshing,
    syncing,
    error,
    handleServerChange,
    handleLibraryChange,
    updateShow,
  } = useShowsData()

  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [unwatchedOnly, setUnwatchedOnly] = useState(false)
  const [partiallyWatchedOnly, setPartiallyWatchedOnly] = useState(false)
  const [noSummaryOnly, setNoSummaryOnly] = useState(false)
  const [missingPosterOnly, setMissingPosterOnly] = useState(false)

  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return localStorage.getItem(FILTERS_OPEN_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (!raw) return new Set(DEFAULT_VISIBLE_COLUMNS)
      const parsed = JSON.parse(raw) as ColumnId[]
      return new Set(parsed)
    } catch {
      return new Set(DEFAULT_VISIBLE_COLUMNS)
    }
  })

  const [filters, setFilters] = useState<ActiveFilter[]>(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const nextId = useRef(filters.length > 0 ? Math.max(...filters.map((f) => f.id)) + 1 : 1)

  const activeFilterCount =
    [unwatchedOnly, partiallyWatchedOnly, noSummaryOnly, missingPosterOnly].filter(Boolean).length +
    filters.length

  function addFilter() {
    setFilters((prev) => [
      ...prev,
      { id: nextId.current++, field: 'title', op: 'includes', value: '' },
    ])
  }

  function updateFilter(id: number, updated: ActiveFilter) {
    setFilters((prev) => prev.map((f) => (f.id === id ? updated : f)))
  }

  function removeFilter(id: number) {
    setFilters((prev) => prev.filter((f) => f.id !== id))
  }

  function clearAllFilters() {
    setFilters([])
    setUnwatchedOnly(false)
    setPartiallyWatchedOnly(false)
    setNoSummaryOnly(false)
    setMissingPosterOnly(false)
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleFiltersOpen() {
    setFiltersOpen((open) => {
      const next = !open
      try {
        localStorage.setItem(FILTERS_OPEN_STORAGE_KEY, String(next))
      } catch {
        // storage unavailable
      }
      return next
    })
  }

  function handleColChange(id: ColumnId, checked: boolean) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function resetColumns() {
    setVisibleCols(new Set(DEFAULT_VISIBLE_COLUMNS))
  }

  const filteredShows = useMemo(() => {
    const shows = selectedTitle === null
      ? sections.flatMap((s) => s.movies)
      : (sections.find((s) => s.title === selectedTitle)?.movies ?? [])

    const quickFiltered = shows.filter((show) => {
      if (unwatchedOnly && (show.viewed_episode_count ?? 0) > 0) return false

      if (partiallyWatchedOnly) {
        const viewed = show.viewed_episode_count ?? 0
        const total = show.episode_count ?? 0
        if (!(viewed > 0 && total > 0 && viewed < total)) return false
      }

      if (noSummaryOnly && (show.summary ?? '').trim() !== '') return false
      if (missingPosterOnly && show.thumb) return false

      return true
    })

    const advancedFiltered = filters.length > 0
      ? quickFiltered.filter((show) => filters.every((f) => matchesFilterWithFields(SHOW_FILTER_FIELDS, show, f)))
      : quickFiltered

    return sortMovies(advancedFiltered, sortKey, sortDir)
  }, [
    sections,
    selectedTitle,
    sortKey,
    sortDir,
    filters,
    unwatchedOnly,
    partiallyWatchedOnly,
    noSummaryOnly,
    missingPosterOnly,
  ])

  const { page, setPage, pageSize, totalPages, handlePageSize } = usePagination(filteredShows.length)
  const pagedShows = pageSize === 0 ? filteredShows : filteredShows.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // storage unavailable
    }
  }, [filters])

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(visibleCols)))
    } catch {
      // storage unavailable
    }
  }, [visibleCols])

  if (loading) {
    return (
      <div className="p-8 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
          <div className="flex items-center gap-3">
            <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
          </div>
          <div className="flex-1" />
          <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
        </div>
        <div className="px-8 py-4 space-y-3">
          <p className="text-destructive text-sm">Failed to load TV shows: {error}</p>
          <button onClick={onSettings} className="underline text-primary text-sm">Open Settings</button>
        </div>
      </div>
    )
  }

  if (plexServers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
          <div className="flex items-center gap-3">
            <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
          </div>
          <div className="flex-1 flex justify-center">
            <button onClick={onMovies} className="btn px-3 py-1.5 text-sm">
              Switch to Movies
            </button>
          </div>
          <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
        </div>
        <div className="px-8 py-6 space-y-2">
          <h2 className="text-xl font-semibold">TV Shows</h2>
          <p className="text-muted-foreground text-sm">
            Add a Plex server in Settings to browse TV libraries.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <button onClick={onMovies} className="btn px-3 py-1.5 text-sm">
              Switch to Movies
            </button>
            {syncing && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border" style={{ backgroundColor: '#E5A00D15', borderColor: '#E5A00D50', color: '#E5A00D' }}>
                <Loader2 size={12} className="animate-spin" />
                Syncing
              </span>
            )}
          </div>
        </div>
        {refreshing && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Updating...
          </span>
        )}
        <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
      </div>

      <div className="px-8 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Server:</label>
            <select
              value={selectedServerId ?? ''}
              onChange={(e) => handleServerChange(Number(e.target.value))}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              {plexServers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Library:</label>
            <select
              value={selectedTitle ?? ''}
              onChange={(e) => handleLibraryChange(e.target.value === '' ? null : e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              {sections.map((s) => (
                <option key={s.title} value={s.title}>{s.title}</option>
              ))}
              <option value="">All libraries</option>
            </select>
          </div>
        </div>

        <div className="border rounded-md w-fit">
          <button
            onClick={toggleFiltersOpen}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {filtersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold" style={{ backgroundColor: '#E5A00D', color: '#161b1f' }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick filters</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Watch Status</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={unwatchedOnly} onChange={(e) => setUnwatchedOnly(e.target.checked)} />
                      Unwatched only
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={partiallyWatchedOnly} onChange={(e) => setPartiallyWatchedOnly(e.target.checked)} />
                      Partially watched
                    </label>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Metadata</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={noSummaryOnly} onChange={(e) => setNoSummaryOnly(e.target.checked)} />
                      Missing summary
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={missingPosterOnly} onChange={(e) => setMissingPosterOnly(e.target.checked)} />
                      Missing poster
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advanced filters</p>
                {filters.map((f) => (
                  <FilterRow
                    key={f.id}
                    filter={f}
                    onChange={(updated) => updateFilter(f.id, updated)}
                    onRemove={() => removeFilter(f.id)}
                    fieldDefs={SHOW_FILTER_FIELDS}
                    fieldGroups={SHOW_FILTER_FIELD_GROUPS}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <button onClick={addFilter} className="btn px-3 py-1.5 text-sm">
                    + Add Filter
                  </button>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="btn px-3 py-1.5 text-sm text-destructive">
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filteredShows.length}
          itemLabel="shows"
          onPage={setPage}
          onPageSize={handlePageSize}
          leftSlot={<ColumnPicker groups={SHOW_COLUMN_GROUPS} visible={visibleCols} onChange={handleColChange} onReset={resetColumns} />}
        />

        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium">
                  <button onClick={() => handleSort('title')} className="hover:underline">
                    Title {sortKey === 'title' ? `(${sortDir})` : ''}
                  </button>
                </th>
                {visibleCols.has('year') && (
                  <th className="px-4 py-2 text-left font-medium">
                    <button onClick={() => handleSort('year')} className="hover:underline">
                      Year {sortKey === 'year' ? `(${sortDir})` : ''}
                    </button>
                  </th>
                )}
                {visibleCols.has('season_count') && (
                  <th className="px-4 py-2 text-left font-medium">
                    <button onClick={() => handleSort('season_count')} className="hover:underline">
                      Seasons {sortKey === 'season_count' ? `(${sortDir})` : ''}
                    </button>
                  </th>
                )}
                {visibleCols.has('episode_count') && (
                  <th className="px-4 py-2 text-left font-medium">
                    <button onClick={() => handleSort('episode_count')} className="hover:underline">
                      Episodes {sortKey === 'episode_count' ? `(${sortDir})` : ''}
                    </button>
                  </th>
                )}
                {visibleCols.has('viewed_episode_count') && (
                  <th className="px-4 py-2 text-left font-medium">
                    <button onClick={() => handleSort('viewed_episode_count')} className="hover:underline">
                      Watched {sortKey === 'viewed_episode_count' ? `(${sortDir})` : ''}
                    </button>
                  </th>
                )}
                {visibleCols.has('studio') && <th className="px-4 py-2 text-left font-medium">Studio</th>}
                {visibleCols.has('genres') && <th className="px-4 py-2 text-left font-medium">Genres</th>}
                {visibleCols.has('summary') && <th className="px-4 py-2 text-left font-medium">Summary</th>}
              </tr>
            </thead>
            <tbody>
              {pagedShows.map((show) => (
                <tr key={`${show.id}|${show.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                  <EditableCell
                    value={show.title}
                    fieldType="text"
                    onSave={async (v) => updateShow(show.id, { title: v as string })}
                    renderView={() => <span className="font-medium whitespace-nowrap">{show.title}</span>}
                    className="px-4 py-2"
                  />
                  {visibleCols.has('year') && (
                    <EditableCell
                      value={show.year != null ? String(show.year) : null}
                      fieldType="number"
                      onSave={async (v) => {
                        const year = (v as string) ? parseInt(v as string, 10) : null
                        await updateShow(show.id, { year: Number.isFinite(year) ? year : null })
                      }}
                      renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.year ?? '—'}</span>}
                      className="px-4 py-2"
                    />
                  )}
                  {visibleCols.has('season_count') && <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.season_count ?? '—'}</td>}
                  {visibleCols.has('episode_count') && <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.episode_count ?? '—'}</td>}
                  {visibleCols.has('viewed_episode_count') && <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.viewed_episode_count ?? '—'}</td>}
                  {visibleCols.has('studio') && (
                    <EditableCell
                      value={show.studio}
                      fieldType="text"
                      onSave={async (v) => updateShow(show.id, { studio: (v as string) || null })}
                      renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.studio ?? '—'}</span>}
                      className="px-4 py-2"
                    />
                  )}
                  {visibleCols.has('genres') && (
                    <EditableCell
                      value={show.genres ? show.genres.split(', ').filter(Boolean) : []}
                      fieldType="tags"
                      onSave={async (v) => updateShow(show.id, { genres: (v as string[]).join(', ') || null })}
                      renderView={() => <span className="text-muted-foreground text-xs whitespace-nowrap">{show.genres ?? '—'}</span>}
                      className="px-4 py-2"
                    />
                  )}
                  {visibleCols.has('summary') && (
                    <EditableCell
                      value={show.summary}
                      fieldType="text"
                      onSave={async (v) => updateShow(show.id, { summary: (v as string) || null })}
                      renderView={() => (
                        <span className="text-muted-foreground text-xs">
                          {show.summary ? show.summary.slice(0, 160) + (show.summary.length > 160 ? '…' : '') : '—'}
                        </span>
                      )}
                      className="px-4 py-2"
                    />
                  )}
                </tr>
              ))}
              {pagedShows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground text-sm" colSpan={Math.max(1, visibleCols.size + 1)}>
                    No shows found in this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
