import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'
import { FilterRow } from '@/components/movies/FilterRow'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'
import { Paginator } from '@/components/movies/Paginator'
import { usePagination } from '@/hooks/usePagination'
import { matchesFilterWithFields } from '@/lib/filters'
import { SHOW_FILTER_FIELDS, SHOW_FILTER_FIELD_GROUPS } from '@/lib/showFilters'
import { useShowsData } from '@/hooks/useShowsData'
import { sortMovies } from '@/lib/sorting'
import type { ActiveFilter, SortDir } from '@/lib/types'

const FILTERS_STORAGE_KEY = 'pladi.shows.filters'

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
  } = useShowsData()
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ActiveFilter[]>(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const nextId = useRef(filters.length > 0 ? Math.max(...filters.map((f) => f.id)) + 1 : 1)

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
  }

  const filteredShows = useMemo(() => {
    const shows = selectedTitle === null
      ? sections.flatMap((s) => s.movies)
      : (sections.find((s) => s.title === selectedTitle)?.movies ?? [])
    const normalized = query.trim().toLowerCase()
    const searched = normalized.length === 0
      ? shows
      : shows.filter((show) => {
          const searchable = [show.title, show.summary, show.studio, show.genres].filter(Boolean).join(' ').toLowerCase()
          return searchable.includes(normalized)
        })
    const advancedFiltered = filters.length > 0
      ? searched.filter((show) => filters.every((f) => matchesFilterWithFields(SHOW_FILTER_FIELDS, show, f)))
      : searched
    return sortMovies(advancedFiltered, 'title', sortDir)
  }, [sections, selectedTitle, sortDir, query, filters])
  const { page, setPage, pageSize, totalPages, handlePageSize } = usePagination(filteredShows.length)
  const pagedShows = pageSize === 0 ? filteredShows : filteredShows.slice((page - 1) * pageSize, page * pageSize)
  const activeFilterCount = filters.length

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // storage unavailable
    }
  }, [filters])

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
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Sort:</label>
            <button onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))} className="btn px-3 py-1.5 text-sm">
              Title ({sortDir})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Search:</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, studio, genre..."
              className="border rounded px-3 py-1.5 text-sm bg-background w-56"
            />
          </div>
        </div>

        <div className="border rounded-md p-3 space-y-2 w-fit">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Advanced filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </p>
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

        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filteredShows.length}
          itemLabel="shows"
          onPage={setPage}
          onPageSize={handlePageSize}
        />

        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium">Title</th>
                <th className="px-4 py-2 text-left font-medium">Year</th>
                <th className="px-4 py-2 text-left font-medium">Studio</th>
                <th className="px-4 py-2 text-left font-medium">Genres</th>
                <th className="px-4 py-2 text-left font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {pagedShows.map((show) => (
                <tr key={`${show.id}|${show.file_path ?? ''}`} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{show.title}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.year ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.studio ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{show.genres ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {show.summary ? show.summary.slice(0, 160) + (show.summary.length > 160 ? '…' : '') : '—'}
                  </td>
                </tr>
              ))}
              {pagedShows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground text-sm" colSpan={5}>
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
